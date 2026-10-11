import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FolderOpen, Check, ArrowRight, Flask } from "@phosphor-icons/react";
import type { Library } from "./api";

type Step = 0 | 1 | 2;

type OnboardingProps = {
  library: Library;
  onSaveDir: (dir: string) => Promise<void>;
  onDemo: () => void;
  onClose: () => void;
};

export function Onboarding({ library, onSaveDir, onDemo, onClose }: OnboardingProps) {
  const [step, setStep] = useState<Step>(0);
  const [dir, setDir] = useState(library.gamesDir);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveDir = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await onSaveDir(dir);
      setStep(2);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/85 p-6 backdrop-blur-md">
      <motion.div
        role="dialog"
        aria-label="Setup"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-center gap-2 px-6 pt-6">
          {[0, 1, 2].map((slot) => (
            <span
              key={slot}
              className={`h-1 flex-1 rounded-full transition-colors ${
                slot <= step ? "bg-accent" : "bg-white/10"
              }`}
            />
          ))}
          <span className="ml-2 font-mono text-xs text-muted">{step + 1}/3</span>
        </div>
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="welcome"
              className="px-6 py-6"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
            >
              <h2 className="text-xl font-semibold">Welcome to LeonPS5</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                This is the home screen. It finds your game folders, shows every title as a
                card and starts the leonps5 runner with one press. Three steps and it is ready.
              </p>
              <div className="mt-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 rounded-lg px-3 text-sm text-muted transition-colors hover:text-text"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white transition-transform hover:brightness-110 active:scale-[0.98]"
                >
                  Continue
                  <ArrowRight size={16} weight="bold" />
                </button>
              </div>
            </motion.div>
          )}
          {step === 1 && (
            <motion.div
              key="folder"
              className="px-6 py-6"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
            >
              <h2 className="text-xl font-semibold">Where are your games?</h2>
              <p className="mt-2 text-sm text-muted">
                Pick the folder that holds your game folders. You can change it later in
                Settings.
              </p>
              <input
                type="text"
                value={dir}
                aria-label="Games directory"
                onChange={(event) => setDir(event.target.value)}
                className="mt-4 h-11 w-full rounded-lg border border-line bg-canvas/60 px-3 font-mono text-sm outline-none focus:border-accent"
              />
              {library.suggestions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {library.suggestions
                    .filter((item) => item !== dir)
                    .slice(0, 3)
                    .map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setDir(item)}
                        className="max-w-full truncate rounded-full border border-line px-3 py-1 font-mono text-xs text-muted transition-colors hover:bg-white/5 hover:text-text"
                      >
                        {item}
                      </button>
                    ))}
                </div>
              )}
              {error && <p className="mt-3 text-xs text-danger">{error}</p>}
              <div className="mt-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 rounded-lg px-3 text-sm text-muted transition-colors hover:text-text"
                >
                  Skip
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onDemo}
                    className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-muted transition-colors hover:text-text"
                  >
                    <Flask size={16} weight="bold" />
                    Show me the demo
                  </button>
                  <button
                    type="button"
                    disabled={busy || !dir.trim()}
                    onClick={saveDir}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white transition-transform enabled:hover:brightness-110 enabled:active:scale-[0.98] disabled:opacity-40"
                  >
                    {busy ? "Saving" : "Save and continue"}
                    <ArrowRight size={16} weight="bold" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          {step === 2 && (
            <motion.div
              key="ready"
              className="px-6 py-6"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
            >
              <h2 className="text-xl font-semibold">You are set up</h2>
              <ul className="mt-4 space-y-2.5">
                {[
                  { label: "Games folder saved", done: true },
                  {
                    label: "Game folders found",
                    done: library.games.length > 0,
                    hint: "Drop a folder with sce_module, sce_modules or prx inside",
                  },
                  {
                    label: "Runner ready",
                    done: library.runnerFound,
                    hint: "Build it with cmake --build build --target leonps5",
                  },
                ].map((item) => (
                  <li key={item.label} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        item.done ? "bg-accent text-white" : "bg-white/10 text-muted"
                      }`}
                    >
                      <Check size={12} weight="bold" />
                    </span>
                    <span>
                      <span className={`text-sm ${item.done ? "text-text" : "text-muted"}`}>
                        {item.label}
                      </span>
                      {!item.done && item.hint && (
                        <span className="block text-xs text-muted/70">{item.hint}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    onDemo();
                    onClose();
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-muted transition-colors hover:text-text"
                >
                  <Flask size={16} weight="bold" />
                  Explore with demo titles
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white transition-transform hover:brightness-110 active:scale-[0.98]"
                >
                  <FolderOpen size={16} weight="bold" />
                  Open the home screen
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}