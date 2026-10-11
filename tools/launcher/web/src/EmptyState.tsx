import { FolderOpen, ArrowClockwise, Flask } from "@phosphor-icons/react";
import { motion } from "motion/react";

type EmptyStateProps = {
  gamesDir: string;
  onRescan: () => void;
  onOpenFolder: () => void;
  onDemo: () => void;
};

export function EmptyState({ gamesDir, onRescan, onOpenFolder, onDemo }: EmptyStateProps) {
  return (
    <motion.div
      className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 text-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/12">
        <FolderOpen size={30} weight="bold" className="text-accent" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold">No games in the library</h1>
        <p className="mt-2 text-sm text-muted">
          Drop game folders into
          <span className="ml-1 rounded-lg bg-white/5 px-2 py-1 font-mono text-xs text-text">{gamesDir}</span>
        </p>
        <p className="mt-1 text-xs text-muted/80">
          A game folder contains sce_module, sce_modules or prx.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRescan}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-medium text-white transition-transform hover:brightness-110 active:scale-[0.98]"
        >
          <ArrowClockwise size={16} weight="bold" />
          Scan again
        </button>
        <button
          type="button"
          onClick={onOpenFolder}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-line px-5 text-sm text-text transition-colors hover:bg-white/5"
        >
          <FolderOpen size={16} weight="bold" />
          Open folder
        </button>
        <button
          type="button"
          onClick={onDemo}
          className="inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm text-muted transition-colors hover:text-text"
        >
          <Flask size={16} weight="bold" />
          View demo titles
        </button>
      </div>
      <p className="text-xs text-muted/60">Demo titles are launcher samples, not your games.</p>
    </motion.div>
  );
}
