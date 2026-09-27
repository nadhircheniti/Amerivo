"use client";

import { API_URL } from "@/lib/api";
import { LiveApply } from "./live-gate";
import { Wizard } from "./wizard";

/** Demo mode (no API): the mock wizard on local state. Otherwise the application saved through the API. */
export function ApplyWizard() {
  return API_URL ? <LiveApply /> : <Wizard />;
}
