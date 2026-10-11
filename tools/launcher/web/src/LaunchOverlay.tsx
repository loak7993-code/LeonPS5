import { motion } from "motion/react";
import { CircleNotch, XCircle } from "@phosphor-icons/react";
import type { Game } from "./api";

export type LaunchPhase = "starting" | "running" | "error";

type LaunchOverlayProps = {
  game: Game;
  phase: LaunchPhase;
  error: string | null;
  command: string | null;
  onRetry: () => void;
  onClose: () => void;
};

export function LaunchOverlay({ game, phase, error, command, onRetry, onClose }: LaunchOverlayProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 p-6 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        role="alertdialog"
        aria-label={phase === "error" ? "Could not start the title" : `Starting ${game.title}`}
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full max-w-sm rounded-2xl border border-line bg-panel p-8 text-center"
      >
        {phase === "error" ? (
          <>
            <XCircle size={40} weight="bold" className="mx-auto text-danger" />
            <h2 className="mt-4 text-lg font-semibold">Could not start {game.title}</h2>
            <p className="mt-2 rounded-lg bg-white/5 p-3 text-left font-mono text-xs text-muted">{error}</p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-lg border border-line px-4 text-sm text-text transition-colors hover:bg-white/5"
              >
                Back
              </button>
              <button
                type="button"
                onClick={onRetry}
                className="h-10 rounded-lg bg-accent px-4 text-sm font-medium text-white transition-transform active:scale-[0.98]"
              >
                Retry
              </button>
            </div>
          </>
        ) : (
          <>
            {phase === "starting" ? (
              <CircleNotch size={40} weight="bold" className="mx-auto animate-spin text-accent" />
            ) : (
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 font-mono text-sm font-bold text-accent">
                OK
              </span>
            )}
            <h2 className="mt-4 text-lg font-semibold">
              {phase === "starting" ? `Starting ${game.title}` : "Running in the background"}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {phase === "starting"
                ? "Handing the title to the leonps5 runner."
                : command
                  ? "The runner keeps working. Esc returns to the home screen."
                  : "Esc returns to the home screen."}
            </p>
            {command && phase === "running" && (
              <p className="mt-3 truncate rounded-lg bg-white/5 px-3 py-2 font-mono text-xs text-muted">{command}</p>
            )}
            {phase === "running" && (
              <button
                type="button"
                onClick={onClose}
                className="mt-6 h-10 rounded-lg border border-line px-4 text-sm text-text transition-colors hover:bg-white/5"
              >
                Back to home
              </button>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export function StoppedScreen({ onReload }: { onReload: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-canvas">
      <h2 className="text-lg font-semibold">Launcher stopped</h2>
      <p className="text-sm text-muted">The local server has exited. Close this tab or reload.</p>
      <button
        type="button"
        onClick={onReload}
        className="h-10 rounded-lg bg-accent px-4 text-sm font-medium text-white transition-transform active:scale-[0.98]"
      >
        Reload
      </button>
    </div>
  );
}
