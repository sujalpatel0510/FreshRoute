import React, { useState, useEffect, useRef, type ReactNode } from "react";

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
  delay = 200,
  className = "",
  wrapperClassName = "relative inline-flex items-center",
}) => {
  const [show, setShow] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  const showTooltip = () => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setShow(true), delay);
  };

  const hideTooltip = () => {
    window.clearTimeout(timerRef.current);
    setShow(false);
  };

  useEffect(() => {
    return () => window.clearTimeout(timerRef.current);
  }, []);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-800",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-neutral-900 dark:border-b-neutral-800",
    left: "left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-neutral-900 dark:border-l-neutral-800",
    right: "right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-neutral-900 dark:border-r-neutral-800",
  };

  return (
    <span
      className={wrapperClassName}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocusCapture={showTooltip}
      onBlurCapture={hideTooltip}
    >
      {children}
      {show && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute z-[9999] w-max max-w-xs px-2.5 py-1.5 rounded-lg text-xs font-medium leading-relaxed bg-neutral-900 text-neutral-100 dark:bg-neutral-800 dark:text-neutral-100 shadow-xl border border-neutral-700/60 dark:border-neutral-600/60 animate-in fade-in zoom-in-95 duration-150 select-none ${positionClasses[position]} ${className}`}
        >
          {text}
          <span className={`absolute w-0 h-0 pointer-events-none ${arrowClasses[position]}`} />
        </span>
      )}
    </span>
  );
};
