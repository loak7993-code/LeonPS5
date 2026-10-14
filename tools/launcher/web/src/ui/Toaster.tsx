import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { WarningCircle, X } from "@phosphor-icons/react";
import { cx } from "./cx";

export type ToastKind = "info" | "error";

type ToastEntry = {
  id: number;
  message: string;
  kind: ToastKind;
  duration: number;
};

type ToastApi = {
  toast: (message: string, kind?: ToastKind, duration?: number) => void;
};

const ToastContext = createContext<ToastApi>({ toast: () => undefined });

const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<ToastEntry[]>([]);
  const counter = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = "info", duration = kind === "error" ? 4200 : 2600) => {
      counter.current += 1;
      const id = counter.current;
      setEntries((current) => [...current.slice(-(MAX_VISIBLE - 1)), { id, message, kind, duration }]);
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), duration),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) window.clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-32 z-[60] flex flex-col items-center gap-2 px-4">
          <AnimatePresence>
            {entries.map((entry) => (
              <motion.div
                key={entry.id}
                role={entry.kind === "error" ? "alert" : "status"}
                aria-live={entry.kind === "error" ? "assertive" : "polite"}
                className={cx(
                  "pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full border px-4 py-2 text-sm shadow-lg",
                  entry.kind === "error" ? "border-danger/40 bg-panel text-text" : "border-line bg-panel text-text",
                )}
                initial={{ opacity: 0, y: 14, scale: 0.96, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 8, scale: 0.97, filter: "blur(4px)" }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              >
                {entry.kind === "error" && <WarningCircle size={16} weight="bold" className="text-danger" />}
                <span className="min-w-0">{entry.message}</span>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => dismiss(entry.id)}
                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/10 hover:text-text"
                >
                  <X size={12} weight="bold" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  return useContext(ToastContext);
}
