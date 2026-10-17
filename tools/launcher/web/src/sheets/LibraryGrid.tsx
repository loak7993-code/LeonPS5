import { useEffect, useMemo, useRef } from "react";
import { GameArt } from "../Art";
import { iconUrl, type Game } from "../api";
import { Dialog } from "../ui/Dialog";

type GridSheetProps = {
  games: Game[];
  index: number;
  onIndex: (index: number) => void;
  onActivate: (game: Game) => void;
  onClose: () => void;
};

export function GridSheet({ games, index, onIndex, onActivate, onClose }: GridSheetProps) {
  const selectedRef = useRef<HTMLButtonElement>(null);
  const columns = useMemo(
    () => Math.max(1, Math.floor((typeof window === "undefined" ? 1280 : window.innerWidth - 96) / 174)),
    [],
  );

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [index]);

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key === "ArrowLeft") onIndex(Math.max(0, index - 1));
      else if (event.key === "ArrowRight") onIndex(Math.min(games.length - 1, index + 1));
      else if (event.key === "ArrowUp") onIndex(Math.max(0, index - columns));
      else if (event.key === "ArrowDown") onIndex(Math.min(games.length - 1, index + columns));
      else if (event.key === "Enter" && games[index]) onActivate(games[index]);
      else if (event.key === "Escape") onClose();
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, columns, games, onIndex, onActivate, onClose]);

  return (
    <Dialog
      open
      onClose={onClose}
      wide
      title={`Library · ${games.length} ${games.length === 1 ? "title" : "titles"}`}
    >
      <div className="max-h-[62vh] overflow-y-auto p-6">
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(158px, 1fr))" }}>
          {games.map((game, position) => (
            <button
              key={game.id}
              ref={position === index ? selectedRef : undefined}
              type="button"
              onMouseEnter={() => onIndex(position)}
              onFocus={() => onIndex(position)}
              onClick={() => onActivate(game)}
              className="flex flex-col gap-2 rounded-xl p-1 text-left transition-colors"
            >
              <span
                className={`relative block aspect-square w-full overflow-hidden rounded-xl bg-panel2 ${
                  position === index
                    ? "shadow-[0_0_0_2px_rgba(255,255,255,0.88)]"
                    : "shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
                }`}
              >
                {game.hasIcon ? (
                  <img src={iconUrl(game.id)} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <GameArt id={game.id} title={game.title} className="absolute inset-0 h-full w-full" />
                )}
              </span>
              <span className={`truncate text-xs ${position === index ? "text-text" : "text-muted"}`}>{game.title}</span>
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
