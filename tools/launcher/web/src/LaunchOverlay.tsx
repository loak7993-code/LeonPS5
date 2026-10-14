import { motion } from "motion/react";
import { XCircle } from "@phosphor-icons/react";
import { GameArt } from "./Art";
import { Button } from "./ui/Button";
import { Progress } from "./ui/Progress";
import { iconUrl, picUrl, type Game } from "./api";

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
        className="w-full max-w-md rounded-2xl border border-line bg-panel p-8 text-center"
      >
        {phase === "error" ? (
          <>
            <XCircle size={40} weight="bold" className="mx-auto text-danger" />
            <h2 className="mt-4 text-lg font-semibold">Could not start {game.title}</h2>
            <p className="mt-2 rounded-lg bg-white/5 p-3 text-left font-mono text-xs text-muted">{error}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="secondary" onClick={onClose}>
                Back
              </Button>
              <Button onClick={onRetry}>Retry</Button>
            </div>
          </>
        ) : (
          <>
            <div className="relative mx-auto h-28 w-28">
              <div
                aria-hidden
                className="absolute -inset-4 rounded-[32px]"
                style={{
                  background:
                    "radial-gradient(closest-side, color-mix(in oklab, var(--color-accent) 28%, transparent), transparent)",
                }}
              />
              {game.hasPic ? (
                <motion.img
                  src={picUrl(game.id)}
                  alt=""
                  draggable={false}
                  className="relative h-28 w-28 rounded-2xl object-cover shadow-2xl shadow-black/50"
                  initial={{ opacity: 0, scale: 0.82 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
                />
              ) : game.hasIcon ? (
                <motion.img
                  src={iconUrl(game.id)}
                  alt=""
                  draggable={false}
                  className="relative h-28 w-28 rounded-2xl object-cover shadow-2xl shadow-black/50"
                  initial={{ opacity: 0, scale: 0.82 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
                />
              ) : (
                <motion.div
                  className="relative h-28 w-28 overflow-hidden rounded-2xl shadow-2xl shadow-black/50"
                  initial={{ opacity: 0, scale: 0.82 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
                >
                  <GameArt id={game.id} title={game.title} className="h-full w-full" />
                </motion.div>
              )}
            </div>
            <h2 className="mt-5 text-lg font-semibold">
              {phase === "starting" ? `Starting ${game.title}` : "Running in the background"}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {phase === "starting"
                ? "Handing the title to the leonps5 runner."
                : "The runner keeps working. Esc returns to the home screen."}
            </p>
            {phase === "starting" && <Progress label={`Starting ${game.title}`} className="mt-5" />}
            {command && phase === "running" && (
              <p className="mt-3 truncate rounded-lg bg-white/5 px-3 py-2 font-mono text-xs text-muted">{command}</p>
            )}
            {phase === "running" && (
              <Button variant="secondary" className="mt-6" onClick={onClose}>
                Back to home
              </Button>
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
      <Button onClick={onReload}>Reload</Button>
    </div>
  );
}