import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { GameArt } from "./Art";
import { iconUrl, type Game } from "./api";
import { relativeTime } from "./data";

const GAP = 18;
const LEAD = 72;

type RailProps = {
  games: Game[];
  index: number;
  searching: boolean;
  onSelect: (index: number) => void;
  onActivate: (game: Game) => void;
};

function Card({
  game,
  selected,
  onSelect,
  onActivate,
}: {
  game: Game;
  selected: boolean;
  onSelect: () => void;
  onActivate: () => void;
}) {
  return (
    <motion.button
      type="button"
      aria-label={game.demo ? `${game.title}, demo title` : game.title}
      onMouseEnter={onSelect}
      onFocus={onSelect}
      onClick={onActivate}
      className={`relative aspect-square w-[var(--card-w)] shrink-0 overflow-hidden rounded-[14px] bg-panel ${
        selected ? "card-selected" : "shadow-[0_0_0_1px_rgba(151,163,224,0.12)]"
      }`}
      animate={{ scale: selected ? 1.08 : 1, y: selected ? -6 : 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      {game.hasIcon ? (
        <img
          src={iconUrl(game.id)}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <GameArt id={game.id} title={game.title} className="absolute inset-0 h-full w-full" />
      )}
    </motion.button>
  );
}

export function Rail({ games, index, searching, onSelect, onActivate }: RailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(216);

  useEffect(() => {
    const element = railRef.current?.firstElementChild;
    if (!element) return;
    const observer = new ResizeObserver(() => setCardWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, [games.length]);

  const selected = games[index] ?? null;
  const step = cardWidth + GAP;
  const offset = Math.max(0, index * step - LEAD);
  const titleX = Math.min(LEAD + index * step, LEAD * 2);

  return (
    <section aria-label="Game rail" className="relative min-h-0 flex-1">
      <div className="relative z-10 h-full">
        <AnimatePresence mode="wait">
          {selected && !searching && (
            <motion.div
              key={selected.id}
              className="absolute left-0 top-1 w-[calc(100%-2rem)]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, x: titleX, transition: { duration: 0.16, ease: "easeOut" } }}
              exit={{ opacity: 0, y: 6, transition: { duration: 0.12, ease: "easeIn" } }}
            >
              <h1 className="truncate text-[30px] font-semibold tracking-tight max-md:text-[22px]">
                {selected.title}
              </h1>
              <p className="mt-1 truncate font-mono text-xs text-muted">
                {selected.demo
                  ? "Demo title · samples only, nothing launches"
                  : `${selected.folder} · ${relativeTime(selected.lastPlayed)}`}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute inset-x-0 bottom-4 top-24 overflow-hidden max-md:top-20">
          {games.length > 0 ? (
            <motion.div
              ref={railRef}
              className="flex h-full items-center will-change-transform"
              style={{ gap: GAP, paddingLeft: LEAD }}
              animate={{ x: -offset }}
              transition={{ type: "spring", stiffness: 230, damping: 28 }}
            >
              {games.map((game, position) => (
                <Card
                  key={game.id}
                  game={game}
                  selected={position === index && !searching}
                  onSelect={() => onSelect(position)}
                  onActivate={() => onActivate(game)}
                />
              ))}
            </motion.div>
          ) : (
            <motion.p
              className="flex h-full items-center text-sm text-muted"
              style={{ paddingLeft: LEAD }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              No titles match the search
            </motion.p>
          )}
        </div>
      </div>
    </section>
  );
}
