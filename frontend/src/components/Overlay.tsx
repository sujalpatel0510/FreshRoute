import React, { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  /** When false, only Escape / explicit close buttons dismiss the overlay. */
  closeOnBackdrop?: boolean;
  /** Extra classes for the dialog surface (replaces the old dialog div). */
  dialogClassName?: string;
  ariaLabel?: string;
  children: ReactNode;
}

/**
 * Consistent motion for every overlay in the app:
 * backdrop fade + dialog scale/translate in, exit animation before
 * unmount, Escape-to-close, backdrop click (optional) and focus restore.
 */
export const Overlay: React.FC<OverlayProps> = ({
  open,
  onClose,
  closeOnBackdrop = true,
  dialogClassName = '',
  ariaLabel,
  children,
}) => {
  const [mounted, setMounted] = useState(open);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const requestClose = useCallback(() => {
    setExiting(true);
    window.clearTimeout(timerRef.current);
    const exitMs = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 170;
    timerRef.current = window.setTimeout(() => {
      setExiting(false);
      setMounted(false);
      onClose();
    }, exitMs);
  }, [onClose]);

  // Latest flags for effects that must not re-subscribe on every change.
  // Synced inside effects (never during render).
  const mountedRef = useRef(mounted);
  const exitingRef = useRef(exiting);
  useEffect(() => {
    mountedRef.current = mounted;
  }, [mounted]);
  useEffect(() => {
    exitingRef.current = exiting;
  }, [exiting]);

  // Open / parent-forced close (e.g. after successful submit)
  useEffect(() => {
    if (open) {
      window.clearTimeout(timerRef.current);
      setMounted(true);
      setExiting(false);
      prevFocusRef.current = document.activeElement as HTMLElement | null;
      const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 40);
      return () => window.clearTimeout(focusTimer);
    }
    if (mountedRef.current && !exitingRef.current) {
      requestClose();
    }
    return undefined;
    // Intentionally keyed on `open` only: re-running on onClose identity
    // changes would recapture focus targets mid-lifecycle.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape closes while visible; Tab is trapped inside the dialog so
  // keyboard focus never wanders to the page behind the modal.
  useEffect(() => {
    if (!mounted) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!exitingRef.current) requestClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusables.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && root.contains(active);
      if (e.shiftKey) {
        if (!inside || active === first || active === root) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mounted, requestClose]);

  // Restore focus to the trigger when fully closed
  useEffect(() => {
    return () => {
      window.clearTimeout(timerRef.current);
      prevFocusRef.current?.focus?.();
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      className={`fr-overlay${exiting ? ' is-exiting' : ''}`}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget && !exitingRef.current) {
          requestClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={`fr-dialog ${dialogClassName}`}
      >
        {children}
      </div>
    </div>
  );
};
