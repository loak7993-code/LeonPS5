import { useState } from "react";
import { Check, Copy, FolderOpen } from "@phosphor-icons/react";
import type { Library } from "../api";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { Segmented } from "../ui/Segmented";
import { Switch } from "../ui/Switch";
import { TextField } from "../ui/TextField";
import type { Accent, Prefs } from "../prefs";

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
          {dirError && <p className="mt-2 text-left text-xs text-danger">{dirError}</p>}
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
          <Button data-autofocus onClick={onRescan}>
            Rescan library
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
