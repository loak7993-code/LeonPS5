import { useState } from "react";
import { Check, PencilSimple, Plus, Trash, User } from "@phosphor-icons/react";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { IconButton } from "../ui/IconButton";
import { TextField } from "../ui/TextField";
import type { Library, Profile, ProfileAction } from "../api";
import { confirm as confirmSound } from "../sounds";

const AVATAR_COLORS = ["#2f6bff", "#2bb8d6", "#2fb87a", "#e08a3c", "#e0524f"];

function avatarColor(id: string): string {
  let value = 0;
  for (let index = 0; index < id.length; index += 1) {
    value = (value * 31 + id.charCodeAt(index)) >>> 0;
  }
  return AVATAR_COLORS[value % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

type CardProps = {
  profile: Profile;
  active: boolean;
  alone: boolean;
  onSwitch: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
};

function ProfileCard({ profile, active, alone, onSwitch, onRename, onDelete }: CardProps) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState(profile.name);

  if (editing) {
    return (
      <div className="rounded-2xl border border-accent/50 bg-panel p-4">
        <TextField
          label="Profile name"
          hideLabel
          value={draft}
          autoFocus
          maxLength={24}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onRename(draft);
              setEditing(false);
            }
            if (event.key === "Escape") setEditing(false);
          }}
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onRename(draft);
              setEditing(false);
            }}
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex flex-col justify-between rounded-2xl border border-danger/40 bg-danger/10 p-4">
        <p className="text-sm text-text">
          Delete {profile.name}? Its playtime and history are erased.
        </p>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            Keep
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onDelete();
              setConfirming(false);
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative rounded-2xl border p-4 transition-colors ${
        active ? "border-accent/60 bg-accent/10" : "border-line bg-panel hover:border-white/20"
      }`}
    >
      {active && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
          <Check size={12} weight="bold" />
        </span>
      )}
      <button
        type="button"
        onClick={() => {
          if (!active) {
            onSwitch();
            confirmSound();
          }
        }}
        className="flex w-full flex-col items-center gap-3 rounded-xl py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-semibold text-white"
          style={{ background: avatarColor(profile.id) }}
        >
          {initials(profile.name)}
        </span>
        <span className={`text-sm ${active ? "font-semibold text-text" : "text-text/90"}`}>
          {profile.name}
        </span>
        <span className="text-[11px] text-muted">{active ? "Active" : "Switch"}</span>
      </button>
      <div className="absolute bottom-3 right-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <IconButton
          label={`Rename ${profile.name}`}
          onClick={() => {
            setDraft(profile.name);
            setEditing(true);
          }}
        >
          <PencilSimple size={14} weight="bold" />
        </IconButton>
        {!alone && (
          <IconButton label={`Delete ${profile.name}`} onClick={() => setConfirming(true)}>
            <Trash size={14} weight="bold" />
          </IconButton>
        )}
      </div>
    </div>
  );
}

type SheetProps = {
  library: Library;
  onClose: () => void;
  onAction: (payload: ProfileAction) => void;
};

export function ProfilesSheet({ library, onClose, onAction }: SheetProps) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const full = library.profiles.length >= 8;

  const create = (): void => {
    if (!draft.trim()) return;
    onAction({ action: "create", name: draft });
    setDraft("");
    setCreating(false);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Profiles"
      footer={
        <div className="flex items-center justify-between border-t border-line px-6 py-4">
          <p className="text-xs text-muted">Playtime, history and daily charts switch with the profile</p>
          <IconButton label="Close" onClick={onClose} className="self-center">
            <Check size={18} weight="bold" />
          </IconButton>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 px-6 py-5 sm:grid-cols-3">
        {library.profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            active={profile.id === library.activeProfile}
            alone={library.profiles.length === 1}
            onSwitch={() => onAction({ action: "switch", id: profile.id })}
            onRename={(name) => onAction({ action: "rename", id: profile.id, name })}
            onDelete={() => onAction({ action: "delete", id: profile.id })}
          />
        ))}
        {creating ? (
          <div className="rounded-2xl border border-accent/50 bg-panel p-4">
            <TextField
              label="Profile name"
              hideLabel
              value={draft}
              autoFocus
              maxLength={24}
              placeholder="Profile name"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") create();
                if (event.key === "Escape") setCreating(false);
              }}
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button onClick={create}>Add</Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={full}
            onClick={() => setCreating(true)}
            className={`flex min-h-[168px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              full ? "cursor-not-allowed border-line/50 opacity-40" : "border-line hover:border-accent/60 hover:text-text"
            }`}
          >
            <User size={22} weight="bold" />
            <span className="text-sm">{full ? "Profile limit reached" : "New profile"}</span>
            {!full && <Plus size={16} weight="bold" className="text-accent" />}
          </button>
        )}
      </div>
    </Dialog>
  );
}
