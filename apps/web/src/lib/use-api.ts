"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
import { ApiError, apiFetch, TERMS_REQUIRED } from "./api";
import { clerkEnabled } from "./auth-config";

/** Where a signed-in user who hasn't accepted the current Terms of Service is sent (then back here). */
export const acceptTermsUrl = (next: string) => `/accept-terms?${new URLSearchParams({ next })}`;

/** Any API call refused with "terms_required" sends the user to the acceptance screen. */
function redirectIfTermsRequired(e: unknown): never {
  if (e instanceof ApiError && e.code === TERMS_REQUIRED && typeof window !== "undefined" && window.location.pathname !== "/accept-terms") {
    window.location.assign(acceptTermsUrl(window.location.pathname + window.location.search));
  }
  throw e;
}

/** Returns a fetcher that adds the Clerk session token when Clerk is enabled. */
function useClerkApi() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const call = useCallback(async <T>(path: string, init: RequestInit = {}) => apiFetch<T>(path, { ...init, token: await getToken() }).catch(redirectIfTermsRequired), [getToken]);
  return { call, isSignedIn: !!isSignedIn, isLoaded };
}

function useNoAuthApi() {
  const call = useCallback(<T>(path: string, init: RequestInit = {}) => apiFetch<T>(path, init).catch(redirectIfTermsRequired), []);
  return {
    call,
    isSignedIn: !!process.env.NEXT_PUBLIC_DEV_USER,
    isLoaded: true,
  };
}

/**
 * `clerkEnabled` is a build-time constant, so the same hook is always called for a given build.
 * Without Clerk (demo / dev), useAuth() would throw because there is no <ClerkProvider>.
 */
export const useApi = clerkEnabled ? useClerkApi : useNoAuthApi;
