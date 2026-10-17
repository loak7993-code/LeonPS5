import { forwardRef } from "react";
import { cx } from "./cx";

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  tone?: "neutral" | "danger";
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, tone = "neutral", className, children, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40",
        tone === "danger" ? "text-danger hover:bg-danger/15" : "text-muted hover:bg-white/10 hover:text-text",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
