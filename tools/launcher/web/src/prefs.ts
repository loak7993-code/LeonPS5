import { useCallback, useEffect, useState } from "react";

export type Accent = "blue" | "cyan" | "emerald" | "orange" | "red";

export type CardSize = "small" | "medium" | "large";

export type Prefs = {
  accent: Accent;
  cardSize: CardSize;
  motion: "full" | "reduced";
  backdrop: boolean;
  music: boolean;
};

const KEY = "leonps5-launcher-prefs";

const ACCENTS: Record<Accent, string> = {
  blue: "#2f6bff",
  cyan: "#2bb8d6",
  emerald: "#2fb87a",
  orange: "#e08a3c",
  red: "#e0524f",
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
  music: true,
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
      music: parsed.music !== false,
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