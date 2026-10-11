import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { X, Copy, Check, FolderOpen, ArrowSquareOut } from "@phosphor-icons/react";
import { GameArt } from "./Art";
import { iconUrl, type Game, type Library } from "./api";

type SheetProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
};

export function Sheet({ title, onClose, children, wide }: SheetProps) {
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6 max-md:p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-canvas/70 backdrop-blur-sm"
      />
      <motion.div
        role="dialog"
        aria-label={title}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`relative w-full ${wide ? "max-w-4xl" : "max-w-[560px]"} overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_30px_80px_rgba(0,0,0,0.5)]`}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/10 hover:text-text"
          >
            <X size={18} weight="bold" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-3.5 last:border-b-0">
      <span className="shrink-0 text-sm text-muted">{label}</span>
      <div className="min-w-0 text-right text-sm">{children}</div>
    </div>
  );
}

type SettingsSheetProps = {
  library: Library;
  onClose: () => void;
  onRescan: () => void;
  onOpenFolder: () => void;
  onToast: (message: string) => void;
};

export function SettingsSheet({ library, onClose, onRescan, onOpenFolder, onToast }: SettingsSheetProps) {
  const [copied, setCopied] = useState(false);
  return (
    <Sheet title="Settings" onClose={onClose}>
      <div>
        <Row label="Games directory">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard
                .writeText(library.gamesDir)
                .then(() => {
                  setCopied(true);
                  onToast("Path copied");
                  window.setTimeout(() => setCopied(false), 1500);
                })
                .catch(() => onToast("Copy failed"));
            }}
            className="inline-flex max-w-full items-center gap-2 rounded-lg bg-white/5 px-2 py-1 font-mono text-xs text-text transition-colors hover:bg-white/10"
          >
            <span className="truncate">{library.gamesDir}</span>
            {copied ? <Check size={14} weight="bold" className="text-accent" /> : <Copy size={14} weight="bold" className="text-muted" />}
          </button>
        </Row>
        <Row label="Runner">
          {library.runnerFound ? (
            <span className="truncate font-mono text-xs text-text">{library.runnerPath}</span>
          ) : (
            <span className="text-xs text-danger">leonps5 not found. Build it or set LEONPS5_RUNNER.</span>
          )}
        </Row>
        <Row label="Launcher version">
          <span className="font-mono text-xs text-text">{library.version}</span>
        </Row>
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4">
        <button
          type="button"
          onClick={onOpenFolder}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-4 text-sm text-text transition-colors hover:bg-white/5"
        >
          <FolderOpen size={16} weight="bold" />
          Open folder
        </button>
        <button
          type="button"
          onClick={onRescan}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white transition-transform hover:brightness-110 active:scale-[0.98]"
        >
          <ArrowSquareOut size={16} weight="bold" />
          Rescan library
        </button>
      </div>
    </Sheet>
  );
}

type GridSheetProps = {
  games: Game[];
  index: number;
  onIndex: (index: number) => void;
  onActivate: (game: Game) => void;
  onClose: () => void;
};

export function GridSheet({ games, index, onIndex, onActivate, onClose }: GridSheetProps) {
  const selectedRef = useRef<HTMLButtonElement>(null);
  const columns = useMemo(() => Math.max(1, Math.floor((typeof window === "undefined" ? 1280 : window.innerWidth - 96) / 174)), []);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [index]);

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key === "ArrowLeft") onIndex(Math.max(0, index - 1));
      else if (event.key === "ArrowRight") onIndex(Math.min(games.length - 1, index + 1));
      else if (event.key === "ArrowUp") onIndex(Math.max(0, index - columns));
      else if (event.key === "ArrowDown") onIndex(Math.min(games.length - 1, index + columns));
      else if (event.key === "Enter" && games[index]) onActivate(games[index]);
      else if (event.key === "Escape") onClose();
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, columns, games, onIndex, onActivate, onClose]);

  return (
    <Sheet title={`Library · ${games.length} titles`} onClose={onClose} wide>
      <div className="max-h-[62vh] overflow-y-auto p-6">
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(158px, 1fr))" }}>
          {games.map((game, position) => (
            <button
              key={game.id}
              ref={position === index ? selectedRef : undefined}
              type="button"
              onMouseEnter={() => onIndex(position)}
              onFocus={() => onIndex(position)}
              onClick={() => onActivate(game)}
              className="flex flex-col gap-2 rounded-xl p-1 text-left transition-colors"
            >
              <span
                className={`relative block aspect-square w-full overflow-hidden rounded-xl bg-panel2 ${
                  position === index ? "shadow-[0_0_0_2px_rgba(255,255,255,0.88)]" : "shadow-[0_0_0_1px_rgba(151,163,224,0.12)]"
                }`}
              >
                {game.hasIcon ? (
                  <img src={iconUrl(game.id)} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <GameArt id={game.id} title={game.title} className="absolute inset-0 h-full w-full" />
                )}
              </span>
              <span className={`truncate text-xs ${position === index ? "text-text" : "text-muted"}`}>
                {game.title}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

type AboutSheetProps = { onClose: () => void };

export function AboutSheet({ onClose }: AboutSheetProps) {
  return (
    <Sheet title="About" onClose={onClose}>
      <div className="space-y-4 px-6 py-5 text-sm leading-relaxed text-muted">
        <p>
          LeonPS5 launcher is the home screen of the LeonPS5 project. It scans a games directory,
          shows every title as a card and hands the selected folder to the leonps5 runner.
        </p>
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-xs">
          <kbd className="justify-self-center rounded-md border border-line bg-white/5 px-2 py-1 font-mono text-text">Arrows</kbd>
          <span>Navigate rows and cards</span>
          <kbd className="justify-self-center rounded-md border border-line bg-white/5 px-2 py-1 font-mono text-text">Enter</kbd>
          <span>Start the selected title</span>
          <kbd className="justify-self-center rounded-md border border-line bg-white/5 px-2 py-1 font-mono text-text">Esc</kbd>
          <span>Close panels and overlays</span>
          <kbd className="justify-self-center rounded-md border border-line bg-white/5 px-2 py-1 font-mono text-text">Gamepad</kbd>
          <span>D-pad or left stick, cross to start, circle to go back</span>
        </div>
        <p className="font-mono text-xs">
          <a
            href="https://github.com/loak7993-code/LeonPS5"
            className="text-accent underline-offset-4 hover:underline"
          >
            github.com/loak7993-code/LeonPS5
          </a>
        </p>
      </div>
    </Sheet>
  );
}

type PowerSheetProps = { onClose: () => void; onQuit: () => void };

export function PowerSheet({ onClose, onQuit }: PowerSheetProps) {
  return (
    <Sheet title="Power" onClose={onClose}>
      <div className="px-6 py-5">
        <p className="text-sm text-muted">
          Quitting stops the launcher server on this machine. Any title the runner is still
          processing keeps running in the background.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-line px-4 text-sm text-text transition-colors hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onQuit}
            className="h-10 rounded-lg bg-danger px-4 text-sm font-medium text-canvas transition-transform active:scale-[0.98]"
          >
            Quit launcher
          </button>
        </div>
      </div>
    </Sheet>
  );
}


