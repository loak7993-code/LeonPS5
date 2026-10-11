import { useCallback, useMemo, useState } from "react";
import type { Game, Library } from "../api";
import { sortGames, type SortMode } from "../data";

export type LibraryFilter = {
  filtered: Game[];
  query: string;
  setQuery: (query: string) => void;
  sort: SortMode;
  toggleSort: () => void;
};

export function useLibraryFilter(library: Library | null): LibraryFilter {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");

  const games = useMemo(() => (library ? library.games : []), [library]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? games.filter(
          (game) =>
            game.title.toLowerCase().includes(needle) || game.folder.toLowerCase().includes(needle),
        )
      : games;
    return sortGames(list, sort);
  }, [games, query, sort]);

  const toggleSort = useCallback(() => {
    setSort((mode) => (mode === "recent" ? "alpha" : "recent"));
  }, []);

  return { filtered, query, setQuery, sort, toggleSort };
}
