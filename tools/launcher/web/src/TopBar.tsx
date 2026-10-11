import { MagnifyingGlass, SquaresFour, GearSix, Power } from "@phosphor-icons/react";
import { forwardRef } from "react";

type TopBarProps = {
  index: number;
  searching: boolean;
  query: string;
  onIndex: (index: number) => void;
  onSearchToggle: () => void;
  onQuery: (query: string) => void;
  onSearchExit: () => void;
  onGrid: () => void;
  onSettings: () => void;
  onAbout: () => void;
  onPower: () => void;
};

type Item = { key: string; label: string };

const ITEMS: Item[] = [
  { key: "search", label: "Search" },
  { key: "grid", label: "All games" },
  { key: "settings", label: "Settings" },
  { key: "about", label: "About" },
  { key: "power", label: "Power" },
];

function topClasses(selected: boolean): string {
  return `flex h-10 items-center gap-2 rounded-full px-4 text-sm transition-colors ${
    selected ? "bg-white/10 text-text" : "text-muted hover:text-text"
  }`;
}

export const TopBar = forwardRef<HTMLInputElement, TopBarProps>(function TopBar(
  {
    index,
    searching,
    query,
    onIndex,
    onSearchToggle,
    onQuery,
    onSearchExit,
    onGrid,
    onSettings,
    onAbout,
    onPower,
  },
  searchRef,
) {
  const actions = [onSearchToggle, onGrid, onSettings, onAbout, onPower];
  return (
    <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-6 pt-5 max-md:px-4">
      <div className="flex items-center gap-2">
        <div className="mr-2 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 font-mono text-sm font-bold text-accent">
          L5
        </div>
        {searching ? (
          <input
            ref={searchRef}
            type="text"
            value={query}
            placeholder="Search games"
            aria-label="Search games"
            onChange={(event) => onQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" || event.key === "Enter") {
                event.stopPropagation();
                onSearchExit();
              }
            }}
            onBlur={() => onSearchExit()}
            className="h-10 w-64 max-md:w-44 rounded-full bg-white/10 px-4 text-sm text-text placeholder:text-muted/70 focus:outline-none"
          />
        ) : (
          ITEMS.map((item, position) => (
            <button
              key={item.key}
              type="button"
              data-focus-row="0"
              className={topClasses(index === position)}
              onMouseEnter={() => onIndex(position)}
              onFocus={() => onIndex(position)}
              onClick={() => actions[position]()}
            >
              {item.key === "search" && <MagnifyingGlass size={18} weight="bold" />}
              {item.key === "grid" && <SquaresFour size={18} weight="bold" />}
              {item.key === "settings" && <GearSix size={18} weight="bold" />}
              {item.key === "about" && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent font-mono text-[11px] font-bold text-white">L</span>}
              {item.key === "power" && <Power size={18} weight="bold" />}
              <span className="max-lg:hidden">{item.label}</span>
            </button>
          ))
        )}
      </div>
      <div className="font-mono text-xs text-muted/70 max-lg:hidden">LeonPS5</div>
    </header>
  );
});
