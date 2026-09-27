"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";

export const isLive = !!API_URL;

export const errorText = (e: unknown, fallback: string) => (e instanceof ApiError || e instanceof Error ? e.message || fallback : fallback);

type State<T> = { data: T | null; error: string | null; key: string | null };

/**
 * Loads an admin API path. Live mode: fetches (again when `path` changes), keeps the previous data
 * while the next page loads. Demo mode (no API): returns `sample` and never calls the API.
 */
export function useAdminData<T>(path: string | null, sample: T) {
  const { call, isLoaded, isSignedIn } = useApi();
  const [state, setState] = useState<State<T>>({ data: null, error: null, key: null });
  const [nonce, setNonce] = useState(0);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!isLive || !path || !isLoaded || !isSignedIn) return;
    let cancelled = false;
    const key = `${path}#${nonce}`;
    call<T>(path)
      .then((data) => !cancelled && setState({ data, error: null, key }))
      .catch((e: unknown) => !cancelled && setState((s) => ({ data: s.data, error: errorText(e, ""), key })))
      .finally(() => !cancelled && setRetrying(false));
    return () => {
      cancelled = true;
    };
  }, [call, path, nonce, isLoaded, isSignedIn]);

  /** Reload the current path (after an action, or "Try again"). */
  const reload = useCallback(() => {
    setRetrying(true);
    setNonce((n) => n + 1);
  }, []);

  if (!isLive) return { data: sample, error: null, loading: false, retrying: false, reload, call };
  const loading = state.key !== `${path}#${nonce}`;
  return { data: state.data, error: loading ? null : state.error, loading, retrying, reload, call };
}
