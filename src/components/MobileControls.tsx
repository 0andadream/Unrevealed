"use client";

import { useCallback, useRef } from "react";

type Props = {
  onVector: (x: number, z: number) => void;
};

/** Touch joystick — dispatches normalized XZ for the 3D player. */
export function MobileControls({ onVector }: Props) {
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const active = useRef(false);

  const setKnob = (dx: number, dy: number) => {
    if (!knob.current) return;
    knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const handle = useCallback(
    (clientX: number, clientY: number) => {
      const el = base.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const max = r.width * 0.38;
      const mag = Math.hypot(dx, dy) || 1;
      if (mag > max) {
        dx = (dx / mag) * max;
        dy = (dy / mag) * max;
      }
      setKnob(dx, dy);
      // screen Y down → world +Z
      onVector(dx / max, dy / max);
    },
    [onVector]
  );

  const end = useCallback(() => {
    active.current = false;
    setKnob(0, 0);
    onVector(0, 0);
  }, [onVector]);

  return (
    <div className="pointer-events-none absolute bottom-28 left-4 z-30 md:hidden">
      <div
        ref={base}
        className="pointer-events-auto relative h-28 w-28 rounded-full border border-cyan-400/30 bg-sky-950/50 shadow-lg backdrop-blur-md"
        onPointerDown={(e) => {
          active.current = true;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          handle(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!active.current) return;
          handle(e.clientX, e.clientY);
        }}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div
          ref={knob}
          className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/50 bg-cyan-400/25 shadow-[0_0_20px_rgba(34,211,238,0.35)]"
        />
      </div>
      <div className="mt-1 text-center text-[9px] tracking-wide text-sky-300/50">
        DRAG TO MOVE
      </div>
    </div>
  );
}
