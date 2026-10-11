import { cx } from "./cx";

export type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  body?: React.ReactNode;
  actions?: React.ReactNode;
  note?: string;
  className?: string;
};

export function EmptyState({ icon, title, body, actions, note, className }: EmptyStateProps) {
  return (
    <div className={cx("flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 text-center", className)}>
      {icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/12 text-accent">{icon}</div>
      )}
      <div className="max-w-md">
        <h2 className="text-2xl font-semibold">{title}</h2>
        {body && <div className="mt-2 text-sm text-muted">{body}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-center gap-3">{actions}</div>}
      {note && <p className="text-xs text-muted/60">{note}</p>}
    </div>
  );
}
