import { motion, useReducedMotion } from "motion/react";
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
  const reduced = useReducedMotion();
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
        animate={
          phase === "error" && !reduced
            ? { opacity: 1, scale: 1, y: 0, x: [0, -10, 10, -7, 7, -3, 0] }
            : { opacity: 1, scale: 1, y: 0, x: 0 }
        }
        exit={{ opacity: 0, scale: 0.98 }}
        transition={phase === "error" && !reduced ? { duration: 0.45, ease: "easeInOut" } : { type: "spring", stiffness: 320, damping: 28 }}
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
              <span className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel shadow-lg shadow-black/40">
                {phase === "starting" ? (
                  <motion.span
                    key="spin"
                    className="block h-5 w-5"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.16 }}
                  >
                    <motion.span
                      className="block h-5 w-5 rounded-full border-2 border-accent border-t-transparent"
                      animate={reduced ? undefined : { rotate: 360 }}
                      transition={reduced ? undefined : { repeat: Infinity, duration: 0.9, ease: "linear" }}
                    />
                  </motion.span>
                ) : (
                  <motion.svg
                    key="check"
                    viewBox="0 0 24 24"
                    className="h-5 w-5 text-accent"
                    fill="none"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 20 }}
                  >
                    <motion.path
                      d="M5 12.5l4.5 4.5L19 7.5"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={reduced ? { pathLength: 1 } : { pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.3, delay: 0.05 }}
                    />
                  </motion.svg>
                )}
              </span>
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