import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import { Button } from "./ui/Button";
import { Skeleton, SkeletonRegion } from "./ui/Skeleton";
import { ToastProvider, useToast } from "./ui/Toaster";
import * as api from "./api";
import { iconUrl, type Game } from "./api";
import { useLauncherData } from "./state/useLauncherData";
import { useLibraryFilter } from "./state/useLibraryFilter";
import { useLauncherNav } from "./state/useLauncherNav";
import { useLaunchFlow } from "./state/useLaunchFlow";
import { useGamepad } from "./gamepad";
import * as sounds from "./sounds";
import { Background } from "./Background";
import { TopBar } from "./TopBar";
import { Rail } from "./Row";
import { BottomBar } from "./BottomBar";
import { EmptyState } from "./EmptyState";
import { LaunchOverlay, StoppedScreen } from "./LaunchOverlay";
import { useGameTint } from "./gameTint";
import { SettingsPage } from "./sheets/Settings";
import { ProfilesSheet } from "./sheets/Profiles";
import { GridSheet } from "./sheets/LibraryGrid";
import { AboutSheet, PowerSheet } from "./sheets/AboutPower";
import { Onboarding } from "./Onboarding";
import { lazy, Suspense } from "react";
import { usePrefs } from "./prefs";
import { startAmbience, stopAmbience, unlock, setVolume } from "./ambience";

const Gallery = lazy(() => import("./Gallery"));

type Overlay = "settings" | "about" | "power" | "grid" | "profiles" | null;

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

function hexAlpha(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 0xff;
  const green = (value >> 8) & 0xff;
  const blue = value & 0xff;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
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
  const [infoMode, setInfoMode] = useState(false);
  const [tint, applyTint] = useGameTint();
  const [onboarding, setOnboarding] = useState(
    () => window.localStorage.getItem("leonps5-onboarded") !== "done",
  );
  const [prefs, setPref] = usePrefs();
  const [gestured, setGestured] = useState(false);
  const glow = (prefs.accentGlow ? (prefs.glowIntensity / 100) * 0.14 : 0);
  const glowColorA = tint ?? "#2f6bff";
  const glowColorB = tint ?? "#3fa9c9";
  const waveOp = prefs.waveOpacity / 100;
  const { toast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<string | null>(null);

  const { library, loadError, reload, apply } = useLauncherData(false);

  const games = useMemo(() => library?.games ?? [], [library]);
  const showcaseEntries = useMemo(
    () => (library ? (demo ? library.showcase.production : library.showcase.beta) : []),
    [library, demo],
  );
  const showcaseGames = useMemo(
    () =>
      showcaseEntries.map((entry) => ({
        id: entry.id,
        folder: "",
        title: entry.title,
        hasIcon: false,
        hasPic: false,
        lastPlayed: null,
        minutes: 0,
        launches: 0,
        daily: [0, 0, 0, 0, 0, 0, 0],
        running: false,
        demo: false,
        description: entry.description,
        artUrl: entry.art,
        showcase: true,
        installed: entry.installed,
        genre: entry.genre,
        storeUrl: entry.storeUrl,
      })),
    [showcaseEntries],
  );
  const browseLibrary = useMemo(
    () => (library === null ? null : { ...library, games: [...library.games, ...showcaseGames] }),
    [library, showcaseGames],
  );
  const { filtered, query, setQuery, sort, toggleSort } = useLibraryFilter(browseLibrary);
  const gamesEmpty = library !== null && games.length === 0 && showcaseGames.length === 0;

  const setDemoWithToast = useCallback(
    (next: boolean) => {
      setDemo(next);
      toast(next ? "Showcase: production titles" : "Showcase: testing titles");
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
      .rescan(false)
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

  const flow = useLaunchFlow(false, apply, useCallback(() => undefined, []), describeNetworkError);

  const pageOpenedAt = useRef(0);
  const closeInfo = useCallback(() => {
    setInfoMode(false);
    pageOpenedAt.current = 0;
    applyTint(null);
  }, [applyTint]);

  const activate = useCallback((game: Game) => {
    pageOpenedAt.current = Date.now();
    setInfoMode(true);
    applyTint(game.artUrl ?? (game.hasIcon ? iconUrl(game.id) : null));
  }, [applyTint]);

  const play = useCallback(
    (game: Game) => {
      if (game.demo) {
        toast("Demo titles are samples and do not launch");
        return;
      }
      if (game.showcase && !game.installed) {
        toast("Not installed. Showcase titles are browse-only.");
        return;
      }
      const target =
        game.showcase && game.installed
          ? games.find((item) => item.title.toLowerCase() === game.title.toLowerCase()) ?? game
          : game;
      setInfoMode(false);
      applyTint(null);
      flow.start(target);
    },
    [flow, games, toast],
  );

  const profileAction = useCallback(
    (payload: api.ProfileAction) => {
      api
        .profileAction(payload)
        .then((next) => {
          apply(next);
          const name =
            payload.action === "create"
              ? next.profiles.find((item) => item.id === next.activeProfile)?.name ?? "the new profile"
              : next.profiles.find((item) => item.id === next.activeProfile)?.name ?? "";
          toast(
            payload.action === "create"
              ? `Profile created: ${name}`
              : payload.action === "delete"
                ? "Profile deleted"
                : payload.action === "rename"
                  ? "Profile renamed"
                  : `Switched to ${name}`,
          );
        })
        .catch((error: unknown) => toast(error instanceof Error ? error.message : String(error)));
    },
    [apply, toast],
  );

  const stop = useCallback(
    (game: Game) => {
      api
        .stopGame(game.id)
        .then(() => api.loadLibrary(false))
        .then((next) => {
          apply(next);
          toast(`Stopped ${game.title}`);
        })
        .catch((error: unknown) => toast(error instanceof Error ? error.message : String(error)));
    },
    [apply, demo, toast],
  );


  const [searching, setSearching] = useState(false);
  const openSearch = useCallback(() => {
    setSearching(true);
    window.setTimeout(() => searchRef.current?.focus(), 30);
  }, []);
  const closeSearch = useCallback(() => setSearching(false), []);

  useEffect(() => {
    sounds.setSoundsEnabled(prefs.sounds);
  }, [prefs.sounds]);

  useEffect(() => {
    const connect = (): void => toast("Controller connected");
    const disconnect = (): void => toast("Controller disconnected");
    window.addEventListener("gamepadconnected", connect);
    window.addEventListener("gamepaddisconnected", disconnect);
    return () => {
      window.removeEventListener("gamepadconnected", connect);
      window.removeEventListener("gamepaddisconnected", disconnect);
    };
  }, [toast]);

  const knownGames = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!library) return;
    const fresh = library.games.filter((game) => knownGames.current.size > 0 && !knownGames.current.has(game.id));
    if (fresh.length > 0) {
      toast(
        fresh.length === 1
          ? `Detected ${fresh[0].title}`
          : `Detected ${fresh.length} new titles`,
      );
    }
    for (const game of library.games) knownGames.current.add(game.id);
  }, [library, toast]);

  const nav = useLauncherNav({
    filtered,
    searching,
    onTopConfirm: (index) => {
      if (index === 0) openSearch();
      else if (index === 1) setOverlay("grid");
      else if (index === 2) setOverlay("settings");
      else if (index === 3) setOverlay("about");
      else if (index === 4) setPref("music", !prefs.music);
      else if (index === 5) setOverlay("profiles");
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
      sounds.primeSounds();
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
    setVolume(prefs.musicVolume / 100);
    if (prefs.music && overlay === null && flow.launch === null && !searching) {
      startAmbience();
    } else {
      stopAmbience();
    }
  }, [gestured, prefs.music, prefs.musicVolume, overlay, flow.launch, searching, stopped]);

  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = filtered[nav.cardIndex]?.id ?? null;
  }, [filtered, nav.cardIndex]);
  useEffect(() => {
    if (!selectedIdRef.current) return;
    const at = filtered.findIndex((game) => game.id === selectedIdRef.current);
    if (at >= 0 && at !== nav.cardIndex) nav.setCardIndex(at);
  }, [filtered, nav]);

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
      confirm: () => {
        if (infoMode) {
          const selected = filtered[nav.cardIndex];
          if (selected) play(selected);
          return;
        }
        nav.handlers.current.confirm();
      },
      back: () => {
        if (infoMode) closeInfo();
        else nav.handlers.current.back();
      },
      triangle: openSearch,
      square: () => {
        anchorRef.current = filtered[nav.cardIndex]?.id ?? null;
        toggleSort();
      },
      options: () => {
        setGridIndex(Math.min(nav.cardIndex, Math.max(0, games.length - 1)));
        setOverlay("grid");
      },
      touchpad: () => setOverlay("settings"),
      l1: () => nav.handlers.current.jump(-5),
      r1: () => nav.handlers.current.jump(5),
    },
    !blocked && !searching,
  );

  const keyState = useRef({ nav, infoMode, closeInfo, play, filtered, searching, blocked, flow });
  keyState.current = { nav, infoMode, closeInfo, play, filtered, searching, blocked, flow };

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const state = keyState.current;
      if (event.target instanceof HTMLInputElement) return;
      if (state.blocked) {
        if (state.flow.launch && event.key === "Escape") state.flow.close();
        return;
      }
      if (event.key === "Escape") {
        if (state.searching) state.nav.handlers.current.back();
        else if (state.infoMode) state.closeInfo();
        else return;
        event.preventDefault();
        return;
      }
      if (event.key === "Enter" && state.infoMode && state.nav.row === 1) {
        if (Date.now() - pageOpenedAt.current > 300) {
          const selected = state.filtered[state.nav.cardIndex];
          if (selected) state.play(selected);
        }
        event.preventDefault();
        return;
      }
      if (event.key === "ArrowLeft") state.nav.handlers.current.left();
      else if (event.key === "ArrowRight") state.nav.handlers.current.right();
      else if (event.key === "ArrowUp") state.nav.handlers.current.up();
      else if (event.key === "ArrowDown") state.nav.handlers.current.down();
      else if (event.key === "Enter") state.nav.handlers.current.confirm();
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background: `radial-gradient(48vw 36vw at -6% -10%, ${hexAlpha(glowColorA, glow)}, transparent 70%), radial-gradient(52vw 40vw at 106% 108%, ${hexAlpha(glowColorB, glow * 0.65)}, transparent 70%)`,
          zIndex: 0,
        }}
      />
      <Background
        game={!blocked && prefs.backdrop ? selected : null}
        customUrl={prefs.customBackdrop}
        blur={infoMode ? Math.min(prefs.backdropBlur, 24) : prefs.backdropBlur}
        opacity={infoMode ? Math.max(prefs.backdropOpacity, 70) : prefs.backdropOpacity}
        waveOpacity={waveOp}
      />
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
        onSettings={() => setOverlay("settings" as Overlay)}
        onAbout={() => setOverlay("about")}
        musicOn={prefs.music}
        onMusicToggle={() => setPref("music", !prefs.music)}
        onProfiles={() => setOverlay("profiles")}
        profileName={library?.profiles.find((item) => item.id === library?.activeProfile)?.name ?? "Player 1"}
        topBarStyle={prefs.topBarStyle}
        showWordmark={prefs.showWordmark}
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
          gap={prefs.cardGap === "compact" ? 10 : prefs.cardGap === "spacious" ? 28 : 18}
          radius={prefs.cornerRadius}
          shadow={prefs.cardShadow}
          info={infoMode && !searching}
          onPlay={play}
          onStop={stop}
          onOpenFolder={openFolder}
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
      {overlay === "profiles" && library && (
        <ProfilesSheet
          key="profiles"
          library={library}
          onClose={() => setOverlay(null)}
          onAction={profileAction}
        />
      )}
      {overlay === "settings" && library && (
        <SettingsPage
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