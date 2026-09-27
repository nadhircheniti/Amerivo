"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, API_URL } from "@/lib/api";
import { useApi } from "@/lib/use-api";

export type DataState<T> = {
  data: T | null;
  /** API error message (null while loading or on success). */
  error: { status: number; message: string } | null;
  loading: boolean;
  reload: () => void;
  setData: (update: (prev: T | null) => T | null) => void;
};

/**
 * Loads one student-space endpoint. Demo mode (no API_URL): returns `demo()` without any call.
 * Data is set after mount in both modes so server and browser render the same first frame.
 */
export function useStudentData<T>(path: string | null, demo: () => T): DataState<T> {
  const { call, isLoaded, isSignedIn } = useApi();
  const [data, setDataState] = useState<T | null>(null);
  const [error, setError] = useState<DataState<T>["error"]>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  // `demo` is usually an inline closure: only its first version matters.
  const [demoFn] = useState(() => demo);

  useEffect(() => {
    let cancelled = false;
    if (!API_URL) {
      // Deferred so the first render (server and browser) is the loading state.
      queueMicrotask(() => {
        if (cancelled) return;
        setDataState(demoFn());
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }
    if (!path || !isLoaded || !isSignedIn) return;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
    });
    call<T>(path)
      .then((d) => {
        if (cancelled) return;
        setDataState(d);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError({ status: e instanceof ApiError ? e.status : 0, message: e instanceof Error ? e.message : String(e) });
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, call, isLoaded, isSignedIn, attempt, demoFn]);

  const reload = useCallback(() => setAttempt((a) => a + 1), []);
  const setData = useCallback((update: (prev: T | null) => T | null) => setDataState(update), []);
  return { data, error, loading, reload, setData };
}

/** Current time, refreshed every `ms` (null during the server render). */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    queueMicrotask(() => setNow(Date.now()));
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}
