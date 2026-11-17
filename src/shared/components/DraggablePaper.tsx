'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { Paper, PaperProps } from '@mui/material';

export interface DraggablePaperProps extends PaperProps {
  handleSelector?: string;
  disabled?: boolean;
}

/**
 * High-performance, zero-dependency Draggable Paper component for MUI Dialogs.
 * Uses GPU-accelerated CSS translate3d transforms on the title bar handle,
 * while automatically bypassing interactive buttons (minimize, maximize, close, copy).
 */
export const DraggablePaper = React.forwardRef<HTMLDivElement, DraggablePaperProps>(
  function DraggablePaper(props, ref) {
    const { handleSelector = '.MuiDialogTitle-root', disabled = false, style, sx, children, ...rest } = props;
    const internalRef = useRef<HTMLDivElement | null>(null);
    const posRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const startPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        internalRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [ref]
    );

    // Watch for fullscreen / maximized class changes to reset/restore transform
    useEffect(() => {
      const paperEl = internalRef.current;
      if (!paperEl) return;

      const updateTransformOnClassChange = () => {
        if (paperEl.classList.contains('MuiDialog-paperFullScreen')) {
          paperEl.style.transform = 'none';
        } else {
          paperEl.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0px)`;
        }
      };

      const observer = new MutationObserver(updateTransformOnClassChange);
      observer.observe(paperEl, { attributes: true, attributeFilter: ['class'] });
      updateTransformOnClassChange();

      return () => observer.disconnect();
    }, []);

    // Pointer-based drag interaction
    useEffect(() => {
      const paperEl = internalRef.current;
      if (!paperEl || disabled) return;

      const handleEl = paperEl.querySelector<HTMLElement>(handleSelector);
      if (!handleEl) return;

      handleEl.style.cursor = 'grab';
      handleEl.style.userSelect = 'none';

      const onPointerDown = (e: PointerEvent) => {
        // Only accept primary button (left click or touch/pen)
        if (e.button !== 0) return;

        // Never drag if currently in full screen mode
        if (paperEl.classList.contains('MuiDialog-paperFullScreen')) return;

        const target = e.target as HTMLElement | null;
        if (!target) return;

        // Ignore drag if user clicked an interactive control
        if (
          target.closest('button, input, select, textarea, a, .MuiIconButton-root, .MuiButton-root, [role="button"]')
        ) {
          return;
        }

        isDraggingRef.current = true;
        startPointerRef.current = { x: e.clientX, y: e.clientY };
        startPosRef.current = { ...posRef.current };

        handleEl.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';

        const onPointerMove = (moveEv: PointerEvent) => {
          if (!isDraggingRef.current) return;
          const dx = moveEv.clientX - startPointerRef.current.x;
          const dy = moveEv.clientY - startPointerRef.current.y;

          const newX = startPosRef.current.x + dx;
          const newY = startPosRef.current.y + dy;

          // Clamping to maintain title bar accessibility within window boundaries
          const maxHoriz = Math.max(100, (window.innerWidth / 2) - 80);
          const maxVert = Math.max(80, (window.innerHeight / 2) - 50);

          const clampedX = Math.max(-maxHoriz, Math.min(maxHoriz, newX));
          const clampedY = Math.max(-maxVert, Math.min(maxVert, newY));

          posRef.current = { x: clampedX, y: clampedY };
          paperEl.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0px)`;
        };

        const onPointerUp = () => {
          isDraggingRef.current = false;
          handleEl.style.cursor = 'grab';
          document.body.style.userSelect = '';
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          window.removeEventListener('pointercancel', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove, { passive: true });
        window.addEventListener('pointerup', onPointerUp, { passive: true });
        window.addEventListener('pointercancel', onPointerUp, { passive: true });
      };

      handleEl.addEventListener('pointerdown', onPointerDown);

      return () => {
        handleEl.removeEventListener('pointerdown', onPointerDown);
        handleEl.style.cursor = '';
        handleEl.style.userSelect = '';
      };
    }, [handleSelector, disabled]);

    return (
      <Paper
        ref={setRefs}
        {...rest}
        sx={sx}
        style={{
          ...style,
          transform: `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0px)`,
          transition: isDraggingRef.current ? 'none' : 'box-shadow 0.2s ease',
        }}
      >
        {children}
      </Paper>
    );
  }
);

export default DraggablePaper;
