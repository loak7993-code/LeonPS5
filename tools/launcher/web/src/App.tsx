import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import { Button } from "./ui/Button";
import { Skeleton, SkeletonRegion } from "./ui/Skeleton";
import { ToastProvider, useToast } from "./ui/Toaster";
import * as api from "./api";
import type { Game } from "./api";
import { useLauncherData } from "./state/useLauncherData";
import { useLibraryFilter } from "./state/useLibraryFilter";
import { useLauncherNav } from "./state/useLauncherNav";
import { useLaunchFlow } from "./state/useLaunchFlow";
import { useGamepad } from "./gamepad";
import { Background } from "./Background";
import { TopBar } from "./TopBar";
import { Rail } from "./Row";
import { BottomBar } from "./BottomBar";
import { EmptyState } from "./EmptyState";
import { LaunchOverlay, StoppedScreen } from "./LaunchOverlay";
import { SettingsSheet } from "./sheets/Settings";
import { GridSheet } from "./sheets/LibraryGrid";
import { AboutSheet, PowerSheet } from "./sheets/AboutPower";
import { Onboarding } from "./Onboarding";
import { lazy, Suspense } from "react";
import { usePrefs } from "./prefs";
import { startAmbience, stopAmbience, unlock } from "./ambience";

const Gallery = lazy(() => import("./Gallery"));

type Overlay = "settings" | "about" | "power" | "grid" | null;

function LoadingRail() {
  return (
    <SkeletonRegion className="relative z-10 flex min-h-0 flex-1 items-center">
      <div className="flex gap-[18px] pl-[72px] max-md:pl-6">
        {[0, 1, 2, 3, 4, 5].map((slot) => (
          <Skeleton key={slot} className="aspect-square w-[var(--card-w)] shrink-0 rounded-[14px]" />
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

export default function App() {
  return (
    <ToastProvider>
      <Launcher />
    </ToastProvider>
  );
}

function Launcher() {
  const [demo, setDemo] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [gridIndex, setGridIndex] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [onboarding, setOnboarding] = useState(
    () => window.localStorage.getItem("leonps5-onboarded") !== "done",
  );
  const [prefs, setPref] = usePrefs();
  const [gestured, setGestured] = useState(false);
  const { toast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<string | null>(null);

  const { library, loadError, reload, apply } = useLauncherData(demo);
  const { filtered, query, setQuery, sort, toggleSort } = useLibraryFilter(library);

  const games = useMemo(() => library?.games ?? [], [library]);
  const gamesEmpty = library !== null && games.length === 0 && !demo;

  const setDemoWithToast = useCallback(
    (next: boolean) => {
      setDemo(next);
      toast(next ? "Demo titles on" : "Demo titles off");
    },
    [toast],
  );

  const openFolder = useCallback(() => {
    api
      .openGamesFolder()
      .then((result) =>
        toast(result.ok ? "Opened the games folder" : result.error ?? "Could not open the folder"),
      )
      .catch((error: unknown) => toast(error instanceof Error ? error.message : String(error)));
  }, [toast]);

  const rescan = useCallback(() => {
    api
      .rescan(demo)
      .then((next) => {
        apply(next);
        toast(`Library scanned: ${next.games.length} title${next.games.length === 1 ? "" : "s"}`);
      })
      .catch((error: unknown) => toast(error instanceof Error ? error.message : String(error)));
  }, [apply, demo, toast]);

  const saveDir = useCallback(
    async (dir: string) => {
      apply(await api.saveConfig({ gamesDir: dir }));
    },
    [apply],
  );

  const describeNetworkError = useCallback(
    () =>
      "Could not reach the launcher server. Start it with python3 tools/launcher/server.py and retry.",
    [],
  );

  const flow = useLaunchFlow(demo, apply, useCallback(() => undefined, []), describeNetworkError);

  const activate = useCallback(
    (game: Game) => {
      if (game.demo) {
        toast("Demo titles are samples and do not launch");
        return;
      }
      flow.start(game);
    },
    [flow, toast],
  );

  const [searching, setSearching] = useState(false);
  const openSearch = useCallback(() => {
    setSearching(true);
    window.setTimeout(() => searchRef.current?.focus(), 30);
  }, []);
  const closeSearch = useCallback(() => setSearching(false), []);

  const nav = useLauncherNav({
    filtered,
    searching,
    onTopConfirm: (index) => {
      if (index === 0) openSearch();
      else if (index === 1) setOverlay("grid");
      else if (index === 2) setOverlay("settings");
      else if (index === 3) setOverlay("about");
      else if (index === 4) setPref("music", !prefs.music);
      else setOverlay("power");
    },
    onCardConfirm: activate,
    onBottomConfirm: (index) => {
      if (index === 0) {
        anchorRef.current = filtered[nav.cardIndex]?.id ?? null;
        toggleSort();
      } else if (index === 1) setDemoWithToast(!demo);
      else if (index === 2) openFolder();
      else setOverlay("about");
    },
    onBack: closeSearch,
  });

  useEffect(() => {
    const gesture = (): void => {
      setGestured(true);
      unlock();
    };
    window.addEventListener("pointerdown", gesture, { once: true });
    window.addEventListener("keydown", gesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", gesture);
      window.removeEventListener("keydown", gesture);
    };
  }, []);

  useEffect(() => {
    if (!gestured) return;
    if (stopped) {
      stopAmbience();
      return;
    }
    if (prefs.music && overlay === null && flow.launch === null && !searching) {
      startAmbience();
    } else {
      stopAmbience();
    }
  }, [gestured, prefs.music, overlay, flow.launch, searching, stopped]);

  useEffect(() => {
    if (!anchorRef.current) return;
    const at = filtered.findIndex((game) => game.id === anchorRef.current);
    if (at >= 0) nav.setCardIndex(at);
    anchorRef.current = null;
  }, [filtered, nav]);

  const blocked = overlay !== null || flow.launch !== null;

  useGamepad(
    {
      left: () => nav.handlers.current.left(),
      right: () => nav.handlers.current.right(),
      up: () => nav.handlers.current.up(),
      down: () => nav.handlers.current.down(),
      confirm: () => nav.handlers.current.confirm(),
      back: () => nav.handlers.current.back(),
    },
    !blocked && !searching,
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.target instanceof HTMLInputElement) return;
      if (blocked) {
        if (flow.launch && event.key === "Escape") flow.close();
        return;
      }
      if (event.key === "ArrowLeft") nav.handlers.current.left();
      else if (event.key === "ArrowRight") nav.handlers.current.right();
      else if (event.key === "ArrowUp") nav.handlers.current.up();
      else if (event.key === "ArrowDown") nav.handlers.current.down();
      else if (event.key === "Enter") nav.handlers.current.confirm();
      else if (event.key === "Escape" && searching) nav.handlers.current.back();
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [blocked, searching, flow.launch, flow]);

  if (window.location.pathname === "/gallery") {
    return (
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center bg-canvas">
            <Skeleton className="h-40 w-[min(90vw,720px)]" />
          </div>
        }
      >
        <Gallery />
      </Suspense>
    );
  }

  if (stopped) {
    return <StoppedScreen onReload={() => window.location.reload()} />;
  }

  const selected = filtered[nav.cardIndex] ?? null;

  return (
    <div className="flex h-full flex-col">
      <Background game={!blocked && prefs.backdrop ? selected : null} />
      <TopBar
        ref={searchRef}
        index={nav.row === 0 ? nav.topIndex : -1}
        searching={searching}
        query={query}
        onIndex={nav.setTopIndex}
        onSearchToggle={openSearch}
        onQuery={setQuery}
        onSearchExit={closeSearch}
        onGrid={() => {
          setGridIndex(Math.min(nav.cardIndex, Math.max(0, games.length - 1)));
          setOverlay("grid");
        }}
        onSettings={() => setOverlay("settings")}
        onAbout={() => setOverlay("about")}
        musicOn={prefs.music}
        onMusicToggle={() => setPref("music", !prefs.music)}
        onPower={() => setOverlay("power")}
      />
      {library === null && loadError === null ? (
        <LoadingRail />
      ) : loadError !== null ? (
        <ServerError error={loadError} onRetry={reload} />
      ) : gamesEmpty ? (
        <EmptyState
          gamesDir={library?.gamesDir ?? ""}
          onRescan={rescan}
          onOpenFolder={openFolder}
          onDemo={() => setDemoWithToast(true)}
        />
      ) : (
        <Rail
          games={filtered}
          index={nav.cardIndex}
          searching={searching}
          onSelect={nav.setCardIndex}
          onActivate={activate}
        />
      )}
      <BottomBar
        index={nav.row === 2 ? nav.bottomIndex : -1}
        sort={sort}
        demo={demo}
        onIndex={nav.setBottomIndex}
        onSort={() => {
          anchorRef.current = filtered[nav.cardIndex]?.id ?? null;
          toggleSort();
        }}
        onDemo={() => setDemoWithToast(!demo)}
        onOpenFolder={openFolder}
        onAbout={() => setOverlay("about")}
      />
      {onboarding && library && !demo && (
        <Onboarding
          library={library}
          onSaveDir={saveDir}
          onDemo={() => setDemoWithToast(true)}
          onClose={() => {
            window.localStorage.setItem("leonps5-onboarded", "done");
            setOnboarding(false);
          }}
        />
      )}
      {overlay === "settings" && library && (
        <SettingsSheet
          key="settings"
          library={library}
          onClose={() => setOverlay(null)}
          onRescan={rescan}
          onOpenFolder={openFolder}
          onToast={toast}
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
            activate(game);
          }}
          onClose={() => setOverlay(null)}
        />
      )}
      {flow.launch && <LaunchOverlay
        key="launch"
        game={flow.launch.game}
        phase={flow.launch.phase}
        error={flow.launch.error}
        command={flow.launch.command}
        onRetry={flow.retry}
        onClose={flow.close}
      />}
    </div>
  );
}