import { forwardRef, useId } from "react";
import { cx } from "./cx";

export type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hideLabel?: boolean;
  hint?: string;
  error?: string | null;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hideLabel = false, hint, error, className, id, ...rest },
  ref,
) {
  const generated = useId();
  const inputId = id ?? generated;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");
  return (
    <div className="w-full">
      <label
        htmlFor={inputId}
        className={hideLabel ? "sr-only" : "block text-sm font-medium text-text"}
      >
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cx(
          hideLabel ? "" : "mt-2",
          "h-11 w-full rounded-lg border bg-canvas/60 px-3 font-mono text-sm text-text outline-none transition-colors placeholder:text-muted/70",
          error ? "border-danger focus:border-danger" : "border-line focus:border-accent",
          className,
        )}
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
});
