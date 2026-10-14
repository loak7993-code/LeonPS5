import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "../api";
import type { Library } from "../api";

const RETRY_DELAY_MS = 700;

export type LibraryData = {
  library: Library | null;
  loadError: string | null;
  reload: () => void;
  apply: (next: Library) => void;
};

export function useLauncherData(): LibraryData {
  const [library, setLibrary] = useState<Library | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchOnce = useCallback(async (): Promise<Library> => {
    const attempt = (delay: number): Promise<Library> =>
      api.loadLibrary().catch((error: unknown) => {
        if (delay === 0) throw error;
        return new Promise<Library>((resolve, reject) => {
          window.setTimeout(() => {
            attempt(0).then(resolve, reject);
          }, delay);
        });
      });
    return attempt(RETRY_DELAY_MS);
  }, []);

  useEffect(() => {
    fetchOnce()
      .then((next) => {
        if (!mounted.current) return;
        setLibrary(next);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!mounted.current) return;
        setLoadError(error instanceof Error ? error.message : String(error));
      });
  }, [fetchOnce]);

  const reload = useCallback(() => {
    fetchOnce()
      .then((next) => {
        setLibrary(next);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : String(error));
      });
  }, [fetchOnce]);

  const apply = useCallback((next: Library) => {
    setLibrary(next);
    setLoadError(null);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      api
        .loadLibrary()
        .then((next) => {
          setLibrary((current) => (current && JSON.stringify(current) === JSON.stringify(next) ? current : next));
        })
        .catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  return { library, loadError, reload, apply };
}
