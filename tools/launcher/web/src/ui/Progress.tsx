import { cx } from "./cx";

export type ProgressProps = {
  value?: number;
  label: string;
  className?: string;
};

export function Progress({ value, label, className }: ProgressProps) {
  if (value === undefined) {
    return (
      <div
        role="progressbar"
        aria-label={label}
        className={cx("h-1.5 w-full overflow-hidden rounded-full bg-white/8", className)}
      >
        <div className="progress-indeterminate h-full w-1/3 rounded-full bg-accent" />
      </div>
    );
  }
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cx("h-1.5 w-full overflow-hidden rounded-full bg-white/8", className)}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
