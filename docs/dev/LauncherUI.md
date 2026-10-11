# Launcher UI kit

The launcher ships its own component kit in `tools/launcher/web/src/ui`. The app
and the gallery page are both built from it, so every primitive is exercised in
production on every run and documented live at `/gallery` (open the launcher and
go to http://127.0.0.1:8245/gallery, or use the Component gallery button in
Settings or About).

## Architecture

```
src/
  ui/            the kit: primitives + one behavior hook, no app imports
    cx.ts        class join helper
    Button.tsx   primary, secondary, ghost, danger with loading and icon slots
    IconButton   icon-only action, label required
    TextField    label, hint, error with aria wiring
    Segmented    radiogroup with roving tabindex and arrow keys
    Switch       role=switch
    Dialog       modal panel with focus trap, restore, Escape, backdrop
    Toaster      queue, live regions, auto dismiss, manual dismiss
    Spinner      decorative or labeled
    Progress     indeterminate and determinate
    Skeleton     shimmer block + SkeletonRegion wrapper (aria-busy)
    Badge        status pill
    EmptyState   icon, title, body, actions, note
    useFocusTrap focus containment hook shared by Dialog and Onboarding
    index.ts     the public barrel
```

Rules that keep the kit reusable:

- `ui/` never imports from app files. App files import from `./ui`.
- Styling is Tailwind classes inside the component. Callers pass `className` for
  layout only (widths, margins), never to restyle variants.
- Motion is transform and opacity only. Every animated element also collapses
  under `prefers-reduced-motion: reduce` and under the in-app Reduced motion
  setting (`html[data-motion="reduced"]`).
- One accent variable drives colors, so the Accent setting retints every
  component with no per-component code.

## Props design

- Variants are string unions, not booleans: `variant="primary" | "secondary" |
  "ghost" | "danger"`. A component can never be in two variant states at once.
- Sizes are the same union pattern (`size="sm" | "md"`, card sizes S/M/L).
- Loading is a single prop that does three things: sets `aria-busy`, disables
  the control, swaps the icon for a spinner. The label and the DOM width stay
  so nothing shifts.
- State that a screen reader needs is not optional. `IconButton` requires
  `label`; `TextField` requires `label`; `Progress` requires `label`; dialogs
  generate their `aria-labelledby` from the `title` prop.
- Generic components stay generic: `Segmented<T extends string>` infers the
  option value type from the caller.
- Callbacks are single functions (`onChange(value)`) and components are fully
  controlled; the kit owns no hidden state except the toast queue.

## Accessibility contract

- Buttons are real `<button>` elements; active press is a transform scale.
- The dialog traps Tab and Shift-Tab inside, closes on Escape with
  `stopPropagation` so global handlers do not double-close, moves focus to the
  element marked `data-autofocus` (falling back to the first focusable), and
  restores focus to the trigger on close.
- Toasts use `role="status"` with `aria-live="polite"` for info and
  `role="alert"` with `aria-live="assertive"` for errors, cap at three visible,
  and provide a manual dismiss button.
- Segmented is a `radiogroup` with `role="radio"` children, `aria-checked`, and
  roving tabindex: Arrow keys move and select, Home and End jump.
- Text fields wire `htmlFor`, `aria-describedby` for hint and error, and
  `aria-invalid` when an error is shown. Errors use `role="alert"`.
- Skeletons sit inside `SkeletonRegion` which sets `aria-busy` and announces a
  screen-reader-only label once instead of per block.

## Usage examples

```tsx
import { Button, Dialog, EmptyState, Progress, TextField, useToast } from "./ui";

const { toast } = useToast();

<Button loading={busy} onClick={start} trailing={<ArrowRight size={16} weight="bold" />}>
  Save and continue
</Button>

<Button variant="danger" onClick={confirm}>Remove</Button>

<Dialog
  open={open}
  onClose={() => setOpen(false)}
  title="Example dialog"
  footer={<Button data-autofocus onClick={save}>Save</Button>}
>
  <p>Try Tab and Shift-Tab: focus stays inside. Escape closes it.</p>
</Dialog>

<TextField
  label="Games directory"
  value={dir}
  onChange={(event) => setDir(event.target.value)}
  hint="A game folder contains sce_module, sce_modules or prx."
  error={error}
/>

<Progress label="Starting title" />
<Progress label="Conversion progress" value={64} />

<EmptyState
  icon={<FolderOpen size={30} weight="bold" />}
  title="No games in the library"
  body={<p>Drop game folders into <code>{gamesDir}</code></p>}
  actions={<Button onClick={rescan}>Scan again</Button>}
/>
```

## Verification

The gallery page renders every component and state; the launcher's own screens
(home, onboarding, settings, launch overlay, empty state) are built from the
same primitives. Checked in a real browser at 1440x900, 768x1024 and 390x844
with zero console errors: focus moves into dialogs and back to the trigger, Tab
never escapes a modal, the radiogroup answers Arrow/Home/End, `data-motion`
collapses animation, and the accent setting retints everything.
