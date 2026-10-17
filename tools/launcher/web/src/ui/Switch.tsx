import { motion, useReducedMotion } from "motion/react";
import { cx } from "./cx";

export type SwitchProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
};

export function Switch({ label, checked, onChange, className }: SwitchProps) {
  const reduced = useReducedMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "flex h-11 w-16 shrink-0 items-center justify-center rounded-full transition-transform active:scale-[0.97]",
        className,
      )}
    >
      <span
        aria-hidden
        className={`relative block h-6 w-11 rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-white/15"
        }`}
      >
        <motion.span
          className="absolute top-0.5 left-0 h-5 w-5 rounded-full bg-white"
          animate={{ x: checked ? 22 : 2 }}
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 480, damping: checked ? 13 : 17 }
          }
        />
      </span>
    </button>
  );
}
