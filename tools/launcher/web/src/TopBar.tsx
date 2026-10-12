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
        <svg className="mr-2 h-9 w-9" viewBox="0 0 512 512" aria-label="LeonPS5">
          <defs>
            <linearGradient id="tile-navy" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#12225e"/>
              <stop offset="0.55" stopColor="#0a1338"/>
              <stop offset="1" stopColor="#070b1c"/>
            </linearGradient>
            <linearGradient id="tile-wave" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#2f6bff" stopOpacity="0"/>
              <stop offset="0.25" stopColor="#2f6bff"/>
              <stop offset="0.75" stopColor="#3fa9c9"/>
              <stop offset="1" stopColor="#3fa9c9" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <rect width="512" height="512" rx="88" fill="url(#tile-navy)"/>
          <path d="M -20 330 C 120 260 220 400 380 310 S 520 250 540 290" fill="none" stroke="url(#tile-wave)" strokeWidth="14" opacity="0.8"/>
          <path d="M -20 380 C 130 320 240 450 400 365 S 520 310 540 345" fill="none" stroke="url(#tile-wave)" strokeWidth="7" opacity="0.45"/>
          <path d="M 150 108 V 366 H 255" fill="none" stroke="#F4F6FF" strokeWidth="38" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M 412 108 H 258 V 244 H 412 V 366 H 258" fill="none" stroke="#F4F6FF" strokeWidth="38" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
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
