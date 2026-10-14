import { FolderOpen, ArrowClockwise, Flask } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Button } from "./ui/Button";
import { EmptyState as Empty } from "./ui/EmptyState";

type EmptyStateProps = {
  gamesDir: string;
  onRescan: () => void;
  onOpenFolder: () => void;
  onDemo: () => void;
};

export function EmptyState({ gamesDir, onRescan, onOpenFolder, onDemo }: EmptyStateProps) {
  return (
    <motion.div
      className="relative z-10 min-h-0 flex-1"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <Empty
        icon={<FolderOpen size={30} weight="bold" />}
        title="No games in the library"
        body={
          <p>
            Drop game folders into
            <span className="ml-1 rounded-lg bg-white/5 px-2 py-1 font-mono text-xs text-text">{gamesDir}</span>
          </p>
        }
        actions={
          <>
            <Button icon={<ArrowClockwise size={16} weight="bold" />} onClick={onRescan}>
              Scan again
            </Button>
            <Button variant="secondary" icon={<FolderOpen size={16} weight="bold" />} onClick={onOpenFolder}>
              Open folder
            </Button>
            <Button variant="ghost" icon={<Flask size={16} weight="bold" />} onClick={onDemo}>
              Browse the showcase
            </Button>
          </>
        }
        note="The showcase lists real PlayStation 5 titles you can browse without installing. A game folder contains sce_module, sce_modules or prx."
      />
    </motion.div>
  );
}