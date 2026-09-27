"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
import { apiFetch } from "./api";
import { clerkEnabled } from "./auth-config";

/** Returns a fetcher that adds the Clerk session token when Clerk is enabled. */
function useClerkApi() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const call = useCallback(async <T>(path: string, init: RequestInit = {}) => apiFetch<T>(path, { ...init, token: await getToken() }), [getToken]);
  return { call, isSignedIn: !!isSignedIn, isLoaded };
}

function useNoAuthApi() {
  const call = useCallback(<T>(path: string, init: RequestInit = {}) => apiFetch<T>(path, init), []);
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
