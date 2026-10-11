import { useEffect, useRef } from "react";

export type PadHandlers = {
  left(): void;
  right(): void;
  up(): void;
  down(): void;
  confirm(): void;
  back(): void;
};

const BUTTONS: Record<keyof PadHandlers, number> = {
  up: 12,
  down: 13,
  left: 14,
  right: 15,
  confirm: 0,
  back: 1,
};

const REPEAT_MS = 190;

export function useGamepad(handlers: PadHandlers, enabled: boolean): void {
  const held = useRef(handlers);
  held.current = handlers;
  useEffect(() => {
    if (!enabled || typeof navigator.getGamepads !== "function") return;
    const since = new Map<number, number>();
    let frame = 0;
    const tick = (): void => {
      for (const pad of navigator.getGamepads()) {
        if (!pad) continue;
        const now = performance.now();
        const stickX = pad.axes[0] ?? 0;
        const stickY = pad.axes[1] ?? 0;
        for (const [name, code] of Object.entries(BUTTONS) as [keyof PadHandlers, number][]) {
          const button = pad.buttons[code]?.pressed ?? false;
          const stick =
            (name === "left" && stickX < -0.62) ||
            (name === "right" && stickX > 0.62) ||
            (name === "up" && stickY < -0.62) ||
            (name === "down" && stickY > 0.62);
          const active = button || stick;
          if (!active) {
            since.delete(code);
            continue;
          }
          const start = since.get(code);
          if (start === undefined) {
            since.set(code, now);
            held.current[name]();
          } else if (now - start > REPEAT_MS) {
            since.set(code, now);
            held.current[name]();
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [enabled]);
}
