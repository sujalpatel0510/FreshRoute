import React, { useEffect, useRef } from "react";

type CursorState = "default" | "link" | "card" | "data" | "text" | "hidden";

const INTERACTIVE_SELECTOR =
  'a, button, [role="button"], [role="link"], input[type="button"], input[type="submit"], summary, select, [role="combobox"], [role="option"], [data-cursor="link"]';
const TEXT_SELECTOR =
  'textarea, [contenteditable="true"], input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="file"]):not([type="color"])';
const DISABLED_SELECTOR =
  'button:disabled, input:disabled, select:disabled, textarea:disabled, [aria-disabled="true"]';
const DATA_SELECTOR = ".recharts-wrapper, [data-cursor=\"data\"]";
const CARD_SELECTOR = "[data-cursor=\"card\"]";
const LABEL_SELECTOR = "[data-cursor-label]";

interface Classification {
  state: CursorState;
  label: string;
  magnetic: HTMLElement | null;
}

function classify(target: EventTarget | null): Classification {
  const el = target instanceof Element ? target : null;
  if (!el) return { state: "default", label: "", magnetic: null };

  const tag = el.tagName;
  if (tag === "BUTTON" || tag === "A" || tag === "SELECT" || tag === "SUMMARY") {
    return { state: "link", label: "", magnetic: null };
  }
  if (tag === "INPUT" || tag === "TEXTAREA") {
    return { state: "text", label: "", magnetic: null };
  }

  const magnetic = el.closest("[data-magnetic]") as HTMLElement | null;

  if (el.closest(DISABLED_SELECTOR)) {
    return { state: "default", label: "Disabled", magnetic: null };
  }
  if (el.closest(TEXT_SELECTOR)) {
    return { state: "text", label: "", magnetic: null };
  }

  const labelHost = el.closest(LABEL_SELECTOR);
  const label = labelHost ? labelHost.getAttribute("data-cursor-label") || "" : "";

  if (el.closest(INTERACTIVE_SELECTOR) || el.closest('[data-cursor="link"]')) {
    return { state: "link", label, magnetic };
  }
  if (el.closest(DATA_SELECTOR)) {
    return { state: "data", label: label || "", magnetic };
  }
  if (labelHost || el.closest(CARD_SELECTOR)) {
    return { state: "card", label, magnetic };
  }
  return { state: "default", label: "", magnetic: null };
}

export const Cursor: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reducedMotion) return;

    const root = rootRef.current;
    const ring = ringRef.current;
    const dot = dotRef.current;
    const label = labelRef.current;
    if (!root || !ring || !dot || !label) return;

    document.documentElement.classList.add("fresh-cursor-on");

    // Dot tracks the pointer exactly (zero lag); the ring and scales use
    // time-based exponential smoothing so feel is identical at 60/120 Hz.
    const RING_TAU = 75;
    const DOT_SCALE_TAU = 55;
    const RING_SCALE_TAU = 85;
    const MAGNETIC_TAU = 90;
    const MAGNETIC_MAX = 5;

    // Per-frame settle thresholds (time-based lerp approaches asymptotically)
    const RING_EPS = 0.4;
    const SCALE_EPS = 0.005;
    const MAG_EPS = 0.06;

    let targetX = -200;
    let targetY = -200;
    let ringX = -200;
    let ringY = -200;
    let dotScale = 1;
    let dotScaleTarget = 1;
    let ringScale = 1;
    let ringScaleTarget = 1;

    let rafId = 0;
    let running = false;
    let visible = false;
    let pressed = false;
    let snappedToPointer = false;
    let lastTime = 0;

    let state: CursorState = "default";
    let currentLabel = "";
    let lastClassified: EventTarget | null = null;

    let magEl: HTMLElement | null = null;
    let magRect: DOMRect | null = null;
    let magReleasing = false;
    let magX = 0;
    let magY = 0;
    let magTargetX = 0;
    let magTargetY = 0;

    const labelSpan = label.firstElementChild as HTMLElement;

    const setState = (next: CursorState, label: string) => {
      if (next === state && label === currentLabel) return;
      state = next;
      currentLabel = label;
      root.classList.toggle("is-link", next === "link");
      root.classList.toggle("is-card", next === "card");
      root.classList.toggle("is-data", next === "data");
      root.classList.toggle("is-text", next === "text");
      root.classList.toggle("is-hidden", next === "hidden");
      root.classList.toggle("has-label", next !== "hidden" && label.length > 0);
      if (label.length > 0) {
        labelSpan.textContent = label;
      }
      dotScaleTarget = next === "link" ? 1.7 : next === "text" ? 0.8 : next === "hidden" ? 0.5 : 1;
      ringScaleTarget =
        next === "link" ? 1.25 : next === "text" ? 0.8 : next === "card" ? 1.12 : next === "data" ? 1.05 : next === "hidden" ? 0.7 : 1;
      wake();
    };

    const adoptMagnetic = (el: HTMLElement) => {
      magEl = el;
      magReleasing = false;
      magX = 0;
      magY = 0;
      magTargetX = 0;
      magTargetY = 0;
      magRect = el.getBoundingClientRect();
      el.classList.remove("fr-magnetic-release");
      el.classList.add("fr-magnetic");
    };

    const releaseMagnetic = () => {
      if (!magEl || magReleasing) return;
      magReleasing = true;
      magTargetX = 0;
      magTargetY = 0;
      magEl.classList.add("fr-magnetic-release");
    };

    const applyMagnetic = (next: HTMLElement | null) => {
      if (next === magEl) {
        // Re-entered the same element while it was easing back
        if (next && magReleasing) adoptMagnetic(next);
        return;
      }
      if (magEl && next) {
        // Jumping directly to another magnetic element: release the old one
        magEl.style.translate = "";
        magEl.classList.remove("fr-magnetic-release");
        adoptMagnetic(next);
        return;
      }
      if (magEl) {
        releaseMagnetic();
        return;
      }
      if (next) adoptMagnetic(next);
    };

    // Layout rects are cached and only invalidated on scroll/resize so
    // mousemove never forces synchronous layout except once per scroll.
    const invalidateRects = () => {
      magRect = null;
    };

    const onMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;

      // First move after mount / window re-entry: snap instead of
      // flying in from the spawn point.
      if (!snappedToPointer) {
        snappedToPointer = true;
        ringX = targetX;
        ringY = targetY;
      }

      if (e.target !== lastClassified) {
        lastClassified = e.target;
        const result = classify(e.target);
        applyMagnetic(result.state === "hidden" ? null : result.magnetic);
        setState(result.state, result.label);
      }

      if (!visible && state !== "hidden") {
        visible = true;
        root.classList.add("is-visible");
      }

      if (magEl && !magReleasing) {
        if (!magRect) magRect = magEl.getBoundingClientRect();
        const cx = magRect.left + magRect.width / 2;
        const cy = magRect.top + magRect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const pull = Math.min(1, dist / (Math.max(magRect.width, magRect.height) || 1));
        magTargetX = (dx / dist) * MAGNETIC_MAX * pull;
        magTargetY = (dy / dist) * MAGNETIC_MAX * pull;
      }

      wake();
    };

    const spawnRipple = (x: number, y: number) => {
      const ripple = document.createElement("span");
      ripple.className = "fr-cursor__ripple";
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
      root.appendChild(ripple);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (state === "hidden" || e.button !== 0) return;
      pressed = true;
      root.classList.add("is-active");
      dotScaleTarget = 0.55;
      ringScaleTarget = 0.85;
      spawnRipple(e.clientX, e.clientY);
      wake();
    };

    const onMouseUp = () => {
      if (!pressed) return;
      pressed = false;
      root.classList.remove("is-active");
      const next = state;
      dotScaleTarget = next === "link" ? 1.7 : next === "text" ? 0.8 : next === "hidden" ? 0.5 : 1;
      ringScaleTarget =
        next === "link" ? 1.25 : next === "text" ? 0.8 : next === "card" ? 1.12 : next === "data" ? 1.05 : next === "hidden" ? 0.7 : 1;
      wake();
    };

    const onPointerLeave = () => {
      visible = false;
      snappedToPointer = false;
      root.classList.remove("is-visible");
      lastClassified = null;
    };

    const onPointerEnter = () => {
      snappedToPointer = false;
      lastClassified = null;
    };

    const settle = () =>
      Math.abs(targetX - ringX) < RING_EPS &&
      Math.abs(targetY - ringY) < RING_EPS &&
      Math.abs(dotScale - dotScaleTarget) < SCALE_EPS &&
      Math.abs(ringScale - ringScaleTarget) < SCALE_EPS &&
      Math.abs(magTargetX - magX) < MAG_EPS &&
      Math.abs(magTargetY - magY) < MAG_EPS;

    const animate = (now: number) => {
      const dt = Math.min(Math.max(now - lastTime, 1), 64);
      lastTime = now;

      const kRing = 1 - Math.exp(-dt / RING_TAU);
      const kDotScale = 1 - Math.exp(-dt / DOT_SCALE_TAU);
      const kRingScale = 1 - Math.exp(-dt / RING_SCALE_TAU);
      const kMag = 1 - Math.exp(-dt / MAGNETIC_TAU);

      // Dot is pixel-exact — no perceptible lag between pointer and dot.
      const dotX = targetX;
      const dotY = targetY;
      ringX += (targetX - ringX) * kRing;
      ringY += (targetY - ringY) * kRing;
      dotScale += (dotScaleTarget - dotScale) * kDotScale;
      ringScale += (ringScaleTarget - ringScale) * kRingScale;

      dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%) scale(${dotScale.toFixed(3)})`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${ringScale.toFixed(3)})`;
      label.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;

      if (magEl) {
        magX += (magTargetX - magX) * kMag;
        magY += (magTargetY - magY) * kMag;
        magEl.style.translate = `${magX.toFixed(2)}px ${magY.toFixed(2)}px`;
        if (magReleasing && Math.abs(magX) < 0.05 && Math.abs(magY) < 0.05) {
          magEl.style.translate = "";
          magEl.classList.remove("fr-magnetic-release");
          magEl = null;
          magRect = null;
          magReleasing = false;
        }
      }

      if (settle()) {
        running = false;
        rafId = 0;
        return;
      }
      rafId = requestAnimationFrame(animate);
    };

    const wake = () => {
      if (running) return;
      running = true;
      lastTime = performance.now();
      rafId = requestAnimationFrame(animate);
    };

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.documentElement.addEventListener("mouseleave", onPointerLeave);
    document.documentElement.addEventListener("mouseenter", onPointerEnter);
    window.addEventListener("scroll", invalidateRects, { capture: true, passive: true });
    window.addEventListener("resize", invalidateRects);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.documentElement.removeEventListener("mouseleave", onPointerLeave);
      document.documentElement.removeEventListener("mouseenter", onPointerEnter);
      window.removeEventListener("scroll", invalidateRects, { capture: true });
      window.removeEventListener("resize", invalidateRects);
      if (rafId) cancelAnimationFrame(rafId);
      if (magEl) {
        magEl.style.translate = "";
        magEl.classList.remove("fr-magnetic-release");
      }
      document.documentElement.classList.remove("fresh-cursor-on");
    };
  }, []);

  return (
    <div ref={rootRef} className="fr-cursor" aria-hidden="true">
      <div ref={ringRef} className="fr-cursor__ring" />
      <div ref={dotRef} className="fr-cursor__dot" />
      <div ref={labelRef} className="fr-cursor__label">
        <span />
      </div>
    </div>
  );
};
