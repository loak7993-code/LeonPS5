export type Game = {
  id: string;
  folder: string;
  title: string;
  hasIcon: boolean;
  lastPlayed: string | null;
  demo: boolean;
};

export type Library = {
  games: Game[];
  gamesDir: string;
  runnerFound: boolean;
  runnerPath: string | null;
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

export function openGamesFolder(): Promise<{ ok: boolean; error?: string }> {
  return fetch("/api/open-folder", { method: "POST" }).then((r) => parse<{ ok: boolean; error?: string }>(r));
}

export function quitLauncher(): Promise<{ ok: boolean }> {
  return fetch("/api/quit", { method: "POST" }).then((r) => parse<{ ok: boolean }>(r));
}

export function iconUrl(id: string): string {
  return `/api/icon/${encodeURIComponent(id)}`;
}
