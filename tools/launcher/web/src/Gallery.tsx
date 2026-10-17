import { useState } from "react";
import { motion } from "motion/react";
import {
  ArrowClockwise,
  Download,
  FolderOpen,
  HardDrive,
  PencilSimple,
  TrashSimple,
} from "@phosphor-icons/react";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";
import { EmptyState as Empty } from "./ui/EmptyState";
import { IconButton } from "./ui/IconButton";
import { Progress } from "./ui/Progress";
import { Segmented } from "./ui/Segmented";
import { Skeleton, SkeletonRegion } from "./ui/Skeleton";
import { Spinner } from "./ui/Spinner";
import { Switch } from "./ui/Switch";
import { TextField } from "./ui/TextField";
import { useToast } from "./ui/Toaster";

function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={title.replace(/\s+/g, "-").toLowerCase()} className="border-b border-line py-8">
      <h2 id={title.replace(/\s+/g, "-").toLowerCase()} className="text-lg font-semibold">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted">{note}</p>
      <div className="mt-5 flex flex-wrap items-start gap-x-10 gap-y-6">{children}</div>
    </section>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[11px] text-muted/80">{label}</span>
      {children}
    </div>
  );
}

function GalleryBody() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [size, setSize] = useState<"small" | "medium">("medium");
  const [wifi, setWifi] = useState(true);
  const [loading, setLoading] = useState(false);

  const validate = (): void => {
    const valid = /.+@.+\..+/.test(email);
    setEmailError(valid ? null : "Enter an address like name@example.com");
    if (valid) toast("Saved");
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Component gallery</h1>
          <p className="mt-1 text-sm text-muted">
            Every primitive in the launcher UI kit with its states. Keyboard, screen reader and
            reduced-motion safe.
          </p>
        </div>
        <Button variant="secondary" onClick={() => window.location.assign("/")}>
          Back to home
        </Button>
      </header>

      <Section title="Button" note="Variants primary, secondary, ghost, danger. loading keeps width, sets aria-busy and blocks input. Focus shows a visible ring.">
        <Cell label="primary">
          <Button onClick={() => toast("Started")}>Start</Button>
        </Cell>
        <Cell label="secondary">
          <Button variant="secondary" icon={<FolderOpen size={16} weight="bold" />}>
            Open folder
          </Button>
        </Cell>
        <Cell label="ghost">
          <Button variant="ghost" onClick={() => toast("Skipped")}>
            Skip
          </Button>
        </Cell>
        <Cell label="danger">
          <Button variant="danger" icon={<TrashSimple size={16} weight="bold" />}>
            Remove
          </Button>
        </Cell>
        <Cell label="loading">
          <Button loading onClick={() => undefined}>
            Starting
          </Button>
        </Cell>
        <Cell label="disabled">
          <Button disabled>Unavailable</Button>
        </Cell>
        <Cell label="async demo">
          <Button
            loading={loading}
            icon={<Download size={16} weight="bold" />}
            onClick={() => {
              setLoading(true);
              window.setTimeout(() => {
                setLoading(false);
                toast("Done");
              }, 1500);
            }}
          >
            {loading ? "Working" : "Run task"}
          </Button>
        </Cell>
      </Section>

      <Section title="Icon button" note="Icon-only actions require a label. It becomes the accessible name and the tooltip.">
        <Cell label="neutral">
          <IconButton label="Rescan" onClick={() => toast("Rescanning")}>
            <ArrowClockwise size={18} weight="bold" />
          </IconButton>
        </Cell>
        <Cell label="danger">
          <IconButton label="Delete" tone="danger" onClick={() => toast("Nothing was deleted")}>
            <TrashSimple size={18} weight="bold" />
          </IconButton>
        </Cell>
      </Section>

      <Section title="Segmented" note="A radiogroup. Arrow keys move and select, Home and End jump, only the selected option is in the tab order.">
        <Cell label="controlled">
          <Segmented
            label="Card size"
            value={size}
            onChange={setSize}
            options={[
              { value: "small", label: "S" },
              { value: "medium", label: "M" },
            ]}
          />
        </Cell>
      </Section>

      <Section title="Switch" note="role=switch with aria-checked. Space and Enter toggle, the state change is announced.">
        <Cell label="checked">
          <Switch label="Wi-Fi" checked={wifi} onChange={setWifi} />
        </Cell>
        <Cell label="state">
          <span className="text-sm text-muted">{wifi ? "On" : "Off"}</span>
        </Cell>
      </Section>

      <Section title="Text field" note="Label is required, hints and errors are wired with aria-describedby, errors set aria-invalid and are announced.">
        <div className="flex w-full max-w-md flex-col gap-5">
          <Cell label="with hint">
            <TextField
              label="Games directory"
              placeholder="/home/you/Games/LeonPS5"
              hint="A game folder contains sce_module, sce_modules or prx."
            />
          </Cell>
          <Cell label="with error">
            <TextField
              label="Email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError(null);
              }}
              onBlur={validate}
              error={emailError}
              placeholder="name@example.com"
            />
          </Cell>
          <Button variant="secondary" onClick={validate}>
            Validate
          </Button>
        </div>
      </Section>

      <Section title="Dialog" note="Focus is trapped and restored, Escape closes, the backdrop is a labeled button, content is aria-modal.">
        <Cell label="info dialog">
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Open dialog
          </Button>
        </Cell>
        <Cell label="confirm dialog">
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Open confirm
          </Button>
        </Cell>
      </Section>

      <Section title="Toasts" note="A polite live region for info, assertive for errors. At most three visible, auto dismiss, manual dismiss for screen reader and pointer users.">
        <Cell label="info">
          <Button variant="secondary" onClick={() => toast("Library scanned: 12 titles")}>
            Fire info toast
          </Button>
        </Cell>
        <Cell label="error">
          <Button variant="secondary" onClick={() => toast("Runner not found", "error")}>
            Fire error toast
          </Button>
        </Cell>
      </Section>

      <Section title="Loading" note="Skeletons shimmer for regions that will fill in, Spinner carries an optional sr-only label, Progress is indeterminate or valued. All collapse under reduced motion.">
        <div className="flex w-full flex-col gap-6">
          <Cell label="skeleton region">
            <SkeletonRegion className="flex gap-3">
              <Skeleton className="h-20 w-20 rounded-xl" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
            </SkeletonRegion>
          </Cell>
          <Cell label="spinner with label">
            <Spinner label="Loading library" />
          </Cell>
          <Cell label="indeterminate">
            <Progress label="Starting title" className="max-w-sm" />
          </Cell>
          <Cell label="64 percent">
            <Progress label="Conversion progress" value={64} className="max-w-sm" />
          </Cell>
        </div>
      </Section>

      <Section title="Badge and empty state" note="Badges are status pills. The empty state names the next action and every action works.">
        <Cell label="tones">
          <div className="flex gap-2">
            <Badge>Neutral</Badge>
            <Badge tone="accent">Ready</Badge>
            <Badge tone="success">Synced</Badge>
            <Badge tone="danger">Failed</Badge>
          </div>
        </Cell>
        <div className="w-full max-w-xl rounded-2xl border border-line bg-panel/60 p-4">
          <Empty
            icon={<HardDrive size={28} weight="bold" />}
            title="Nothing here yet"
            body="Add something and this panel fills in."
            actions={
              <>
                <Button icon={<PencilSimple size={16} weight="bold" />}>Add item</Button>
                <Button variant="ghost" onClick={() => toast("Nothing to clean")}>
                  Dismiss
                </Button>
              </>
            }
          />
        </div>
      </Section>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Example dialog">
        <div className="space-y-3 px-6 py-5 text-sm text-muted">
          <p>This panel traps focus while it is open and restores it when it closes.</p>
          <p>Try Tab and Shift-Tab: focus stays inside. Escape closes it.</p>
        </div>
        <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
          <Button variant="secondary" onClick={() => setDialogOpen(false)}>
            Close
          </Button>
          <Button
            data-autofocus
            onClick={() => {
              setDialogOpen(false);
              toast("Saved");
            }}
          >
            Save
          </Button>
        </div>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Remove title?">
        <div className="px-6 py-5 text-sm text-muted">
          <p>This pattern keeps destructive actions behind an explicit confirm step.</p>
        </div>
        <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmOpen(false);
              toast("Removed", "error");
            }}
          >
            Remove
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

export default function Gallery() {
  return (
    <motion.div
      className="no-scrollbar h-full overflow-y-auto"
      style={{ background: "var(--color-canvas)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <GalleryBody />
    </motion.div>
  );
}