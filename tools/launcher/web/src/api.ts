export type Game = {
  id: string;
  folder: string;
  title: string;
  hasIcon: boolean;
  hasPic: boolean;
  lastPlayed: string | null;
  minutes: number;
  launches: number;
  daily: number[];
  running: boolean;
  demo: boolean;
  description: string;
  artUrl?: string;
  showcase?: boolean;
  installed?: boolean;
  genre?: string;
  storeUrl?: string;
};

export type ShowcaseGame = {
  id: string;
  title: string;
  description: string;
  art: string;
  genre: string;
  beta: boolean;
  storeUrl: string;
  installed: boolean;
};

export type Profile = { id: string; name: string };

export type Library = {
  games: Game[];
  showcase: { production: ShowcaseGame[]; beta: ShowcaseGame[] };
  profiles: Profile[];
  activeProfile: string;
  gamesDir: string;
  runnerFound: boolean;
  runnerPath: string | null;
  extraArgs: string[];
  configPath: string;
  suggestions: string[];
  version: string;
};

type ApiError = { error?: unknown };

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!response.ok) {
    const message =
      body && typeof body === "object" && body !== null && "error" in (body as ApiError)
        ? String((body as ApiError).error)
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}

export function loadLibrary(demo: boolean): Promise<Library> {
  return fetch(`/api/games${demo ? "?demo=1" : ""}`).then((r) => parse<Library>(r));
}

export function rescan(demo: boolean): Promise<Library> {
  return fetch(`/api/scan${demo ? "?demo=1" : ""}`, { method: "POST" }).then((r) => parse<Library>(r));
}

export function launchGame(id: string): Promise<{ status: string; command: string }> {
  return fetch("/api/launch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  }).then((r) => parse<{ status: string; command: string }>(r));
}

export type SavedConfig = { gamesDir: string; extraArgs: string[] };

export function saveConfig(payload: {
  gamesDir?: string;
  extraArgs?: string[];
}): Promise<Library & { saved: SavedConfig }> {
  return fetch("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((r) => parse<Library & { saved: SavedConfig }>(r));
}

export function openGamesFolder(): Promise<{ ok: boolean; error?: string }> {
  return fetch("/api/open-folder", { method: "POST" }).then((r) => parse<{ ok: boolean; error?: string }>(r));
}

export function quitLauncher(): Promise<{ ok: boolean }> {
  return fetch("/api/quit", { method: "POST" }).then((r) => parse<{ ok: boolean }>(r));
}

export function iconUrl(id: string): string {
  return `/api/icon/${encodeURIComponent(id)}`;
}

export function picUrl(id: string): string {
  return `/api/pic/${encodeURIComponent(id)}`;
}

export type ProfileAction =
  | { action: "create"; name: string }
  | { action: "switch"; id: string }
  | { action: "rename"; id: string; name: string }
  | { action: "delete"; id: string };

export function profileAction(payload: ProfileAction): Promise<Library> {
  return fetch("/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((r) => parse<Library>(r));
}

export function stopGame(id: string): Promise<{ status: string }> {
  return fetch("/api/stop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  }).then((r) => parse<{ status: string }>(r));
}
