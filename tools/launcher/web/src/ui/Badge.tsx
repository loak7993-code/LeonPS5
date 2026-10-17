import { cx } from "./cx";

export type BadgeProps = {
  tone?: "neutral" | "accent" | "danger" | "success";
  children: React.ReactNode;
  className?: string;
};

const TONES: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-white/10 text-muted",
  accent: "bg-accent/15 text-text",
  danger: "bg-danger/15 text-danger",
  success: "bg-accent/20 text-text",
};

export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
