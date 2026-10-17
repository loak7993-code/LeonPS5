import { useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Check,
  Copy,
  FolderOpen,
  HardDrives,
  Image as ImageIcon,
  Info,
  Palette,
  SpeakerHigh,
  X,
} from "@phosphor-icons/react";
import { Button } from "../ui/Button";
import { Segmented } from "../ui/Segmented";
import { Switch } from "../ui/Switch";
import { TextField } from "../ui/TextField";
import { useFocusTrap } from "../ui/useFocusTrap";
import type { Library } from "../api";
import { ACCENT_HEX, accentLabel, type Accent, type Prefs } from "../prefs";

type Section = "appearance" | "background" | "sound" | "library" | "about";

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "appearance", label: "Appearance", icon: <Palette size={20} weight="bold" /> },
  { id: "background", label: "Background", icon: <ImageIcon size={20} weight="bold" /> },
  { id: "sound", label: "Sound", icon: <SpeakerHigh size={20} weight="bold" /> },
  { id: "library", label: "Library", icon: <HardDrives size={20} weight="bold" /> },
  { id: "about", label: "About", icon: <Info size={20} weight="bold" /> },
];

function SettingsRow({
  label,
  hint,
  children,
  index,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  index: number;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10 },
        shown: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
      }}
      className="flex flex-col gap-3 border-b border-line px-8 py-5 transition-colors last:border-b-0 hover:bg-white/[0.03] md:flex-row md:items-center md:justify-between max-md:px-5"
      style={{ transitionDelay: `${index * 20}ms` }}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-text">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-muted/70">{hint}</div>}
      </div>
      <div className="shrink-0 max-md:w-full">{children}</div>
    </motion.div>
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
  const id = useId();
  const fill = Math.round(((value - min) / (max - min)) * 100);
  return (
    <div className="flex items-center gap-4 max-md:w-full">
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{
          background: `linear-gradient(90deg, var(--color-accent) ${fill}%, rgba(255,255,255,0.1) ${fill}%)`,
        }}
        className="h-11 w-44 cursor-pointer appearance-none rounded-full bg-white/10 outline-none max-md:w-full [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[-8px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(0,0,0,0.4)] [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />
      <span className="w-16 text-right font-mono text-xs text-muted">
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
  const reduced = useReducedMotion();
  const [section, setSection] = useState<Section>("appearance");
  const [copied, setCopied] = useState(false);
  const [dir, setDir] = useState(library.gamesDir);
  const [saving, setSaving] = useState(false);
  const [dirError, setDirError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, true, onClose);

  const changeDir = (): void => {
    setSaving(true);
    setDirError(null);
    onSaveDir(dir)
      .then(() => onToast("Games directory saved"))
      .catch((reason: unknown) =>
        setDirError(reason instanceof Error ? reason.message : String(reason)),
      )
      .finally(() => setSaving(false));
  };

  const urlError =
    prefs.customBackdrop.length > 0 && !/^https?:\/\/.+/.test(prefs.customBackdrop)
      ? "Enter a full http or https URL"
      : null;

  const rows = {
    hidden: {},
    shown: { transition: { staggerChildren: 0.03 } },
  };

  return (
    <motion.div
      className="fixed inset-0 z-40 bg-canvas/85 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.18 }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        tabIndex={-1}
        className="mx-auto flex h-full w-full max-w-6xl flex-col"
        initial={{ opacity: 0, y: reduced ? 0 : 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 240, damping: 28 }}
      >
        <header className="flex shrink-0 items-center gap-4 px-8 pt-6 pb-5 max-md:px-5">
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <span className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-[11px] text-muted">
            v{library.version}
          </span>
          <div className="ml-auto">
            <button
              type="button"
              aria-label="Close settings"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/10 hover:text-text active:scale-[0.96]"
            >
              <X size={20} weight="bold" />
            </button>
          </div>
        </header>
        <div className="flex min-h-0 flex-1">
          <nav
            aria-label="Settings sections"
            className="w-60 shrink-0 px-4 pb-6 max-md:w-[60px] max-md:px-2"
          >
            <div className="flex flex-col gap-1">
              {SECTIONS.map((item) => {
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={item.label}
                    aria-current={active ? "true" : undefined}
                    onClick={() => setSection(item.id)}
                    className={`relative flex h-11 items-center gap-3 rounded-lg px-4 text-sm transition-colors max-md:justify-center max-md:px-0 ${
                      active ? "text-text" : "text-muted hover:bg-white/5 hover:text-text"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="settings-nav"
                        className="absolute inset-0 rounded-lg bg-accent/12"
                        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className={`relative ${active ? "text-accent" : ""}`}>{item.icon}</span>
                    <span className="relative max-md:hidden">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto pb-6">
            <AnimatePresence mode="wait" initial={false}>
              {section === "appearance" && (
                <motion.div
                  key="appearance"
                  className="mx-auto max-w-2xl"
                  variants={rows}
                  initial="hidden"
                  animate="shown"
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.12 } }}
                >
                  <h2 className="px-8 pt-2 pb-4 text-lg font-semibold max-md:px-5">Appearance</h2>
                  <SettingsRow index={0} label="Accent color" hint="One accent carries the whole launcher">
                    <div className="flex items-center gap-2">
                      {(Object.keys(ACCENT_HEX) as Accent[]).map((accent) => {
                        const selected = prefs.accent === accent;
                        return (
                          <button
                            key={accent}
                            type="button"
                            aria-label={`Accent ${accentLabel(accent)}`}
                            aria-pressed={selected}
                            onClick={() => onPref("accent", accent)}
                            className={`flex h-11 w-11 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-[0.96] ${
                              selected ? "ring-2 ring-white/80 ring-offset-2 ring-offset-canvas" : ""
                            }`}
                            style={{ background: ACCENT_HEX[accent] }}
                          >
                            {selected && <Check size={18} weight="bold" className="text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </SettingsRow>
                  <SettingsRow index={1} label="Card size" hint="Game tiles on the home screen">
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
                  <SettingsRow index={2} label="Card spacing" hint="Gap between tiles">
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
                  <SettingsRow index={3} label="Motion" hint="Animation level across the interface">
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
                  <SettingsRow index={4} label="Corner radius" hint="Rounding of cards and panels">
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
                  <SettingsRow index={5} label="Card shadow" hint="Accent glow under the selected card">
                    <Switch
                      label="Card shadow"
                      checked={prefs.cardShadow}
                      onChange={(on) => onPref("cardShadow", on)}
                    />
                  </SettingsRow>
                  <SettingsRow index={6} label="Accent glow haze" hint="Faint corner glow tinted by the accent">
                    <Switch
                      label="Accent glow haze"
                      checked={prefs.accentGlow}
                      onChange={(on) => onPref("accentGlow", on)}
                    />
                  </SettingsRow>
                  {prefs.accentGlow && (
                    <SettingsRow index={7} label="Glow intensity" hint="Strength of the corner glow">
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
                  <SettingsRow index={8} label="Top bar" hint="How the top bar sits over the page">
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
                  <SettingsRow index={9} label="Wordmark" hint="LeonPS5 label in the top bar">
                    <Switch
                      label="Wordmark"
                      checked={prefs.showWordmark}
                      onChange={(on) => onPref("showWordmark", on)}
                    />
                  </SettingsRow>
                </motion.div>
              )}
              {section === "background" && (
                <motion.div
                  key="background"
                  className="mx-auto max-w-2xl"
                  variants={rows}
                  initial="hidden"
                  animate="shown"
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.12 } }}
                >
                  <h2 className="px-8 pt-2 pb-4 text-lg font-semibold max-md:px-5">Background</h2>
                  <SettingsRow index={0} label="Backdrop art" hint="Blurred cover art behind the home screen">
                    <Switch
                      label="Backdrop art"
                      checked={prefs.backdrop}
                      onChange={(on) => onPref("backdrop", on)}
                    />
                  </SettingsRow>
                  {prefs.backdrop && (
                    <>
                      <SettingsRow index={1} label="Backdrop blur" hint="How far the art smears out">
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
                      <SettingsRow index={2} label="Backdrop opacity" hint="How visible the art is">
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
                  <SettingsRow
                    index={3}
                    label="Custom background"
                    hint="A picture URL that overrides the cover art backdrop"
                  >
                    <div className="max-md:w-full">
                      <TextField
                        label="Custom background URL"
                        placeholder="https://example.com/wallpaper.jpg"
                        value={prefs.customBackdrop}
                        error={urlError}
                        onChange={(event) => onPref("customBackdrop", event.target.value.trim())}
                      />
                    </div>
                  </SettingsRow>
                  <SettingsRow index={4} label="Wave lines" hint="Flowing lines behind the rail">
                    <Switch
                      label="Wave lines"
                      checked={prefs.waveOpacity > 0}
                      onChange={(on) => onPref("waveOpacity", on ? 100 : 0)}
                    />
                  </SettingsRow>
                  {prefs.waveOpacity > 0 && (
                    <>
                      <SettingsRow index={5} label="Wave strength" hint="Visibility of the lines">
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
                      <SettingsRow index={6} label="Wave speed" hint="How fast the lines drift">
                        <Slider
                          label="Wave speed"
                          value={prefs.waveSpeed}
                          min={0.25}
                          max={3}
                          step={0.25}
                          onChange={(value) => onPref("waveSpeed", value)}
                          format={(value) => `${value.toFixed(2).replace(/0$/, "")}x`}
                        />
                      </SettingsRow>
                    </>
                  )}
                </motion.div>
              )}
              {section === "sound" && (
                <motion.div
                  key="sound"
                  className="mx-auto max-w-2xl"
                  variants={rows}
                  initial="hidden"
                  animate="shown"
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.12 } }}
                >
                  <h2 className="px-8 pt-2 pb-4 text-lg font-semibold max-md:px-5">Sound</h2>
                  <SettingsRow
                    index={0}
                    label="Ambient music"
                    hint="Generative pad on the home screen that fades during a title"
                  >
                    <Switch
                      label="Ambient music"
                      checked={prefs.music}
                      onChange={(on) => onPref("music", on)}
                    />
                  </SettingsRow>
                  {prefs.music && (
                    <SettingsRow index={1} label="Music volume" hint="How loud the pad plays">
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
                  <SettingsRow index={2} label="UI sounds" hint="Navigation ticks and launch chimes">
                    <Switch
                      label="UI sounds"
                      checked={prefs.sounds}
                      onChange={(on) => onPref("sounds", on)}
                    />
                  </SettingsRow>
                </motion.div>
              )}
              {section === "library" && (
                <motion.div
                  key="library"
                  className="mx-auto max-w-2xl"
                  variants={rows}
                  initial="hidden"
                  animate="shown"
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.12 } }}
                >
                  <h2 className="px-8 pt-2 pb-4 text-lg font-semibold max-md:px-5">Library</h2>
                  <SettingsRow index={0} label="Games directory" hint="Folders here show up as cards">
                    <span className="font-mono text-xs text-muted">{library.gamesDir}</span>
                  </SettingsRow>
                  <div className="px-8 py-5 max-md:px-5">
                    <motion.div
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        shown: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
                      }}
                      className="flex flex-col gap-3"
                    >
                      <TextField
                        label="Change games directory"
                        value={dir}
                        error={dirError}
                        onChange={(event) => setDir(event.target.value)}
                      />
                      <div>
                        <Button
                          loading={saving}
                          disabled={!dir.trim() || dir === library.gamesDir}
                          onClick={changeDir}
                        >
                          {saving ? "Saving" : "Save directory"}
                        </Button>
                      </div>
                    </motion.div>
                  </div>
                  <SettingsRow index={1} label="Copy path" hint="Copies the games directory">
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
                      className="inline-flex min-h-[44px] max-w-full items-center gap-2 rounded-lg bg-white/5 px-2.5 py-2 font-mono text-xs text-text transition-colors hover:bg-white/10 active:scale-[0.98]"
                    >
                      <span className="truncate">{library.gamesDir}</span>
                      {copied ? (
                        <Check size={14} weight="bold" className="text-accent" />
                      ) : (
                        <Copy size={14} weight="bold" className="text-muted" />
                      )}
                    </button>
                  </SettingsRow>
                  <SettingsRow index={2} label="Runner" hint="The leonps5 binary the launcher starts">
                    {library.runnerFound ? (
                      <span className="truncate font-mono text-xs text-text">{library.runnerPath}</span>
                    ) : (
                      <span className="text-xs text-danger">
                        leonps5 not found. Build it or set LEONPS5_RUNNER.
                      </span>
                    )}
                  </SettingsRow>
                  <SettingsRow index={3} label="Runner arguments" hint="Extra flags passed on every launch">
                    <span className="font-mono text-xs text-text">
                      {library.extraArgs.length ? library.extraArgs.join(" ") : "none"}
                    </span>
                  </SettingsRow>
                </motion.div>
              )}
              {section === "about" && (
                <motion.div
                  key="about"
                  className="mx-auto max-w-2xl"
                  variants={rows}
                  initial="hidden"
                  animate="shown"
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.12 } }}
                >
                  <h2 className="px-8 pt-2 pb-4 text-lg font-semibold max-md:px-5">About</h2>
                  <SettingsRow index={0} label="Launcher version">
                    <span className="font-mono text-xs text-text">{library.version}</span>
                  </SettingsRow>
                  <SettingsRow index={1} label="Component gallery" hint="Preview every UI component">
                    <Button variant="ghost" onClick={onGallery}>
                      Open gallery
                    </Button>
                  </SettingsRow>
                  <SettingsRow index={2} label="Source" hint="Where this launcher lives">
                    <a
                      href="https://github.com/loak7993-code/LeonPS5"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 items-center rounded-lg px-1 font-mono text-xs text-text underline decoration-accent/60 underline-offset-4 transition-colors hover:decoration-accent"
                    >
                      loak7993-code/LeonPS5
                    </a>
                  </SettingsRow>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <footer className="flex shrink-0 items-center justify-between gap-3 px-8 py-5 max-md:px-5">
          <Button variant="secondary" icon={<FolderOpen size={16} weight="bold" />} onClick={onOpenFolder}>
            Open folder
          </Button>
          <Button data-autofocus icon={<FolderOpen size={16} weight="bold" />} onClick={onRescan}>
            Rescan library
          </Button>
        </footer>
      </motion.div>
    </motion.div>
  );
}
