import { motion } from "motion/react";
import { ArrowLeft, FolderOpen, Play, Info } from "@phosphor-icons/react";
import { GameArt } from "../Art";
import { iconUrl, type Game } from "../api";
import { Badge } from "../ui/Badge";
import { IconButton } from "../ui/IconButton";
import { relativeTime } from "../data";

type GamePageProps = {
  game: Game;
  onClose: () => void;
  onPlay: (game: Game) => void;
  onOpenFolder: () => void;
};

export function GamePage({ game, onClose, onPlay, onOpenFolder }: GamePageProps) {
  const description = game.description.trim();
  const playable = !game.demo;
  return (
    <motion.div
      className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-canvas"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className="sticky top-0 z-10 flex shrink-0 items-center gap-4 border-b border-line bg-canvas/90 px-6 py-4 backdrop-blur max-md:px-4">
        <IconButton label="Back" onClick={onClose}>
          <ArrowLeft size={20} weight="bold" />
        </IconButton>
        <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight">{game.title}</h1>
        {game.demo && <Badge className="shrink-0">Sample</Badge>}
      </header>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-8 px-8 py-8 max-md:px-4">
        <div className="flex flex-col gap-8 md:flex-row">
          <motion.div
            className="relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl bg-panel md:w-72"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {game.hasIcon ? (
              <img
                src={iconUrl(game.id)}
                alt={`${game.title} art`}
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <GameArt id={game.id} title={game.title} className="absolute inset-0 h-full w-full" />
            )}
          </motion.div>
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="text-3xl font-semibold tracking-tight max-md:text-2xl">{game.title}</p>
            <p className="mt-2 font-mono text-xs text-muted">
              {game.folder} · {relativeTime(game.lastPlayed)}
            </p>
            <div className="mt-6 min-w-0">
              {description ? (
                <p className="max-w-prose text-sm leading-relaxed text-text/90">{description}</p>
              ) : game.demo ? (
                <p className="max-w-prose text-sm leading-relaxed text-text/90">
                  Sample title. Sample art only, nothing launches.
                </p>
              ) : (
                <div className="flex max-w-prose items-center gap-3 rounded-lg bg-white/5 px-4 py-3 text-sm text-muted">
                  <Info size={18} weight="bold" className="shrink-0 text-muted" />
                  <span>
                    No description yet. Add a README.txt or description.txt to the game folder and rescan.
                  </span>
                </div>
              )}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {playable && (
                <button
                  type="button"
                  onClick={() => onPlay(game)}
                  className="inline-flex h-14 items-center gap-3 rounded-xl bg-accent px-8 text-base font-semibold text-white transition-transform hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Play size={20} weight="bold" />
                  Play
                </button>
              )}
              {game.demo && (
                <div className="inline-flex h-14 items-center rounded-xl bg-white/5 px-6 text-sm text-muted">
                  Sample titles do not launch
                </div>
              )}
              <button
                type="button"
                onClick={onOpenFolder}
                className="inline-flex h-14 items-center gap-2 rounded-xl border border-line px-6 text-sm text-text transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <FolderOpen size={18} weight="bold" />
                Open folder
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
