import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, FolderOpen } from "@phosphor-icons/react";
import { GameArt } from "./Art";
import { iconUrl, type Game, type Library } from "./api";
import type { Accent, Prefs } from "./prefs";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";
import { IconButton } from "./ui/IconButton";
import { Segmented } from "./ui/Segmented";
import { Switch } from "./ui/Switch";
import { TextField } from "./ui/TextField";

const ACCENTS: Accent[] = ["blue", "cyan", "emerald", "orange", "red"];
const ACCENT_HEX: Record<Accent, string> = {
  blue: "#2f6bff",
  cyan: "#2bb8d6",
  emerald: "#2fb87a",
  orange: "#e08a3c",
  red: "#e0524f",
};

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
  onToast: (message: string, kind?: "info" | "error") => void;
  onSaveDir: (dir: string) => Promise<void>;
  prefs: Prefs;
  onPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  onGallery: () => void;
};

export function SettingsSheet({
  library,
  onClose,
  onRescan,
  onOpenFolder,
  onToast,
  onSaveDir,
  prefs,
  onPref,
  onGallery,
}: SettingsSheetProps) {
  const [copied, setCopied] = useState(false);
  const [dir, setDir] = useState(library.gamesDir);
  const [saving, setSaving] = useState(false);
  const [dirError, setDirError] = useState<string | null>(null);

  const changeDir = (): void => {
    setSaving(true);
    setDirError(null);
    onSaveDir(dir)
      .then(() => onToast("Games directory saved"))
      .catch((reason: unknown) => setDirError(reason instanceof Error ? reason.message : String(reason)))
      .finally(() => setSaving(false));
  };

  return (
    <Dialog open onClose={onClose} title="Settings">
      <div>
        <Row label="Accent">
          <div className="flex items-center justify-end gap-2">
            {ACCENTS.map((accent) => (
              <button
                key={accent}
                type="button"
                aria-label={`Accent ${accent}`}
                aria-pressed={prefs.accent === accent}
                onClick={() => onPref("accent", accent)}
                className={`h-6 w-6 rounded-full transition-transform ${
                  prefs.accent === accent ? "scale-110 ring-2 ring-white/80" : "hover:scale-110"
                }`}
                style={{ background: ACCENT_HEX[accent] }}
              />
            ))}
          </div>
        </Row>
        <Row label="Card size">
          <Segmented
            label="Card size"
            value={prefs.cardSize}
            onChange={(value) => onPref("cardSize", value)}
            options={[
              { value: "small", label: "S" },
              { value: "medium", label: "M" },
              { value: "large", label: "L" },
            ]}
          />
        </Row>
        <Row label="Motion">
          <Segmented
            label="Motion"
            value={prefs.motion}
            onChange={(value) => onPref("motion", value)}
            options={[
              { value: "full", label: "Full" },
              { value: "reduced", label: "Reduced" },
            ]}
          />
        </Row>
        <Row label="Backdrop art">
          <Switch label="Backdrop art" checked={prefs.backdrop} onChange={(on) => onPref("backdrop", on)} />
        </Row>
        <div className="border-b border-line px-6 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <span className="shrink-0 text-sm text-muted">Games directory</span>
            <span className="min-w-0 text-right text-sm">{library.gamesDir}</span>
          </div>
          <div className="mt-3 flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <TextField
                label="Change games directory"
                hideLabel
                value={dir}
                onChange={(event) => setDir(event.target.value)}
                error={dirError}
              />
            </div>
            <Button
              loading={saving}
              disabled={!dir.trim() || dir === library.gamesDir}
              onClick={changeDir}
              className="mb-[1px] h-11 shrink-0"
            >
              {saving ? "Saving" : "Change"}
            </Button>
          </div>
        </div>
        <Row label="Copy path">
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
                .catch(() => onToast("Copy failed", "error"));
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
        <Row label="Runner arguments">
          <span className="font-mono text-xs text-text">
            {library.extraArgs.length ? library.extraArgs.join(" ") : "none"}
          </span>
        </Row>
        <Row label="Launcher version">
          <span className="font-mono text-xs text-text">{library.version}</span>
        </Row>
      </div>
      <div className="flex items-center justify-between gap-3 px-6 py-4">
        <Button variant="ghost" onClick={onGallery}>
          Component gallery
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={<FolderOpen size={16} weight="bold" />} onClick={onOpenFolder}>
            Open folder
          </Button>
          <Button data-autofocus onClick={onRescan}>Rescan library</Button>
        </div>
      </div>
    </Dialog>
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
  const columns = useMemo(
    () => Math.max(1, Math.floor((typeof window === "undefined" ? 1280 : window.innerWidth - 96) / 174)),
    [],
  );

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
    <Dialog
      open
      onClose={onClose}
      wide
      title={`Library · ${games.length} ${games.length === 1 ? "title" : "titles"}`}
    >
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
                  position === index
                    ? "shadow-[0_0_0_2px_rgba(255,255,255,0.88)]"
                    : "shadow-[0_0_0_1px_rgba(151,163,224,0.12)]"
                }`}
              >
                {game.hasIcon ? (
                  <img src={iconUrl(game.id)} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <GameArt id={game.id} title={game.title} className="absolute inset-0 h-full w-full" />
                )}
              </span>
              <span className={`truncate text-xs ${position === index ? "text-text" : "text-muted"}`}>{game.title}</span>
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  );
}

type AboutSheetProps = { onClose: () => void; onGallery: () => void };

export function AboutSheet({ onClose, onGallery }: AboutSheetProps) {
  return (
    <Dialog open onClose={onClose} title="About">
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
          <a href="https://github.com/loak7993-code/LeonPS5" className="text-accent underline-offset-4 hover:underline">
            github.com/loak7993-code/LeonPS5
          </a>
        </p>
      </div>
      <div className="flex justify-between border-t border-line px-6 py-4">
        <Button variant="ghost" onClick={onGallery}>
          Component gallery
        </Button>
        <IconButton label="Close" onClick={onClose} className="self-center">
          <Check size={18} weight="bold" />
        </IconButton>
      </div>
    </Dialog>
  );
}

type PowerSheetProps = { onClose: () => void; onQuit: () => void };

export function PowerSheet({ onClose, onQuit }: PowerSheetProps) {
  return (
    <Dialog open onClose={onClose} title="Power">
      <div className="px-6 py-5">
        <p className="text-sm text-muted">
          Quitting stops the launcher server on this machine. Any title the runner is still
          processing keeps running in the background.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onQuit}>
            Quit launcher
          </Button>
        </div>
      </div>
    </Dialog>
  );
}