'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { Paper, PaperProps, Box } from '@mui/material';

export interface DraggablePaperProps extends PaperProps {
  handleSelector?: string;
  disabled?: boolean;
  resizable?: boolean;
  minWidth?: number;
  minHeight?: number;
}

/**
 * High-performance, zero-dependency Draggable & Resizable Paper component for MUI Dialogs.
 * Uses GPU-accelerated CSS translate3d transforms on the title bar handle,
 * and allows smooth resizing/expanding via cursor on bottom, right, and corner edges.
 */
export const DraggablePaper = React.forwardRef<HTMLDivElement, DraggablePaperProps>(
  function DraggablePaper(props, ref) {
    const {
      handleSelector = '.MuiDialogTitle-root',
      disabled = false,
      resizable = true,
      minWidth = 440,
      minHeight = 280,
      style,
      sx,
      children,
      ...rest
    } = props;

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

    // Watch for fullscreen / maximized class changes to reset/restore transform & size
    useEffect(() => {
      const paperEl = internalRef.current;
      if (!paperEl) return;

      const updateTransformOnClassChange = () => {
        if (paperEl.classList.contains('MuiDialog-paperFullScreen')) {
          paperEl.style.transform = 'none';
          paperEl.style.width = '100vw';
          paperEl.style.height = '100vh';
          paperEl.style.maxWidth = '100vw';
          paperEl.style.maxHeight = '100vh';
        } else {
          paperEl.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0px)`;
          if (paperEl.dataset.customWidth) {
            paperEl.style.width = `${paperEl.dataset.customWidth}px`;
            paperEl.style.maxWidth = 'none';
          }
          if (paperEl.dataset.customHeight) {
            paperEl.style.height = `${paperEl.dataset.customHeight}px`;
            paperEl.style.maxHeight = 'none';
          }
        }
      };

      const observer = new MutationObserver(updateTransformOnClassChange);
      observer.observe(paperEl, { attributes: true, attributeFilter: ['class'] });
      updateTransformOnClassChange();

      return () => observer.disconnect();
    }, []);

    // Pointer-based title bar drag interaction
    useEffect(() => {
      const paperEl = internalRef.current;
      if (!paperEl || disabled) return;

      const handleEl = paperEl.querySelector<HTMLElement>(handleSelector);
      if (!handleEl) return;

      handleEl.style.cursor = 'grab';
      handleEl.style.userSelect = 'none';

      const onPointerDown = (e: PointerEvent) => {
        if (e.button !== 0) return;
        if (paperEl.classList.contains('MuiDialog-paperFullScreen')) return;

        const target = e.target as HTMLElement | null;
        if (!target) return;

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

    // Handle cursor resizing
    const startResize = (e: React.PointerEvent, direction: 'x' | 'y' | 'xy') => {
      e.preventDefault();
      e.stopPropagation();

      const paperEl = internalRef.current;
      if (!paperEl || paperEl.classList.contains('MuiDialog-paperFullScreen')) return;

      const startPointer = { x: e.clientX, y: e.clientY };
      const rect = paperEl.getBoundingClientRect();
      const startDimensions = { width: rect.width, height: rect.height };
      const startPos = { ...posRef.current };

      document.body.style.userSelect = 'none';

      const onPointerMove = (moveEv: PointerEvent) => {
        const dx = moveEv.clientX - startPointer.x;
        const dy = moveEv.clientY - startPointer.y;

        let curX = startPos.x;
        let curY = startPos.y;

        if (direction === 'x' || direction === 'xy') {
          const nextW = Math.max(minWidth, Math.min(window.innerWidth - 30, startDimensions.width + dx));
          const effectiveDx = nextW - startDimensions.width;
          curX = startPos.x + (effectiveDx / 2);
          paperEl.style.width = `${nextW}px`;
          paperEl.style.maxWidth = 'none';
          paperEl.dataset.customWidth = String(nextW);
        }

        if (direction === 'y' || direction === 'xy') {
          const nextH = Math.max(minHeight, Math.min(window.innerHeight - 30, startDimensions.height + dy));
          const effectiveDy = nextH - startDimensions.height;
          curY = startPos.y + (effectiveDy / 2);
          paperEl.style.height = `${nextH}px`;
          paperEl.style.maxHeight = 'none';
          paperEl.dataset.customHeight = String(nextH);
        }

        posRef.current = { x: curX, y: curY };
        paperEl.style.transform = `translate3d(${curX}px, ${curY}px, 0px)`;
      };

      const onPointerUp = () => {
        document.body.style.userSelect = '';
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerup', onPointerUp, { passive: true });
      window.addEventListener('pointercancel', onPointerUp, { passive: true });
    };

    return (
      <Paper
        ref={setRefs}
        {...rest}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          ...sx,
        }}
        style={{
          ...style,
          transform: `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0px)`,
          transition: isDraggingRef.current ? 'none' : 'box-shadow 0.2s ease',
        }}
      >
        {children}

        {/* ── Expandable Cursor Resize Handles ── */}
        {resizable && (
          <>
            {/* Right edge resize strip */}
            <Box
              onPointerDown={(e) => startResize(e, 'x')}
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 7,
                height: '100%',
                cursor: 'ew-resize',
                zIndex: 20,
                transition: 'background-color 0.15s ease',
                '&:hover': {
                  bgcolor: 'rgba(56, 189, 248, 0.25)',
                },
              }}
            />

            {/* Bottom edge resize strip */}
            <Box
              onPointerDown={(e) => startResize(e, 'y')}
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                height: 7,
                cursor: 'ns-resize',
                zIndex: 20,
                transition: 'background-color 0.15s ease',
                '&:hover': {
                  bgcolor: 'rgba(56, 189, 248, 0.25)',
                },
              }}
            />

            {/* Bottom-Right corner resize grip */}
            <Box
              onPointerDown={(e) => startResize(e, 'xy')}
              sx={{
                position: 'absolute',
                right: 0,
                bottom: 0,
                width: 18,
                height: 18,
                cursor: 'nwse-resize',
                zIndex: 21,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'flex-end',
                p: '3px',
                transition: 'all 0.15s ease',
                '&:hover': {
                  bgcolor: 'rgba(56, 189, 248, 0.35)',
                  '& svg': { opacity: 1, color: '#38bdf8' },
                },
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ opacity: 0.45 }}>
                <circle cx="8" cy="8" r="1.2" />
                <circle cx="8" cy="4" r="1.2" />
                <circle cx="4" cy="8" r="1.2" />
              </svg>
            </Box>
          </>
        )}
      </Paper>
    );
  }
);

export default DraggablePaper;
