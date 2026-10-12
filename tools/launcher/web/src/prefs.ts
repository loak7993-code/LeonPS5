import { useCallback, useEffect, useState } from "react";

export type Accent = "blue" | "cyan" | "emerald" | "orange" | "red";

export type CardSize = "small" | "medium" | "large";

export type Prefs = {
  accent: Accent;
  cardSize: CardSize;
  motion: "full" | "reduced";
  backdrop: boolean;
  backdropBlur: number;
  backdropOpacity: number;
  music: boolean;
  musicVolume: number;
  cardGap: "compact" | "normal" | "spacious";
  waveSpeed: number;
  glowIntensity: number;
  cornerRadius: number;
  showWordmark: boolean;
  accentGlow: boolean;
  waveOpacity: number;
  cardShadow: boolean;
  topBarStyle: "glass" | "solid" | "transparent";
};

const KEY = "leonps5-launcher-prefs";

const ACCENTS: Record<Accent, string> = {
  blue: "#2f6bff",
  cyan: "#2bb8d6",
  emerald: "#2fb87a",
  orange: "#e08a3c",
  red: "#e0524f",
};

export const CARD_GAPS: Record<Prefs["cardGap"], string> = {
  compact: "10px",
  normal: "18px",
  spacious: "28px",
};

const CARD_WIDTH: Record<CardSize, string> = {
  small: "clamp(128px, 14vw, 176px)",
  medium: "clamp(148px, 17vw, 224px)",
  large: "clamp(176px, 21vw, 288px)",
};

const DEFAULTS: Prefs = {
  accent: "blue",
  cardSize: "medium",
  motion: "full",
  backdrop: true,
  backdropBlur: 64,
  backdropOpacity: 55,
  music: true,
  musicVolume: 40,
  cardGap: "normal",
  waveSpeed: 1,
  glowIntensity: 50,
  cornerRadius: 14,
  showWordmark: true,
  accentGlow: true,
  waveOpacity: 100,
  cardShadow: true,
  topBarStyle: "glass",
};

function read(): Prefs {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    const accent = parsed.accent;
    const cardSize = parsed.cardSize;
    return {
      accent: accent !== undefined && accent in ACCENTS ? (accent as Accent) : DEFAULTS.accent,
      cardSize:
        cardSize !== undefined && cardSize in CARD_WIDTH ? (cardSize as CardSize) : DEFAULTS.cardSize,
      motion: parsed.motion === "reduced" ? "reduced" : "full",
      backdrop: parsed.backdrop !== false,
      backdropBlur:
        typeof parsed.backdropBlur === "number"
          ? Math.max(0, Math.min(96, parsed.backdropBlur))
          : 64,
      backdropOpacity:
        typeof parsed.backdropOpacity === "number"
          ? Math.max(10, Math.min(90, parsed.backdropOpacity))
          : 55,
      music: parsed.music !== false,
      musicVolume:
        typeof parsed.musicVolume === "number"
          ? Math.max(0, Math.min(100, parsed.musicVolume))
          : 40,
      cardGap:
        typeof parsed.cardGap === "string" && parsed.cardGap in CARD_GAPS
          ? (parsed.cardGap as keyof typeof CARD_GAPS)
          : ("normal" as const),
      waveSpeed:
        typeof parsed.waveSpeed === "number"
          ? Math.max(0.25, Math.min(3, parsed.waveSpeed))
          : 1,
      glowIntensity:
        typeof parsed.glowIntensity === "number"
          ? Math.max(0, Math.min(100, parsed.glowIntensity))
          : 50,
      cornerRadius:
        typeof parsed.cornerRadius === "number"
          ? Math.max(0, Math.min(28, parsed.cornerRadius))
          : 14,
      showWordmark: parsed.showWordmark !== false,
      accentGlow: parsed.accentGlow !== false,
      waveOpacity:
        typeof parsed.waveOpacity === "number"
          ? Math.max(0, Math.min(100, parsed.waveOpacity))
          : 100,
      cardShadow: parsed.cardShadow !== false,
      topBarStyle:
        parsed.topBarStyle === "solid" || parsed.topBarStyle === "transparent"
          ? parsed.topBarStyle
          : "glass",
    };
  } catch {
    return DEFAULTS;
  }
}

function apply(prefs: Prefs): void {
  const root = document.documentElement;
  root.style.setProperty("--color-accent", ACCENTS[prefs.accent]);
  root.style.setProperty("--card-w", CARD_WIDTH[prefs.cardSize]);
  root.dataset.motion = prefs.motion;
}

export function usePrefs(): [Prefs, <K extends keyof Prefs>(key: K, value: Prefs[K]) => void] {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    const stored = read();
    setPrefs(stored);
    apply(stored);
  }, []);

  const update = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((current) => {
      const next = { ...current, [key]: value };
      apply(next);
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        return next;
      }
      return next;
    });
  }, []);

  return [prefs, update];
}

export function accentLabel(accent: Accent): string {
  return accent.charAt(0).toUpperCase() + accent.slice(1);
}