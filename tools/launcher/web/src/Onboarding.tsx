import { useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Check, Flask, FolderOpen } from "@phosphor-icons/react";
import { Button } from "./ui/Button";
import { TextField } from "./ui/TextField";
import { useFocusTrap } from "./ui/useFocusTrap";
import type { Library } from "./api";

type Step = 0 | 1 | 2;

type OnboardingProps = {
  library: Library;
  onSaveDir: (dir: string) => Promise<void>;
  onDemo: () => void;
  onClose: () => void;
};

const CHECK = [
  { label: "Games folder saved" },
  { label: "Game folders found", hint: "Drop a folder with sce_module, sce_modules or prx inside" },
  { label: "Runner ready", hint: "Build it with cmake --build build --target leonps5" },
];

export function Onboarding({ library, onSaveDir, onDemo, onClose }: OnboardingProps) {
  const [step, setStep] = useState<Step>(0);
  const [dir, setDir] = useState(library.gamesDir);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, true);

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

  const done = [true, library.games.length > 0, library.runnerFound];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/85 p-6 backdrop-blur-md">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Setup"
        tabIndex={-1}
        ref={panelRef}
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_30px_80px_rgba(0,0,0,0.5)] outline-none"
      >
        <div className="flex items-center gap-2 px-6 pt-6">
          {[0, 1, 2].map((slot) => (
            <span
              key={slot}
              className={`h-1 flex-1 rounded-full transition-colors ${slot <= step ? "bg-accent" : "bg-white/10"}`}
            />
          ))}
          <span className="ml-2 font-mono text-xs text-muted">{step + 1}/3</span>
        </div>
        <motion.div
          key={step}
          className="px-6 py-6"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.18 }}
        >
          {step === 0 && (
            <>
              <h2 className="text-xl font-semibold">Welcome to LeonPS5</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                This is the home screen. It finds your game folders, shows every title as a card
                and starts the leonps5 runner with one press. Three steps and it is ready.
              </p>
              <div className="mt-5 flex items-center justify-between">
                <Button variant="ghost" onClick={onClose}>
                  Skip
                </Button>
                <Button data-autofocus onClick={() => setStep(1)} trailing={<ArrowRight size={16} weight="bold" />}>
                  Continue
                </Button>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h2 className="text-xl font-semibold">Where are your games?</h2>
              <p className="mt-2 text-sm text-muted">
                Pick the folder that holds your game folders. You can change it later in Settings.
              </p>
              <div className="mt-4">
                <TextField
                  label="Games directory"
                  value={dir}
                  onChange={(event) => setDir(event.target.value)}
                  error={error}
                />
              </div>
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
              <div className="mt-5 flex items-center justify-between">
                <Button variant="ghost" onClick={onClose}>
                  Skip
                </Button>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" icon={<Flask size={16} weight="bold" />} onClick={onDemo}>
                    Show me the demo
                  </Button>
                  <Button
                    data-autofocus
                    loading={busy}
                    disabled={!dir.trim()}
                    onClick={saveDir}
                    trailing={<ArrowRight size={16} weight="bold" />}
                  >
                    {busy ? "Saving" : "Save and continue"}
                  </Button>
                </div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="text-xl font-semibold">You are set up</h2>
              <ul className="mt-4 space-y-2.5">
                {CHECK.map((item, index) => (
                  <li key={item.label} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        done[index] ? "bg-accent text-white" : "bg-white/10 text-muted"
                      }`}
                    >
                      {done[index] ? <Check size={12} weight="bold" /> : <span className="text-[10px]">·</span>}
                    </span>
                    <span>
                      <span className={`text-sm ${done[index] ? "text-text" : "text-muted"}`}>{item.label}</span>
                      {!done[index] && item.hint && (
                        <span className="block text-xs text-muted/70">{item.hint}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center justify-between">
                <Button
                  variant="ghost"
                  icon={<Flask size={16} weight="bold" />}
                  onClick={() => {
                    onDemo();
                    onClose();
                  }}
                >
                  Explore with demo titles
                </Button>
                <Button data-autofocus icon={<FolderOpen size={16} weight="bold" />} onClick={onClose}>
                  Open the home screen
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}