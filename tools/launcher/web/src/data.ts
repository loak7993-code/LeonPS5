export type SortMode = "recent" | "alpha";

export function sortGames<T extends { title: string; lastPlayed: string | null }>(
  games: T[],
  mode: SortMode,
): T[] {
  const list = [...games];
  if (mode === "alpha") {
    list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }
  list.sort((a, b) => {
    const at = a.lastPlayed ? Date.parse(a.lastPlayed) : Number.NEGATIVE_INFINITY;
    const bt = b.lastPlayed ? Date.parse(b.lastPlayed) : Number.NEGATIVE_INFINITY;
    if (at !== bt) return bt - at;
    return a.title.localeCompare(b.title);
  });
  return list;
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "Never played";
  const stamp = Date.parse(iso);
  if (Number.isNaN(stamp)) return "Never played";
  const seconds = Math.max(0, Math.floor((Date.now() - stamp) / 1000));
  if (seconds < 60) return "Played just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Played ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Played ${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Played ${days} d ago`;
  return `Played ${Math.floor(days / 30)} mo ago`;
}
