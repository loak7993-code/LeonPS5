import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FolderOpen, Play } from "@phosphor-icons/react";
import { GameArt } from "./Art";
import { iconUrl, type Game } from "./api";
import { relativeTime } from "./data";

const LEAD = 72;

type CardProps = {
  game: Game;
  selected: boolean;
  onSelect: (id: string) => void;
  onActivate: (game: Game) => void;
  radius: number;
  shadow: boolean;
};

const Card = memo(function Card({ game, selected, onSelect, onActivate, radius, shadow }: CardProps) {
  return (
    <motion.button
      type="button"
      aria-label={game.demo ? `${game.title}, demo title` : game.title}
      data-selected={selected ? "true" : undefined}
      onMouseEnter={() => onSelect(game.id)}
      onFocus={() => onSelect(game.id)}
      onClick={() => onActivate(game)}
      style={{ borderRadius: radius }}
      className={`relative aspect-square w-[var(--card-w)] shrink-0 overflow-hidden bg-panel ${
        selected ? (shadow ? "card-selected" : "card-selected-no-glow") : "card-idle"
      }`}
      animate={{ scale: selected ? 1.08 : 1, y: selected ? -6 : 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      {game.hasIcon ? (
        <img src={iconUrl(game.id)} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <GameArt id={game.id} title={game.title} className="absolute inset-0 h-full w-full" />
      )}
    </motion.button>
  );
});

function useCardWidth(railRef: React.RefObject<HTMLDivElement | null>, count: number): number {
  const [cardWidth, setCardWidth] = useState(216);

  useEffect(() => {
    const element = railRef.current?.firstElementChild;
    if (!element) return;
    const observer = new ResizeObserver(() => setCardWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, [railRef, count]);

  return cardWidth;
}

function useInfoAnchor(
  railRef: React.RefObject<HTMLDivElement | null>,
  sectionRef: React.RefObject<HTMLElement | null>,
  enabled: boolean,
  cardWidth: number,
  index: number,
  count: number,
): { top: number; left: number } {
  const [anchor, setAnchor] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!enabled) return;
    const section = sectionRef.current;
    const rail = railRef.current;
    if (!section || !rail) return;
    const update = () => {
      const sectionRect = section.getBoundingClientRect();
      const card = rail.querySelector('[data-selected="true"]') ?? rail.firstElementChild;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      setAnchor({
        top: Math.max(0, rect.bottom - sectionRect.top + 12),
        left: Math.max(0, rect.left - sectionRect.left),
      });
    };
    update();
    let frames = 0;
    let raf = 0;
    const loop = () => {
      update();
      frames += 1;
      if (frames < 40) raf = requestAnimationFrame(loop);
    };
    loop();
    const observer = new ResizeObserver(update);
    observer.observe(rail);
    observer.observe(section);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [railRef, sectionRef, enabled, cardWidth, index, count]);

  return anchor;
}

type RailProps = {
  games: Game[];
  index: number;
  searching: boolean;
  onSelect: (index: number) => void;
  onActivate: (game: Game) => void;
  gap?: number;
  radius?: number;
  shadow?: boolean;
  info?: boolean;
  onPlay?: (game: Game) => void;
  onOpenFolder?: () => void;
};

export function Rail({ games, index, searching, onSelect, onActivate, gap: gapProp, radius: radiusProp, shadow, info = false, onPlay, onOpenFolder }: RailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const GAP = gapProp ?? 18;
  const radius = radiusProp ?? 14;
  const cardWidth = useCardWidth(railRef, games.length);
  const infoAnchor = useInfoAnchor(railRef, sectionRef, info, cardWidth, index, games.length);

  const selectById = useCallback(
    (id: string) => {
      const at = games.findIndex((game) => game.id === id);
      if (at >= 0) onSelect(at);
    },
    [games, onSelect],
  );

  const activate = useCallback((game: Game) => onActivate(game), [onActivate]);

  const selected = games[index] ?? null;
  const step = cardWidth + GAP;
  const offset = Math.max(0, index * step - LEAD);
  const titleX = info ? LEAD : Math.min(LEAD + index * step, LEAD * 2);

  return (
    <section ref={sectionRef} aria-label="Game rail" className="relative min-h-0 flex-1 overflow-x-clip">
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
        <AnimatePresence>
          {selected && !searching && info && (
            <motion.div
              key={selected.id + "-info"}
              className="absolute z-10 pr-6 max-md:pr-3"
              style={{ top: infoAnchor.top, left: infoAnchor.left }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } }}
              exit={{ opacity: 0, y: 8, transition: { duration: 0.14, ease: "easeIn" } }}
            >
              <div className="flex flex-wrap items-center gap-3">
                {selected.demo ? (
                  <div className="inline-flex h-12 items-center rounded-xl bg-white/5 px-5 text-sm text-muted">
                    Sample titles do not launch
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPlay?.(selected)}
                    className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-accent px-6 text-sm font-semibold text-white transition-transform hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <Play size={18} weight="bold" />
                    Play
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenFolder?.()}
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-line px-5 text-sm text-text transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <FolderOpen size={16} weight="bold" />
                  Open folder
                </button>
              </div>
              <p className="mt-3 max-w-prose text-sm leading-relaxed text-text/85 max-md:max-w-[calc(100vw-10.5rem)]">
                {selected.description.trim() ||
                  (selected.demo
                    ? "Sample art only, nothing launches."
                    : "No description yet. Add a README.txt or description.txt to the game folder and rescan.")}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        <div
          className={`absolute inset-x-0 overflow-hidden transition-all duration-200 ease-out ${
            info ? "top-24 bottom-40 max-md:top-20 max-md:bottom-44" : "top-24 bottom-4 max-md:top-20 max-md:bottom-3"
          }`}
        >
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
                  onSelect={selectById}
                  onActivate={activate}
                  radius={radius}
                  shadow={shadow ?? true}
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