import { useEffect, useRef } from "react";

export type PadHandlers = {
  left(): void;
  right(): void;
  up(): void;
  down(): void;
  confirm(): void;
  back(): void;
  triangle(): void;
  square(): void;
  options(): void;
  touchpad(): void;
  l1(): void;
  r1(): void;
};

const DIRECTIONS: [keyof PadHandlers, number][] = [
  ["up", 12],
  ["down", 13],
  ["left", 14],
  ["right", 15],
];

const ACTIONS: [keyof PadHandlers, number][] = [
  ["confirm", 0],
  ["back", 1],
  ["square", 2],
  ["triangle", 3],
  ["l1", 4],
  ["r1", 5],
  ["options", 9],
  ["touchpad", 17],
];

const REPEAT_MS = 190;
const STICK_THRESHOLD = 0.55;

type Held = Map<number, number>;

function directionOf(pad: Gamepad): [keyof PadHandlers, number] | null {
  const stickX = pad.axes[0] ?? 0;
  const stickY = pad.axes[1] ?? 0;
  if (stickY < -STICK_THRESHOLD) return ["up", 12];
  if (stickY > STICK_THRESHOLD) return ["down", 13];
  if (stickX < -STICK_THRESHOLD) return ["left", 14];
  if (stickX > STICK_THRESHOLD) return ["right", 15];
  for (const [name, code] of DIRECTIONS) {
    if (pad.buttons[code]?.pressed) return [name, code];
  }
  return null;
}

export function useGamepad(handlers: PadHandlers, enabled: boolean): void {
  const held = useRef(handlers);
  held.current = handlers;
  useEffect(() => {
    if (!enabled || typeof navigator.getGamepads !== "function") return;
    const since: Held = new Map();
    let frame = 0;
    const tick = (): void => {
      const now = performance.now();
      for (const pad of navigator.getGamepads()) {
        if (!pad) continue;
        const direction = directionOf(pad);
        const keys: [keyof PadHandlers, number][] =
          direction === null ? ACTIONS : [...ACTIONS, direction];
        for (const [name, code] of keys) {
          const active = direction !== null && name === direction[0] ? true : pad.buttons[code]?.pressed ?? false;
          if (!active) {
            since.delete(code);
            continue;
          }
          const start = since.get(code);
          if (start === undefined) {
            since.set(code, now);
            held.current[name]();
          } else if (now - start > REPEAT_MS && DIRECTIONS.some(([item]) => item === name)) {
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
