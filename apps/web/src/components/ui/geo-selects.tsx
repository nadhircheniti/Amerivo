"use client";

import { useLocale } from "next-intl";
import { useMemo, useSyncExternalStore, type ComponentProps } from "react";
import { Select } from "@/components/ui/form";
import { countryOptions, DIAL_CODES, languageOptions } from "@/lib/countries";

type SelectProps = Omit<ComponentProps<"select">, "children"> & { placeholder: string };

/**
 * Country and language names come from the browser (Intl.DisplayNames). The server's list can differ
 * slightly, so the options are only built in the browser (the server renders the placeholder).
 */
const noop = () => () => {};
const useIsBrowser = () => useSyncExternalStore(noop, () => true, () => false);

/** All countries, named in the visitor's language, alphabetical. Value = English name (or ISO code with `valueAs="code"`). */
export function CountrySelect({ placeholder, valueAs = "name", ...props }: SelectProps & { valueAs?: "name" | "code" }) {
  const locale = useLocale();
  const browser = useIsBrowser();
  const options = useMemo(() => (browser ? countryOptions(locale) : []), [browser, locale]);
  return (
    <Select {...props}>
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o.code} value={valueAs === "code" ? o.code : o.value} data-code={o.code}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

/** Widely spoken languages, named in the visitor's language. Value = English name. */
export function LanguageSelect({ placeholder, ...props }: SelectProps) {
  const locale = useLocale();
  const browser = useIsBrowser();
  const options = useMemo(() => (browser ? languageOptions(locale) : []), [browser, locale]);
  return (
    <Select {...props}>
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o.code} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

/** International dialing code of every country ("+33 · France"); value = "+33". */
export function DialCodeSelect({ placeholder, ...props }: SelectProps) {
  const locale = useLocale();
  const browser = useIsBrowser();
  const options = useMemo(() => (browser ? countryOptions(locale) : []), [browser, locale]);
  return (
    <Select {...props}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.code} value={`+${DIAL_CODES[o.code]}`}>
          {`+${DIAL_CODES[o.code]} · ${o.label}`}
        </option>
      ))}
    </Select>
  );
}

/** Dialing code of the country chosen in a CountrySelect change event. */
export const dialCodeFromEvent = (e: { target: HTMLSelectElement }) => {
  const code = e.target.selectedOptions[0]?.dataset.code;
  return code && DIAL_CODES[code] ? `+${DIAL_CODES[code]}` : "";
};
