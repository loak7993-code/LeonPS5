import { ArrowsDownUp, Flask, FolderOpen, Info } from "@phosphor-icons/react";
import type { SortMode } from "./data";

type BottomBarProps = {
  index: number;
  sort: SortMode;
  demo: boolean;
  onIndex: (index: number) => void;
  onSort: () => void;
  onDemo: () => void;
  onOpenFolder: () => void;
  onAbout: () => void;
};

const LABELS = (sort: SortMode, demo: boolean): string[] => [
  sort === "recent" ? "Recent" : "A to Z",
  demo ? "Beta on" : "Beta off",
  "Open folder",
  "About",
];

export function BottomBar({ index, sort, demo, onIndex, onSort, onDemo, onOpenFolder, onAbout }: BottomBarProps) {
  const actions = [onSort, onDemo, onOpenFolder, onAbout];
  const labels = LABELS(sort, demo);
  return (
    <nav aria-label="Launcher actions" className="relative z-10 flex shrink-0 items-end justify-center gap-2 px-6 pb-6 max-md:px-3">
      {labels.map((label, position) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          onMouseEnter={() => onIndex(position)}
          onFocus={() => onIndex(position)}
          onClick={() => actions[position]()}
          className={`flex w-24 flex-col items-center gap-2 rounded-2xl py-3 transition-colors max-md:w-20 ${
            index === position ? "bg-white/8" : "hover:bg-white/5"
          }`}
        >
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              position === 1 && demo ? "bg-accent/25 text-accent" : "bg-white/10 text-text"
            }`}
          >
            {position === 0 && <ArrowsDownUp size={20} weight="bold" />}
            {position === 1 && <Flask size={20} weight="bold" />}
            {position === 2 && <FolderOpen size={20} weight="bold" />}
            {position === 3 && <Info size={20} weight="bold" />}
          </span>
          <span className={`text-[11px] ${index === position ? "text-text" : "text-muted"}`}>{label}</span>
        </button>
      ))}
    </nav>
  );
}
