import { Check } from "@phosphor-icons/react";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { IconButton } from "../ui/IconButton";

type AboutSheetProps = { onClose: () => void; onGallery: () => void };

export function AboutSheet({ onClose, onGallery }: AboutSheetProps) {
  return (
    <Dialog open onClose={onClose} title="About">
      <div className="space-y-4 px-6 py-5 text-sm leading-relaxed text-muted">
        <p>
          LeonPS5 launcher is the home screen of the LeonPS5 project. It scans a games directory,
          shows every title as a card and hands the selected folder to the leonps5 runner.
        </p>
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-xs">
          <kbd className="justify-self-center rounded-md border border-line bg-white/5 px-2 py-1 font-mono text-text">Arrows</kbd>
          <span>Navigate rows and cards</span>
          <kbd className="justify-self-center rounded-md border border-line bg-white/5 px-2 py-1 font-mono text-text">Enter</kbd>
          <span>Start the selected title</span>
          <kbd className="justify-self-center rounded-md border border-line bg-white/5 px-2 py-1 font-mono text-text">Esc</kbd>
          <span>Close panels and overlays</span>
          <kbd className="justify-self-center rounded-md border border-line bg-white/5 px-2 py-1 font-mono text-text">Gamepad</kbd>
          <span>D-pad or left stick, cross to start, circle to go back</span>
        </div>
        <p className="font-mono text-xs">
          <a href="https://github.com/loak7993-code/LeonPS5" className="text-accent underline-offset-4 hover:underline">
            github.com/loak7993-code/LeonPS5
          </a>
        </p>
      </div>
      <div className="flex justify-between border-t border-line px-6 py-4">
        <Button variant="ghost" onClick={onGallery}>
          Component gallery
        </Button>
        <IconButton label="Close" onClick={onClose} className="self-center">
          <Check size={18} weight="bold" />
        </IconButton>
      </div>
    </Dialog>
  );
}

type PowerSheetProps = { onClose: () => void; onQuit: () => void };

export function PowerSheet({ onClose, onQuit }: PowerSheetProps) {
  return (
    <Dialog open onClose={onClose} title="Power">
      <div className="px-6 py-5">
        <p className="text-sm text-muted">
          Quitting stops the launcher server on this machine. Any title the runner is still
          processing keeps running in the background.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onQuit}>
            Quit launcher
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
