"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Select } from "./form";

const noop = () => () => {};
const useIsBrowser = () => useSyncExternalStore(noop, () => true, () => false);

/** Every IANA time zone the browser knows ("America/Indiana/Indianapolis"…), the current value first if unknown. */
export function TimeZoneSelect({ value, onChange, id, disabled }: { value: string; onChange: (v: string) => void; id?: string; disabled?: boolean }) {
  const browser = useIsBrowser();
  const zones = useMemo(() => {
    if (!browser) return [value];
    let list: string[] = [];
    try {
      list = Intl.supportedValuesOf("timeZone");
    } catch {
      list = [];
    }
    return list.includes(value) ? list : [value, ...list];
  }, [browser, value]);
  return (
    <Select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      {zones.map((z) => (
        <option key={z} value={z}>
          {z.replace(/_/g, " ")}
        </option>
      ))}
    </Select>
  );
}
