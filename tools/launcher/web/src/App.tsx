import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import { Button } from "./ui/Button";
import { Skeleton, SkeletonRegion } from "./ui/Skeleton";
import { ToastProvider, useToast } from "./ui/Toaster";
import { Gallery } from "./Gallery";
import * as api from "./api";
import type { Game, Library } from "./api";
import { sortGames, type SortMode } from "./data";
import { useGamepad } from "./gamepad";
import { Background } from "./Background";
import { TopBar } from "./TopBar";
import { Rail } from "./Row";
import { BottomBar } from "./BottomBar";
import { EmptyState } from "./EmptyState";
import { LaunchOverlay, StoppedScreen, type LaunchPhase } from "./LaunchOverlay";
import { AboutSheet, GridSheet, PowerSheet, SettingsSheet } from "./Sheets";
import { Onboarding } from "./Onboarding";
import { usePrefs } from "./prefs";

type Overlay = "settings" | "about" | "power" | "grid" | "launch" | null;

type LaunchState = {
  game: Game;
  phase: LaunchPhase;
  error: string | null;
  command: string | null;
};

type NavHandlers = {
  left(): void;
  right(): void;
  up(): void;
  down(): void;
  confirm(): void;
  back(): void;
};

function LoadingRail() {
  return (
    <SkeletonRegion className="relative z-10 flex min-h-0 flex-1 items-center">
      <div className="flex gap-[18px] pl-[72px] max-md:pl-6">
        {[0, 1, 2, 3, 4, 5].map((slot) => (
          <Skeleton
            key={slot}
            className="aspect-square w-[var(--card-w)] shrink-0 rounded-[14px]"
          />
        ))}
      </div>
    </SkeletonRegion>
  );
}

function ServerError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-2xl font-semibold">Cannot reach the launcher server</h2>
      <p className="max-w-md rounded-lg bg-white/5 p-3 font-mono text-xs text-muted">{error}</p>
      <p className="text-xs text-muted/80">Start it with: python3 tools/launcher/server.py</p>
      <Button icon={<ArrowClockwise size={16} weight="bold" />} onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

const emptyNav: NavHandlers = {
  left() {},
  right() {},
  up() {},
  down() {},
  confirm() {},
  back() {},
};

export default function App() {
  return (
    <ToastProvider>
      <Launcher />
    </ToastProvider>
  );
}

function Launcher() {
  const [demo, setDemo] = useState(false);
  const [library, setLibrary] = useState<Library | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [sort, setSort] = useState<SortMode>("recent");
  const [row, setRow] = useState(1);
  const [topIndex, setTopIndex] = useState(0);
  const [cardIndex, setCardIndex] = useState(0);
  const [bottomIndex, setBottomIndex] = useState(0);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [launch, setLaunch] = useState<LaunchState | null>(null);
  const [gridIndex, setGridIndex] = useState(0);
  const [stopped, setStopped] = useState(false);
  const { toast } = useToast();
  const [onboarding, setOnboarding] = useState(
    () => window.localStorage.getItem("leonps5-onboarded") !== "done",
  );
  const [prefs, setPref] = usePrefs();

  const searchRef = useRef<HTMLInputElement>(null);
  const launchTimer = useRef(0);
  const wantedRef = useRef<string | null>(null);
  const navRef = useRef<NavHandlers>(emptyNav);
  const launchRef = useRef<LaunchState | null>(null);

  const showToast = toast;

  const fetchLibrary = useCallback((useDemo: boolean) => {
    api
      .loadLibrary(useDemo)
      .then((next) => {
        setLibrary(next);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : String(error));
      });
  }, []);

  useEffect(() => {
    fetchLibrary(demo);
  }, [demo, fetchLibrary]);

  const games = useMemo(() => (library ? library.games : []), [library]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? games.filter(
          (game) =>
            game.title.toLowerCase().includes(needle) || game.folder.toLowerCase().includes(needle),
        )
      : games;
    return sortGames(list, sort);
  }, [games, query, sort]);

  useEffect(() => {
    setCardIndex((index) => Math.min(index, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  useEffect(() => {
    if (!wantedRef.current) return;
    const at = filtered.findIndex((game) => game.id === wantedRef.current);
    if (at >= 0) setCardIndex(at);
    wantedRef.current = null;
  }, [filtered]);

  useEffect(() => () => window.clearTimeout(launchTimer.current), []);

  launchRef.current = launch;

  const selected = filtered[cardIndex] ?? null;

  const openFolder = useCallback(() => {
    api
      .openGamesFolder()
      .then((result) =>
        showToast(result.ok ? "Opened the games folder" : result.error ?? "Could not open the folder"),
      )
      .catch((error: unknown) => showToast(error instanceof Error ? error.message : String(error)));
  }, [showToast]);

  const rescan = useCallback(() => {
    api
      .rescan(demo)
      .then((next) => {
        setLibrary(next);
        setLoadError(null);
        showToast(`Library scanned: ${next.games.length} title${next.games.length === 1 ? "" : "s"}`);
      })
      .catch((error: unknown) => showToast(error instanceof Error ? error.message : String(error)));
  }, [demo, showToast]);

  const startGame = useCallback(
    (game: Game) => {
      if (game.demo) {
        showToast("Demo titles are samples and do not launch");
        return;
      }
      window.clearTimeout(launchTimer.current);
      setLaunch({ game, phase: "starting", error: null, command: null });
      setOverlay("launch");
      api
        .launchGame(game.id)
        .then((result) => {
          setLaunch({ game, phase: "running", error: null, command: result.command });
          api
            .loadLibrary(demo)
            .then((next) => setLibrary(next))
            .catch(() => undefined);
          launchTimer.current = window.setTimeout(() => {
            const current = launchRef.current;
            if (current && current.game.id === game.id && current.phase !== "error") {
              setLaunch(null);
              setOverlay((open) => (open === "launch" ? null : open));
            }
            showToast(`Started ${game.title}`);
          }, 3200);

        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          setLaunch({
            game,
            phase: "error",
            error:
              message === "Failed to fetch" || message === "NetworkError when attempting to fetch resource."
                ? "Could not reach the launcher server. Start it with python3 tools/launcher/server.py and retry."
                : message,
            command: null,
          });
        });
    },
    [demo, showToast],
  );

  const closeOnboarding = useCallback(() => {
    window.localStorage.setItem("leonps5-onboarded", "done");
    setOnboarding(false);
  }, []);

  const saveDir = useCallback(
    async (dir: string) => {
      const next = await api.saveConfig({ gamesDir: dir });
      setLibrary(next);
      setLoadError(null);
    },
    [],
  );

  const openGrid = useCallback(() => {
    setGridIndex(Math.min(cardIndex, Math.max(0, games.length - 1)));
    setOverlay("grid");
  }, [cardIndex, games.length]);

  const openSearch = useCallback(() => {
    setSearching(true);
    window.setTimeout(() => searchRef.current?.focus(), 30);
  }, []);

  navRef.current = {
    left() {
      if (row === 0) setTopIndex((index) => Math.max(0, index - 1));
      else if (row === 1) setCardIndex((index) => Math.max(0, index - 1));
      else setBottomIndex((index) => Math.max(0, index - 1));
    },
    right() {
      if (row === 0) setTopIndex((index) => Math.min(4, index + 1));
      else if (row === 1) setCardIndex((index) => Math.min(filtered.length - 1, index + 1));
      else setBottomIndex((index) => Math.min(3, index + 1));
    },
    up() {
      setRow((current) => Math.max(0, current - 1));
    },
    down() {
      setRow((current) => Math.min(2, current + 1));
    },
    confirm() {
      if (row === 0) {
        if (topIndex === 0) openSearch();
        else if (topIndex === 1) openGrid();
        else if (topIndex === 2) setOverlay("settings");
        else if (topIndex === 3) setOverlay("about");
        else setOverlay("power");
      } else if (row === 1) {
        if (selected) startGame(selected);
      } else if (bottomIndex === 0) {
        wantedRef.current = filtered[cardIndex]?.id ?? null;
        setSort((mode) => (mode === "recent" ? "alpha" : "recent"));
      } else if (bottomIndex === 1) {
        setDemo((value) => !value);
        showToast(demo ? "Demo titles off" : "Demo titles on");
      } else if (bottomIndex === 2) {
        openFolder();
      } else {
        setOverlay("about");
      }
    },
    back() {
      if (searching) setSearching(false);
    },
  };

  useGamepad(
    {
      left: () => navRef.current.left(),
      right: () => navRef.current.right(),
      up: () => navRef.current.up(),
      down: () => navRef.current.down(),
      confirm: () => navRef.current.confirm(),
      back: () => navRef.current.back(),
    },
    overlay === null && !searching,
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.target instanceof HTMLInputElement) return;
      if (overlay !== null) {
        if (overlay === "launch" && event.key === "Escape") {
          setOverlay(null);
          setLaunch(null);
        }
        return;
      }
      if (event.key === "ArrowLeft") navRef.current.left();
      else if (event.key === "ArrowRight") navRef.current.right();
      else if (event.key === "ArrowUp") navRef.current.up();
      else if (event.key === "ArrowDown") navRef.current.down();
      else if (event.key === "Enter") navRef.current.confirm();
      else if (event.key === "Escape" && searching) navRef.current.back();
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay, searching]);

  if (window.location.pathname === "/gallery") {
    return <Gallery />;
  }

  if (stopped) {
    return <StoppedScreen onReload={() => window.location.reload()} />;
  }

  const gamesEmpty = library !== null && library.games.length === 0 && !demo;

  return (
    <div className="flex h-full flex-col">
      <Background game={overlay === null && prefs.backdrop ? selected : null} />
      <TopBar
        ref={searchRef}
        index={row === 0 ? topIndex : -1}
        searching={searching}
        query={query}
        onIndex={setTopIndex}
        onSearchToggle={openSearch}
        onQuery={setQuery}
        onSearchExit={() => setSearching(false)}
        onGrid={openGrid}
        onSettings={() => setOverlay("settings")}
        onAbout={() => setOverlay("about")}
        onPower={() => setOverlay("power")}
      />
      {library === null && loadError === null ? (
        <LoadingRail />
      ) : loadError !== null ? (
        <ServerError error={loadError} onRetry={() => fetchLibrary(demo)} />
      ) : gamesEmpty ? (
        <EmptyState
          gamesDir={library?.gamesDir ?? ""}
          onRescan={rescan}
          onOpenFolder={openFolder}
          onDemo={() => {
            setDemo(true);
            showToast("Demo titles on");
          }}
        />
      ) : (
        <Rail
          games={filtered}
          index={cardIndex}
          searching={searching}
          onSelect={setCardIndex}
          onActivate={startGame}
        />
      )}
      <BottomBar
        index={row === 2 ? bottomIndex : -1}
        sort={sort}
        demo={demo}
        onIndex={setBottomIndex}
        onSort={() => {
          wantedRef.current = filtered[cardIndex]?.id ?? null;
          setSort((mode) => (mode === "recent" ? "alpha" : "recent"));
        }}
        onDemo={() => {
          setDemo((value) => !value);
          showToast(demo ? "Demo titles off" : "Demo titles on");
        }}
        onOpenFolder={openFolder}
        onAbout={() => setOverlay("about")}
      />
      {onboarding && library && !demo && (
        <Onboarding
          library={library}
          onSaveDir={saveDir}
          onDemo={() => setDemo(true)}
          onClose={closeOnboarding}
        />
      )}
      {overlay === "settings" && library && (
          <SettingsSheet
            key="settings"
            library={library}
            onClose={() => setOverlay(null)}
            onRescan={rescan}
            onOpenFolder={openFolder}
            onToast={showToast}
            onGallery={() => window.location.assign("/gallery")}
            onSaveDir={saveDir}
            prefs={prefs}
            onPref={setPref}
          />
        )}
        {overlay === "about" && (
          <AboutSheet
            key="about"
            onClose={() => setOverlay(null)}
            onGallery={() => window.location.assign("/gallery")}
          />
        )}
        {overlay === "power" && (
          <PowerSheet
            key="power"
            onClose={() => setOverlay(null)}
            onQuit={() => {
              api
                .quitLauncher()
                .catch(() => undefined)
                .finally(() => setStopped(true));
            }}
          />
        )}
        {overlay === "grid" && filtered.length > 0 && (
          <GridSheet
            key="grid"
            games={filtered}
            index={gridIndex}
            onIndex={setGridIndex}
            onActivate={(game) => {
              setOverlay(null);
              startGame(game);
            }}
            onClose={() => setOverlay(null)}
          />
        )}
        {overlay === "launch" && launch && (
          <LaunchOverlay
            key="launch"
            game={launch.game}
            phase={launch.phase}
            error={launch.error}
            command={launch.command}
            onRetry={() => startGame(launch.game)}
            onClose={() => {
              setOverlay(null);
              setLaunch(null);
            }}
          />
      )}
    </div>
  );
}
