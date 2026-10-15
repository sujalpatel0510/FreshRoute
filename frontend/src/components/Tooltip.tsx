import React, { useEffect, useRef } from "react";

interface TooltipProps {
  children: React.ReactNode;
  text: string;
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({ children, text, delay = 250 }) => {
  const [show, setShow] = React.useState(false);
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

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocusCapture={showTooltip}
      onBlurCapture={hideTooltip}
    >
      {children}
      {show && (
        <span
          role="tooltip"
          className="tip-pop pointer-events-none absolute left-1/2 top-full mt-1.5 z-50 w-max max-w-[220px] rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-medium leading-snug text-secondary-text shadow-md"
        >
          {text}
        </span>
      )}
    </span>
  );
};
