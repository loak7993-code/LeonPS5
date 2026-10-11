import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "../api";
import type { Game, Library } from "../api";
import type { LaunchPhase } from "../LaunchOverlay";

export type LaunchState = {
  game: Game;
  phase: LaunchPhase;
  error: string | null;
  command: string | null;
};

const AUTO_CLOSE_MS = 3200;
const NETWORK_ERRORS = new Set([
  "Failed to fetch",
  "NetworkError when attempting to fetch resource.",
]);

export type LaunchFlow = {
  launch: LaunchState | null;
  start: (game: Game) => void;
  retry: () => void;
  close: () => void;
};

export function useLaunchFlow(
  demo: boolean,
  onRefreshed: (library: Library) => void,
  onSettled: (game: Game) => void,
  describeNetworkError: (message: string) => string,
): LaunchFlow {
  const [launch, setLaunch] = useState<LaunchState | null>(null);
  const timer = useRef(0);
  const stateRef = useRef<LaunchState | null>(null);
  stateRef.current = launch;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const begin = useCallback(
    (game: Game) => {
      window.clearTimeout(timer.current);
      setLaunch({ game, phase: "starting", error: null, command: null });
      api
        .launchGame(game.id)
        .then((result) => {
          setLaunch({ game, phase: "running", error: null, command: result.command });
          api
            .loadLibrary(demo)
            .then(onRefreshed)
            .catch(() => undefined);
          timer.current = window.setTimeout(() => {
            const current = stateRef.current;
            if (current && current.game.id === game.id && current.phase !== "error") {
              setLaunch(null);
            }
            onSettled(game);
          }, AUTO_CLOSE_MS);
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          setLaunch({
            game,
            phase: "error",
            error: NETWORK_ERRORS.has(message) ? describeNetworkError(message) : message,
            command: null,
          });
        });
    },
    [demo, describeNetworkError, onRefreshed, onSettled],
  );

  const retry = useCallback(() => {
    const current = stateRef.current;
    if (current) begin(current.game);
  }, [begin]);

  const close = useCallback(() => setLaunch(null), []);

  return { launch, start: begin, retry, close };
}
