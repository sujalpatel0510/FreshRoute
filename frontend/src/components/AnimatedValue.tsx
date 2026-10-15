import React, { useRef, useLayoutEffect } from 'react';

interface AnimatedValueProps {
  value: string | number;
  duration?: number;
}

const NUM_PATTERN = /-?[\d][\d,]*(\.\d+)?/;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface Parsed {
  numeric: number;
  prefix: string;
  suffix: string;
  decimals: number;
  locale: string;
}

function parseRaw(raw: string): Parsed | null {
  const match = NUM_PATTERN.exec(raw);
  if (!match || match.index === undefined) return null;
  const numeric = parseFloat(match[0].replace(/,/g, ''));
  if (!Number.isFinite(numeric)) return null;
  const prefix = raw.slice(0, match.index);
  const suffix = raw.slice(match.index + match[0].length);
  const dot = match[0].indexOf('.');
  const decimals = dot >= 0 ? match[0].length - dot - 1 : 0;

  // Detect which grouping the original string used so the animation
  // renders intermediate values in the exact same format.
  const usFormatted = numeric.toLocaleString('en-US', { minimumFractionDigits: decimals });
  const inFormatted = numeric.toLocaleString('en-IN', { minimumFractionDigits: decimals });
  const usMatch = `${prefix}${usFormatted}${suffix}` === raw;
  const inMatch = `${prefix}${inFormatted}${suffix}` === raw;
  const locale = usMatch ? 'en-US' : inMatch ? 'en-IN' : 'en-US';

  return { numeric, prefix, suffix, decimals, locale };
}

const format = (parsed: Parsed, n: number): string =>
  `${parsed.prefix}${n.toLocaleString(parsed.locale, {
    minimumFractionDigits: parsed.decimals,
    maximumFractionDigits: parsed.decimals,
  })}${parsed.suffix}`;

/**
 * Renders a numeric metric with a short count-up animation whenever the
 * underlying value genuinely changes (initial load or new data arrival).
 * Writes frames straight to the DOM node via a ref — zero React
 * re-renders while animating. Unchanged values never re-animate;
 * reduced motion renders instantly.
 */
export const AnimatedValue: React.FC<AnimatedValueProps> = ({ value, duration = 700 }) => {
  const raw = typeof value === 'number' ? String(value) : value;
  const spanRef = useRef<HTMLSpanElement>(null);
  const parsedRef = useRef<Parsed | null>(null);
  const fromRef = useRef(0);
  const appliedRawRef = useRef<string | null>(null);
  const rafRef = useRef(0);

  useLayoutEffect(() => {
    const el = spanRef.current;
    if (!el) return undefined;
    // Already showing this exact value (re-render of unchanged prop)
    if (appliedRawRef.current === raw) return undefined;

    const parsed = parseRaw(raw);
    if (!parsed) {
      el.textContent = raw;
      appliedRawRef.current = raw;
      parsedRef.current = null;
      return undefined;
    }

    const previous = parsedRef.current;

    // Same numeric value in a different format, or StrictMode re-run of an
    // animation that already finalized: apply instantly, no count-up.
    if (previous && previous.numeric === parsed.numeric && appliedRawRef.current !== null) {
      el.textContent = raw;
      appliedRawRef.current = raw;
      parsedRef.current = parsed;
      fromRef.current = parsed.numeric;
      return undefined;
    }
    if (prefersReducedMotion()) {
      el.textContent = raw;
      appliedRawRef.current = raw;
      parsedRef.current = parsed;
      fromRef.current = parsed.numeric;
      return undefined;
    }

    // Animate from the last value actually on screen (mid-flight values
    // stay continuous), or from 0 on first mount.
    const from = previous ? fromRef.current : 0;
    const to = parsed.numeric;
    const start = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    parsedRef.current = parsed;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const current = from + (to - from) * easeOutCubic(t);
      fromRef.current = current;
      if (t >= 1) {
        // Final frame renders the exact raw string (preserves original formatting)
        el.textContent = raw;
        appliedRawRef.current = raw;
        rafRef.current = 0;
        return;
      }
      el.textContent = format(parsed, current);
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [raw, duration]);

  return <span ref={spanRef}>{raw}</span>;
};
