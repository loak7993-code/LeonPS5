import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FolderOpen, Play, Stop, Storefront, Tag } from "@phosphor-icons/react";
import { GameArt } from "./Art";
import { iconUrl, picUrl, type Game } from "./api";
import { relativeTime } from "./data";
import { PopValue } from "./ui/motion";

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
      aria-label={game.title}
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
      {game.artUrl ? (
        <img src={game.artUrl} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      ) : game.hasIcon ? (
        <img src={iconUrl(game.id)} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <GameArt id={game.id} title={game.title} className="absolute inset-0 h-full w-full" />
      )}
      {game.running && (
        <span aria-label="Running now" className="absolute bottom-2 right-2 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-accent ring-2 ring-black/50" />
        </span>
      )}
    </motion.button>
  );
});

function PlayStats({ game }: { game: Game }) {
  if (game.launches === 0 && game.minutes <= 0) return null;
  const total =
    game.minutes >= 120 ? `${(Math.round((game.minutes / 60) * 10) / 10).toFixed(1)} h` : `${Math.round(game.minutes)} min`;
  const peak = Math.max(...game.daily, 0.5);
  return (
    <div className="mt-4 flex items-end gap-5">
      <div>
        <PopValue value={total} className="font-mono text-sm font-semibold text-text" />
        <div className="text-[11px] text-muted">played</div>
      </div>
      <div>
        <PopValue value={String(game.launches)} className="font-mono text-sm font-semibold text-text" />
        <div className="text-[11px] text-muted">launches</div>
      </div>
      <div className="flex h-8 items-end gap-[3px]" role="img" aria-label="Play time over the last seven days">
        {game.daily.map((minutes, index) => (
          <div
            key={index}
            className="w-[7px] rounded-[2px] bg-accent/75"
            style={{ height: `${Math.max(3, Math.round((minutes / peak) * 100))}%` }}
          />
        ))}
      </div>
      <div className="pb-0.5 text-[11px] text-muted">7 days</div>
    </div>
  );
}

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
  onStop?: (game: Game) => void;
  onOpenFolder?: () => void;
};

export function Rail({ games, index, searching, onSelect, onActivate, gap: gapProp, radius: radiusProp, shadow, info = false, onPlay, onStop, onOpenFolder }: RailProps) {
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
                {selected.showcase
                  ? `${selected.genre || "Showcase"} · not installed`
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
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.24, ease: [0.2, 0, 0, 1] } }}
              exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.14, ease: "easeIn" } }}
            >
              <div className="relative w-[min(560px,calc(100vw-9rem))] max-md:w-[calc(100vw-7.5rem)] overflow-hidden rounded-[18px] border border-white/10 bg-panel/60 backdrop-blur-md">
                <div aria-hidden className="absolute inset-0">
                  {selected.artUrl ? (
                    <img
                      src={selected.artUrl}
                      alt=""
                      draggable={false}
                      className="h-full w-full object-cover opacity-55"
                    />
                  ) : selected.hasPic ? (
                    <img
                      src={picUrl(selected.id)}
                      alt=""
                      draggable={false}
                      className="h-full w-full object-cover opacity-55"
                    />
                  ) : selected.hasIcon ? (
                    <img
                      src={iconUrl(selected.id)}
                      alt=""
                      draggable={false}
                      className="h-full w-full scale-110 object-cover opacity-30"
                      style={{ filter: "blur(14px) saturate(1.2)" }}
                    />
                  ) : (
                    <GameArt id={selected.id} title={selected.title} className="h-full w-full opacity-40" />
                  )}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(5,8,20,0.6) 0%, rgba(5,8,20,0.28) 36%, rgba(5,8,20,0.9) 100%)",
                    }}
                  />
                </div>
                <div className="relative p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    {selected.showcase && !selected.installed ? null : selected.running ? (
                      <button
                        type="button"
                        onClick={() => onStop?.(selected)}
                        className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-danger px-6 text-sm font-semibold text-canvas transition-transform hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key="stop"
                            className="inline-flex items-center gap-2.5"
                            initial={{ opacity: 0, filter: "blur(4px)" }}
                            animate={{ opacity: 1, filter: "blur(0px)" }}
                            exit={{ opacity: 0, filter: "blur(4px)" }}
                            transition={{ duration: 0.14 }}
                          >
                            <Stop size={18} weight="bold" />
                            Stop
                          </motion.span>
                        </AnimatePresence>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onPlay?.(selected)}
                        className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-accent px-6 text-sm font-semibold text-white transition-transform hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key="play"
                            className="inline-flex items-center gap-2.5"
                            initial={{ opacity: 0, filter: "blur(4px)" }}
                            animate={{ opacity: 1, filter: "blur(0px)" }}
                            exit={{ opacity: 0, filter: "blur(4px)" }}
                            transition={{ duration: 0.14 }}
                          >
                            <Play size={18} weight="bold" />
                            Play
                          </motion.span>
                        </AnimatePresence>
                      </button>
                    )}
                    {!selected.showcase && (
                      <button
                        type="button"
                        onClick={() => onOpenFolder?.()}
                        className="inline-flex h-12 items-center gap-2 rounded-xl border border-line bg-black/20 px-5 text-sm text-text transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        <FolderOpen size={16} weight="bold" />
                        Open folder
                      </button>
                    )}
                    {selected.showcase && selected.installed && (
                      <button
                        type="button"
                        onClick={() => onPlay?.(selected)}
                        className="inline-flex h-12 items-center gap-2 rounded-xl border border-line bg-black/20 px-5 text-sm text-text transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        <Play size={16} weight="bold" />
                        Play installed copy
                      </button>
                    )}
                  </div>
                  {selected.showcase && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {selected.genre && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] text-text/90">
                          <Tag size={11} weight="bold" />
                          {selected.genre}
                        </span>
                      )}
                      {selected.showcase && !selected.installed && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-muted">
                          Not installed · browse only
                        </span>
                      )}
                      {selected.storeUrl && (
                        <a
                          href={selected.storeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] text-text/90 transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                          <Storefront size={11} weight="bold" />
                          PlayStation Store
                        </a>
                      )}
                    </div>
                  )}
                  <p className="mt-3 max-w-prose text-sm leading-relaxed text-text/90">
                    {selected.description.trim() ||
                      (selected.showcase
                        ? "No store description available."
                        : "No description yet. Add a README.txt or description.txt to the game folder and rescan.")}
                  </p>
                  {!selected.showcase && <PlayStats game={selected} />}
                </div>
              </div>
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