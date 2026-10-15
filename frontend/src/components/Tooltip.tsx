import React, { useState, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface TooltipProps {
  children: ReactNode;
  text: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  className?: string;
  wrapperClassName?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  text,
  position = "top",
  delay = 120,
  className = "",
  wrapperClassName = "relative inline-flex items-center",
}) => {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    actualPosition: "top" | "bottom" | "left" | "right";
    arrowOffset: number;
  }>({
    top: 0,
    left: 0,
    actualPosition: position,
    arrowOffset: 0,
  });

  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | undefined>(undefined);

  const updateCoordinates = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    const tooltipEl = tooltipRef.current;
    const tooltipWidth = tooltipEl ? tooltipEl.offsetWidth : 180;
    const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 34;

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceLeft = rect.left;
    const spaceRight = window.innerWidth - rect.right;

    let targetPos = position;

    // Smart auto-flip based on available space
    if (position === "top" && spaceAbove < tooltipHeight + 16 && spaceBelow > spaceAbove) {
      targetPos = "bottom";
    } else if (position === "bottom" && spaceBelow < tooltipHeight + 16 && spaceAbove > spaceBelow) {
      targetPos = "top";
    } else if (position === "left" && spaceLeft < tooltipWidth + 16 && spaceRight > spaceLeft) {
      targetPos = "right";
    } else if (position === "right" && spaceRight < tooltipWidth + 16 && spaceLeft > spaceRight) {
      targetPos = "left";
    }

    let top = 0;
    let left = 0;
    let arrowOffset = 0;

    const gap = 8;

    if (targetPos === "top") {
      top = rect.top - tooltipHeight - gap;
      const idealLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
      const clampedLeft = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, idealLeft));
      left = clampedLeft;
      arrowOffset = rect.left + rect.width / 2 - clampedLeft;
    } else if (targetPos === "bottom") {
      top = rect.bottom + gap;
      const idealLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
      const clampedLeft = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, idealLeft));
      left = clampedLeft;
      arrowOffset = rect.left + rect.width / 2 - clampedLeft;
    } else if (targetPos === "left") {
      left = rect.left - tooltipWidth - gap;
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      arrowOffset = tooltipHeight / 2;
    } else {
      left = rect.right + gap;
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      arrowOffset = tooltipHeight / 2;
    }

    setCoords({
      top: Math.max(8, top),
      left: Math.max(8, left),
      actualPosition: targetPos,
      arrowOffset,
    });
  };

  const showTooltip = () => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setShow(true);
    }, delay);
  };

  const hideTooltip = () => {
    window.clearTimeout(timerRef.current);
    setShow(false);
  };

  useEffect(() => {
    if (show) {
      updateCoordinates();
      let raf = 0;
      const handleScrollOrResize = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(updateCoordinates);
      };
      window.addEventListener("scroll", handleScrollOrResize, { capture: true, passive: true });
      window.addEventListener("resize", handleScrollOrResize, { passive: true });
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("scroll", handleScrollOrResize, true);
        window.removeEventListener("resize", handleScrollOrResize);
      };
    }
  }, [show]);

  useEffect(() => {
    return () => window.clearTimeout(timerRef.current);
  }, []);

  if (!text) return <>{children}</>;

  return (
    <span
      ref={triggerRef}
      className={wrapperClassName}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocusCapture={showTooltip}
      onBlurCapture={hideTooltip}
    >
      {children}
      {show &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
            className={`fixed z-[999999] pointer-events-none w-max max-w-xs px-2.5 py-1.5 rounded-xl text-[11px] font-medium leading-tight bg-neutral-900/95 dark:bg-neutral-800/95 text-neutral-100 shadow-xl border border-white/10 dark:border-white/15 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 select-none ${className}`}
          >
            {text}
            {/* Arrow */}
            <span
              style={
                coords.actualPosition === "top" || coords.actualPosition === "bottom"
                  ? { left: `${coords.arrowOffset}px` }
                  : { top: `${coords.arrowOffset}px` }
              }
              className={`absolute w-0 h-0 pointer-events-none -translate-x-1/2 ${
                coords.actualPosition === "top"
                  ? "top-full border-4 border-transparent border-t-neutral-900/95 dark:border-t-neutral-800/95"
                  : coords.actualPosition === "bottom"
                  ? "bottom-full border-4 border-transparent border-b-neutral-900/95 dark:border-b-neutral-800/95"
                  : coords.actualPosition === "left"
                  ? "left-full -translate-y-1/2 border-4 border-transparent border-l-neutral-900/95 dark:border-l-neutral-800/95"
                  : "right-full -translate-y-1/2 border-4 border-transparent border-r-neutral-900/95 dark:border-r-neutral-800/95"
              }`}
            />
          </div>,
          document.body
        )}
    </span>
  );
};
