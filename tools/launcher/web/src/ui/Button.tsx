import { forwardRef } from "react";
import { CircleNotch } from "@phosphor-icons/react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  block?: boolean;
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:brightness-110",
  secondary: "border border-line text-text hover:bg-white/5",
  ghost: "text-muted hover:text-text hover:bg-white/5",
  danger: "bg-danger text-canvas hover:brightness-110",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", loading = false, icon, trailing, block, className, children, disabled, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cx(
        "inline-flex select-none items-center justify-center font-medium transition-[filter,background-color,border-color,color] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
        VARIANTS[variant],
        "h-11 px-4 text-sm gap-2 rounded-lg",
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <CircleNotch size={16} weight="bold" className="animate-spin" /> : icon}
      {children}
      {trailing}
    </button>
  );
});
