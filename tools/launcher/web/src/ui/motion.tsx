import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export function SwapBlur({ value, className }: { value: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={typeof value === "string" ? value : String(value)}
        className={className}
        initial={reduced ? { opacity: 0 } : { opacity: 0, filter: "blur(4px)", scale: 0.96 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, filter: "blur(0px)", scale: 1 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, filter: "blur(4px)", scale: 0.96 }}
        transition={{ duration: 0.14 }}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

export function PopValue({ value, className }: { value: string; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <span className={className} aria-label={value}>
      {value.split("").map((char, index) => (
        <motion.span
          key={`${value}-${index}`}
          aria-hidden
          className="inline-block"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 9 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ delay: index * 0.028, duration: 0.24, ease: [0.2, 0, 0, 1] }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </span>
  );
}

export function Shake({ children, active }: { children: ReactNode; active: boolean }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="contents"
      animate={active && !reduced ? { x: [0, -10, 10, -7, 7, -3, 0] } : { x: 0 }}
      transition={active && !reduced ? { duration: 0.45, ease: "easeInOut" } : { duration: 0 }}
    >
      {children}
    </motion.div>
  );
}
