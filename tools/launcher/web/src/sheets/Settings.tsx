import { useState } from "react";
import { motion } from "motion/react";
import {
  Check,
  Copy,
  FolderOpen,
  Palette,
  SpeakerHigh,
  HardDrives,
  Info,
  ArrowLeft,
} from "@phosphor-icons/react";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { Segmented } from "../ui/Segmented";
import { Switch } from "../ui/Switch";
import { TextField } from "../ui/TextField";
import type { Library } from "../api";
import type { Accent, Prefs } from "../prefs";

const ACCENTS: Accent[] = ["blue", "cyan", "emerald", "orange", "red"];
const ACCENT_HEX: Record<Accent, string> = {
  blue: "#2f6bff",
  cyan: "#2bb8d6",
  emerald: "#2fb87a",
  orange: "#e08a3c",
  red: "#e0524f",
};

type Section = "appearance" | "sound" | "library" | "about";

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "appearance", label: "Appearance", icon: <Palette size={20} weight="bold" /> },
  { id: "sound", label: "Sound", icon: <SpeakerHigh size={20} weight="bold" /> },
  { id: "library", label: "Library", icon: <HardDrives size={20} weight="bold" /> },
  { id: "about", label: "About", icon: <Info size={20} weight="bold" /> },
];

function SettingsRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-line px-8 py-5 last:border-b-0 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="text-sm font-medium text-text">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-muted/70">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
  label,
  format,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  label: string;
  format?: (value: number) => string;
}) {
  return (
    <div className="flex items-center gap-4">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-44 cursor-pointer appearance-none rounded-full bg-white/10 accent-[var(--color-accent)] outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-md"
      />
      <span className="w-14 text-right font-mono text-xs text-muted">
        {format ? format(value) : value}
      </span>
    </div>
  );
}

type SettingsPageProps = {
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

export function SettingsPage({
  library,
  onClose,
  onRescan,
  onOpenFolder,
  onToast,
  onSaveDir,
  prefs,
  onPref,
  onGallery,
}: SettingsPageProps) {
  const [section, setSection] = useState<Section>("appearance");
  const [copied, setCopied] = useState(false);
  const [dir, setDir] = useState(library.gamesDir);
  const [saving, setSaving] = useState(false);
  const [dirError, setDirError] = useState<string | null>(null);

  const changeDir = (): void => {
    setSaving(true);
    setDirError(null);
    onSaveDir(dir)
      .then(() => onToast("Games directory saved"))
      .catch((reason: unknown) =>
        setDirError(reason instanceof Error ? reason.message : String(reason))
      )
      .finally(() => setSaving(false));
  };

  return (
    <motion.div
      className="fixed inset-0 z-40 flex flex-col bg-canvas"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className="flex shrink-0 items-center gap-4 border-b border-line px-8 py-5">
        <IconButton label="Back" onClick={onClose}>
          <ArrowLeft size={20} weight="bold" />
        </IconButton>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <div className="ml-auto font-mono text-xs text-muted/70">LeonPS5 v{library.version}</div>
      </header>
      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="Settings sections"
          className="w-56 shrink-0 border-r border-line px-4 py-6 max-md:w-14"
        >
          <div className="flex flex-col gap-1">
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                aria-current={section === item.id ? "true" : undefined}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors max-md:justify-center max-md:px-2 ${
                  section === item.id
                    ? "bg-accent/15 text-accent"
                    : "text-muted hover:bg-white/5 hover:text-text"
                }`}
              >
                {item.icon}
                <span className="max-md:hidden">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {section === "appearance" && (
            <div className="mx-auto max-w-2xl px-8 py-8">
              <h2 className="mb-6 text-lg font-semibold">Appearance</h2>
              <SettingsRow label="Accent color" hint="Applies across the launcher">
                <div className="flex items-center gap-2.5">
                  {ACCENTS.map((accent) => (
                    <button
                      key={accent}
                      type="button"
                      aria-label={`Accent ${accent}`}
                      aria-pressed={prefs.accent === accent}
                      onClick={() => onPref("accent", accent)}
                      className={`h-8 w-8 rounded-full transition-transform ${
                        prefs.accent === accent
                          ? "scale-110 ring-2 ring-white/80"
                          : "hover:scale-110"
                      }`}
                      style={{ background: ACCENT_HEX[accent] }}
                    />
                  ))}
                </div>
              </SettingsRow>
              <SettingsRow label="Card size" hint="Size of the game tiles on the home screen">
                <Segmented
                  label="Card size"
                  value={prefs.cardSize}
                  onChange={(value) => onPref("cardSize", value)}
                  options={[
                    { value: "small", label: "Small" },
                    { value: "medium", label: "Medium" },
                    { value: "large", label: "Large" },
                  ]}
                />
              </SettingsRow>
              <SettingsRow label="Card spacing" hint="Gap between cards">
                <Segmented
                  label="Card spacing"
                  value={prefs.cardGap}
                  onChange={(value) => onPref("cardGap", value)}
                  options={[
                    { value: "compact", label: "Compact" },
                    { value: "normal", label: "Normal" },
                    { value: "spacious", label: "Spacious" },
                  ]}
                />
              </SettingsRow>
              <SettingsRow label="Motion" hint="Interface and transition animation level">
                <Segmented
                  label="Motion"
                  value={prefs.motion}
                  onChange={(value) => onPref("motion", value)}
                  options={[
                    { value: "full", label: "Full" },
                    { value: "reduced", label: "Reduced" },
                  ]}
                />
              </SettingsRow>
              <SettingsRow label="Backdrop art" hint="Blurred selected game art behind the home screen">
                <Switch
                  label="Backdrop art"
                  checked={prefs.backdrop}
                  onChange={(on) => onPref("backdrop", on)}
                />
              </SettingsRow>
              <SettingsRow label="UI sounds" hint="Navigation ticks and launch chimes">
                <Switch
                  label="UI sounds"
                  checked={prefs.sounds}
                  onChange={(on) => onPref("sounds", on)}
                />
              </SettingsRow>
              <SettingsRow
                label="Custom background"
                hint="A picture URL that overrides the game art backdrop when set"
              >
                <TextField
                  label="Custom background URL"
                  placeholder="https://example.com/wallpaper.jpg"
                  value={prefs.customBackdrop}
                  onChange={(event) => onPref("customBackdrop", event.target.value.trim())}
                />
              </SettingsRow>
              <SettingsRow
                label="Accent glow haze"
                hint="Faint luminous glow in the screen corners, tinted by the accent"
              >
                <Switch
                  label="Accent glow haze"
                  checked={prefs.accentGlow}
                  onChange={(on) => onPref("accentGlow", on)}
                />
              </SettingsRow>
              {prefs.accentGlow && (
                <SettingsRow label="Glow intensity" hint="Strength of the corner glow">
                  <Slider
                    label="Glow intensity"
                    value={prefs.glowIntensity}
                    min={0}
                    max={100}
                    step={5}
                    onChange={(value) => onPref("glowIntensity", value)}
                    format={(value) => `${value}%`}
                  />
                </SettingsRow>
              )}
              <SettingsRow label="Card shadow" hint="Colored glow under the selected card">
                <Switch
                  label="Card shadow"
                  checked={prefs.cardShadow}
                  onChange={(on) => onPref("cardShadow", on)}
                />
              </SettingsRow>
              <SettingsRow label="Corner radius" hint="Rounding of cards and panels, in pixels">
                <Slider
                  label="Corner radius"
                  value={prefs.cornerRadius}
                  min={0}
                  max={28}
                  step={2}
                  onChange={(value) => onPref("cornerRadius", value)}
                  format={(value) => `${value}px`}
                />
              </SettingsRow>
              <SettingsRow label="Top bar" hint="How the top bar sits over the page">
                <Segmented
                  label="Top bar"
                  value={prefs.topBarStyle}
                  onChange={(value) => onPref("topBarStyle", value)}
                  options={[
                    { value: "glass", label: "Glass" },
                    { value: "solid", label: "Solid" },
                    { value: "transparent", label: "Flat" },
                  ]}
                />
              </SettingsRow>
              <SettingsRow label="Wordmark" hint="LeonPS5 label in the top bar">
                <Switch
                  label="Wordmark"
                  checked={prefs.showWordmark}
                  onChange={(on) => onPref("showWordmark", on)}
                />
              </SettingsRow>
              <SettingsRow label="Wave lines" hint="Decorative flowing lines in the background">
                <Switch
                  label="Wave lines"
                  checked={prefs.waveOpacity > 0}
                  onChange={(on) => onPref("waveOpacity", on ? 100 : 0)}
                />
              </SettingsRow>
              {prefs.waveOpacity > 0 && (
                <SettingsRow label="Wave strength" hint="Visibility of the wave lines">
                  <Slider
                    label="Wave strength"
                    value={prefs.waveOpacity}
                    min={10}
                    max={100}
                    step={10}
                    onChange={(value) => onPref("waveOpacity", value)}
                    format={(value) => `${value}%`}
                  />
                </SettingsRow>
              )}
              {prefs.backdrop && (
                <>
                  <SettingsRow label="Backdrop blur" hint="How much the backdrop art is blurred">
                    <Slider
                      label="Backdrop blur"
                      value={prefs.backdropBlur}
                      min={0}
                      max={96}
                      step={4}
                      onChange={(value) => onPref("backdropBlur", value)}
                      format={(value) => `${value}px`}
                    />
                  </SettingsRow>
                  <SettingsRow label="Backdrop opacity" hint="How visible the backdrop art is">
                    <Slider
                      label="Backdrop opacity"
                      value={prefs.backdropOpacity}
                      min={10}
                      max={90}
                      step={5}
                      onChange={(value) => onPref("backdropOpacity", value)}
                      format={(value) => `${value}%`}
                    />
                  </SettingsRow>
                </>
              )}
            </div>
          )}
          {section === "sound" && (
            <div className="mx-auto max-w-2xl px-8 py-8">
              <h2 className="mb-6 text-lg font-semibold">Sound</h2>
              <SettingsRow
                label="Ambient music"
                hint="Generative console-style pad that plays on the home screen and fades during a title"
              >
                <Switch
                  label="Ambient music"
                  checked={prefs.music}
                  onChange={(on) => onPref("music", on)}
                />
              </SettingsRow>
              {prefs.music && (
                <SettingsRow label="Music volume" hint="How loud the ambient music plays">
                  <Slider
                    label="Music volume"
                    value={prefs.musicVolume}
                    min={0}
                    max={100}
                    step={5}
                    onChange={(value) => onPref("musicVolume", value)}
                    format={(value) => `${value}%`}
                  />
                </SettingsRow>
              )}
            </div>
          )}
          {section === "library" && (
            <div className="mx-auto max-w-2xl px-8 py-8">
              <h2 className="mb-6 text-lg font-semibold">Library</h2>
              <SettingsRow label="Games directory">
                <span className="text-sm text-muted">{library.gamesDir}</span>
              </SettingsRow>
              <div className="px-8 py-5">
                <div className="flex items-end gap-3">
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
              <SettingsRow label="Copy path">
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
                  {copied ? (
                    <Check size={14} weight="bold" className="text-accent" />
                  ) : (
                    <Copy size={14} weight="bold" className="text-muted" />
                  )}
                </button>
              </SettingsRow>
              <SettingsRow label="Runner">
                {library.runnerFound ? (
                  <span className="truncate font-mono text-xs text-text">{library.runnerPath}</span>
                ) : (
                  <span className="text-xs text-danger">
                    leonps5 not found. Build it or set LEONPS5_RUNNER.
                  </span>
                )}
              </SettingsRow>
              <SettingsRow label="Runner arguments">
                <span className="font-mono text-xs text-text">
                  {library.extraArgs.length ? library.extraArgs.join(" ") : "none"}
                </span>
              </SettingsRow>
            </div>
          )}
          {section === "about" && (
            <div className="mx-auto max-w-2xl px-8 py-8">
              <h2 className="mb-6 text-lg font-semibold">About</h2>
              <SettingsRow label="Launcher version">
                <span className="font-mono text-xs text-text">{library.version}</span>
              </SettingsRow>
              <SettingsRow label="Component gallery" hint="Preview every UI component">
                <Button variant="ghost" onClick={onGallery}>
                  Open gallery
                </Button>
              </SettingsRow>
            </div>
          )}
        </div>
      </div>
      <footer className="flex shrink-0 items-center justify-between border-t border-line px-8 py-4">
        <Button variant="secondary" icon={<FolderOpen size={16} weight="bold" />} onClick={onOpenFolder}>
          Open folder
        </Button>
        <Button data-autofocus onClick={onRescan}>
          Rescan library
        </Button>
      </footer>
    </motion.div>
  );
}
