"use client";

import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { TeacherProfile } from "../_data";

export type ApiCall = <T>(path: string, init?: RequestInit) => Promise<T>;

/** Live mode (API_URL set, teacher signed in): the saved profile and the authenticated fetcher. */
export type LiveApplication = {
  profile: TeacherProfile;
  setProfile: Dispatch<SetStateAction<TeacherProfile>>;
  call: ApiCall;
  /** Reason given by Stripe for a failed verification (last sync). */
  identityReason: string | null;
  setIdentityReason: (r: string | null) => void;
};

export const LiveContext = createContext<LiveApplication | null>(null);

/** null in demo mode. */
export const useLive = () => useContext(LiveContext);

/** Fired by the header's "Save & exit"; the wizard cancels it when it handles the save itself. */
export const SAVE_EXIT_EVENT = "amerivo:apply-save-exit";
