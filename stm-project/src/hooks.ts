import { useCallback, useEffect, useRef, useState } from 'react';
import { isAbortError } from './utils';

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}

export interface LiveQuery<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  lastSuccessAt: number | null;
  refresh: () => void;
}

/**
 * Poll a JSON endpoint while the tab is visible.
 * `key` identifies the query: changing it clears stale data and restarts polling.
 */
export function useLiveQuery<T>(
  key: string | null,
  loader: (signal: AbortSignal) => Promise<T>,
  intervalMs: number,
): LiveQuery<T> {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(key));
  const [lastSuccessAt, setLastSuccessAt] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);
  const activeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!key) {
      activeKeyRef.current = null;
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (activeKeyRef.current !== key) {
      activeKeyRef.current = key;
      setData(null);
      setError(null);
      setLoading(true);
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | null = null;

    const schedule = () => {
      if (!cancelled) timer = setTimeout(run, intervalMs);
    };

    const run = async () => {
      if (cancelled) return;

      if (document.hidden) {
        schedule();
        return;
      }

      controller?.abort();
      controller = new AbortController();

      try {
        const value = await loaderRef.current(controller.signal);
        if (!cancelled) {
          setData(value);
          setError(null);
          setLastSuccessAt(Date.now());
        }
      } catch (caught) {
        if (!cancelled && !isAbortError(caught)) {
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          schedule();
        }
      }
    };

    const onVisibilityChange = () => {
      if (!document.hidden && !cancelled) {
        clearTimeout(timer);
        void run();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    void run();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [key, intervalMs, nonce]);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  return { data, error, loading, lastSuccessAt, refresh };
}
