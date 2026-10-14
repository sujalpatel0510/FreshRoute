import React, { useEffect, useRef, useState, useCallback } from 'react';

// Detect pointer support and reduced motion
const supportsPrecisePointer = typeof window !== 'undefined' && 'maxPointer' in navigator;
const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isTouchDevice = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent);

// Cursor size constants
const DOT_SIZE = 8;
const RING_SIZE = 32;
const EXPAND_RATIO = 1.5;

export const CustomCursor: React.FC = () => {
  const [cursorStyle, setCursorStyle] = useState<'default' | 'pointer'>('pointer');
  const dotRef = useRef<HTMLElement>(null);
  const ringRef = useRef<HTMLElement>(null);
  const xRef = useRef(0);
  const yRef = useRef(0);
  const targetXRef = useRef(0);
  const targetYRef = useRef(0);

  // Initialize elements
  useEffect(() => {
    if (isTouchDevice || !supportsPrecisePointer) {
      // Hide custom cursor on touch devices
      if (dotRef.current) dotRef.current.style.display = 'none';
      if (ringRef.current) ringRef.current.style.display = 'none';
      return;
    }

    // Create cursor elements if they don't exist
    let dot = document.querySelector('.fresh-cursor-dot');
    let ring = document.querySelector('.fresh-cursor-ring');

    if (!dot) {
      dot = document.createElement('div');
      dot.className = 'fresh-cursor-dot';
      dot.style.cssText = `
        position: fixed;
        width: ${DOT_SIZE}px;
        height: ${DOT_SIZE}px;
        background: var(--primary);
        border: 2px solid var(--surface);
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        transform: translate(-50%, -50%);
        transition: transform var(--transition-fast), width var(--transition-fast), height var(--transition-fast);
        will-change: transform;
      `;
      document.body.appendChild(dot);
    }
    if (!ring) {
      ring = document.createElement('div');
      ring.className = 'fresh-cursor-ring';
      ring.style.cssText = `
        position: fixed;
        width: ${RING_SIZE}px;
        height: ${RING_SIZE}px;
        border: 1.5px solid var(--primary);
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        transform: translate(-50%, -50%);
        transition: transform var(--transition-fast), opacity var(--transition-fast);
        opacity: 0;
        box-shadow: 0 0 0 1px var(--primary);
      `;
      document.body.appendChild(ring);
    }

    dotRef.current = dot as HTMLElement;
    ringRef.current = ring as HTMLElement;

    // Mouse tracking with requestAnimationFrame
    let rafId: number;
    const mouseMove = (e: MouseEvent) => {
      targetXRef.current = e.clientX;
      targetYRef.current = e.clientY;
      rafId = requestAnimationFrame(updatePosition);
    };

    const updatePosition = () => {
      // Smooth interpolation
      xRef.current += (targetXRef.current - xRef.current) * 0.15;
      yRef.current += (targetYRef.current - yRef.current) * 0.15;

      if (dotRef.current && ringRef.current) {
        dotRef.current.style.transform = `translate(${xRef.current}px, ${yRef.current}px)`;
        ringRef.current.style.transform = `translate(${xRef.current}px, ${yRef.current}px)`;
      }
      rafId = requestAnimationFrame(updatePosition);
    };

    document.addEventListener('mousemove', mouseMove);

    return () => {
      document.removeEventListener('mousemove', mouseMove);
      cancelAnimationFrame(rafId);
    };
  }, [isTouchDevice, supportsPrecisePointer]);

  // Button hover state
  useEffect(() => {
    if (isTouchDevice) return;

    const handles = document.querySelectorAll('button, [role="button"], a, input, select, textarea');
    
    const handleMouseEnter = () => {
      setCursorStyle('pointer');
    };

    const handleMouseLeave = () => {
      setCursorStyle('default');
    };

    handles.forEach(el => {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      handles.forEach(el => {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, []);

  // On touch devices, just show normal cursor
  if (isTouchDevice) {
    return null;
  }

  return (
    <div className="fresh-cursor-dot" ref={dotRef} />
    <div className="fresh-cursor-ring" ref={ringRef} />
  );
};