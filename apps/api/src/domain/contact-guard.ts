/**
 * Contact-details guard (Terms of Service §8 "Non-circumvention").
 *
 * Students and teachers may not exchange personal contact details (e-mail, phone, links, social
 * handles, messaging apps) on Amerivo: lessons and payments must stay on the platform. Every text a
 * user sends to another user goes through `scanContactDetails`:
 *
 * - `email`, `phone`, `link`, `handle` → the matching text is replaced by `[hidden]` (REDACTED);
 * - `app` (a messaging-app name such as "WhatsApp") → kept as written, but reported, because
 *   naming an app is usually the first step of moving a conversation off the platform.
 *
 * Every finding is recorded for the admins (moderation queue). The scanner is deliberately
 * conservative about false positives: times ("10:30"), prices ("$30"), dates ("2026-10-07"),
 * lesson counts and short numbers are not treated as phone numbers.
 *
 * Detection runs on a normalised copy of the text (Unicode NFKC: full-width digits and letters
 * become ASCII; Arabic-Indic digits become 0–9; zero-width characters are dropped), so
 * "０６ １２…" or "j​ohn@gmail.com" are caught. Redaction is applied to the ORIGINAL text through
 * an index map, so the rest of the message is delivered exactly as typed.
 */

export type ContactFindingType = "email" | "phone" | "link" | "handle" | "app";

export interface ContactFinding {
  type: ContactFindingType;
  /** The offending text as the sender typed it. */
  match: string;
}

export interface ContactScan {
  /** The text to deliver (redacted when needed). */
  text: string;
  findings: ContactFinding[];
  /** true when at least one part of the text was replaced. */
  redacted: boolean;
}

export const REDACTION = "[hidden]";

/** Domains that may be mentioned freely (Amerivo's own). */
const ALLOWED_DOMAINS = ["amerivoenglish.com", "amerivo.com"];

/* ---------------------------------------------------------------- normalisation */

const ZERO_WIDTH = /[­᠎​-‏‪-‮⁠-⁤﻿]/;

/** Normalised text + for each normalised UTF-16 unit, the original [start, end) it came from. */
function normalise(input: string): { text: string; from: number[]; to: number[] } {
  let text = "";
  const from: number[] = [];
  const to: number[] = [];
  let i = 0;
  for (const ch of input) {
    const start = i;
    i += ch.length;
    if (ZERO_WIDTH.test(ch)) continue;
    let n = ch.normalize("NFKC");
    const cp = ch.codePointAt(0)!;
    if (cp >= 0x0660 && cp <= 0x0669) n = String(cp - 0x0660); // Arabic-Indic digits
    else if (cp >= 0x06f0 && cp <= 0x06f9) n = String(cp - 0x06f0); // Extended Arabic-Indic (Persian/Urdu)
    for (let k = 0; k < n.length; k++) {
      text += n[k];
      from.push(start);
      to.push(i);
    }
  }
  return { text: text.toLowerCase(), from, to };
}

/* ---------------------------------------------------------------- patterns */

const TLDS =
  "com|net|org|info|biz|io|co|me|ly|gg|app|dev|link|page|site|online|xyz|live|us|uk|ca|au|fr|ch|de|es|it|nl|be|pt|ru|cn|jp|kr|in|br|mx|ar|ma|dz|tn|eg|sa|ae|tr|pl|ua";
const TLD = `(?:${TLDS})`;

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/g;

/**
 * Top-level domains used in obfuscated e-mail addresses. English words that are also TLDs
 * ("in", "me", "us", "it", "be", "co"…) are left out so "look at this point in the text" stays clean.
 */
const MAIL_TLD = "(?:com|net|org|edu|gov|info|io|fr|ch|de|es|uk|ca|au|nl|pt|ru|cn|jp|kr|br|mx|ar|ma|dz|tn|eg|sa|ae|tr|pl|ua)";
const MAIL_PROVIDERS = "(?:gmail|googlemail|yahoo|hotmail|outlook|icloud|protonmail|proton|aol|yandex|gmx|qq|163|126)";

/**
 * "john (at) gmail (dot) com", "john at gmail.com", "jean arobase hotmail point fr":
 * "at" + a word + "dot"/"." + an e-mail TLD.
 */
const OBFUSCATED_EMAIL = new RegExp(
  String.raw`[a-z0-9._%+-]{2,}\s*[([{]?\s*(?:at|arobase|arroba|собака)\s*[)\]}]?\s*[a-z0-9-]{2,}\s*[([{]?\s*(?:dot|point|punto|точка|\.)\s*[)\]}]?\s*${MAIL_TLD}\b`,
  "g",
);

/** "johnsmith gmail com", "maria hotmail.fr": a user name next to a known e-mail provider, the "@" dropped. */
const PROVIDER_EMAIL = new RegExp(String.raw`[a-z0-9._%+-]{3,}\s+${MAIL_PROVIDERS}\s*(?:dot|point|\.)?\s*${MAIL_TLD}\b`, "g");

const URL = /\b(?:https?:\/\/|www\.)[^\s<>"']+/g;
const BARE_DOMAIN = new RegExp(String.raw`\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9-]+)*\.${TLD}\b(?:\/[^\s<>"']*)?`, "g");
/** Short links of messaging apps: wa.me/…, t.me/…, m.me/… */
const APP_LINK = /\b(?:wa\.me|t\.me|m\.me|telegram\.me|chat\.whatsapp\.com|discord\.gg|signal\.me)\/\S*/g;

/** "@john_doe" (not the "@" of an e-mail address, which is matched first; not "@5pm"). */
const HANDLE = /(?<![a-z0-9._%+-])@[a-z_][a-z0-9_.]{2,29}\b/g;

/** Candidate phone numbers: 8+ digits with spaces, dots, dashes, slashes or brackets between them. */
const PHONE = /(?:\+|\b00)?\(?\d(?:[\s.\-/()]{0,3}\d){7,}/g;
const DATE_LIKE = /^(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}\s*[-–/]\s*\d{4})$/;
/** TLDs that are also common words: a "domain" ending with one needs a 3+ letter name ("it.it" isn't a link). */
const SHORT_WORD_TLDS = new Set(["it", "me", "us", "in", "be", "co", "io", "ly", "gg", "is", "am", "to", "at", "so", "no"]);

/** Names of messaging apps and social networks (several languages and scripts). */
const APPS = [
  "whatsapp",
  "whats app",
  "watsap",
  "wsp",
  "telegram",
  "viber",
  "signal app",
  "wechat",
  "weixin",
  "skype",
  "discord",
  "snapchat",
  "instagram",
  "facebook",
  "messenger",
  "linkedin",
  "kakaotalk",
  "line id",
  "imessage",
  "facetime",
  "zoom link",
  "zoom call",
  "zoom meeting",
  "on zoom",
  "via zoom",
  "google meet",
  "microsoft teams",
  "tiktok",
  "微信",
  "电话号码",
  "手机号",
  "واتساب",
  "واتس اب",
  "تيليجرام",
  "تلغرام",
  "фейсбук",
  "ватсап",
  "вотсап",
  "телеграм",
  "вайбер",
  "инстаграм",
];
const APP = new RegExp(`(?:^|[^a-z0-9])(${APPS.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?=$|[^a-z0-9])`, "g");

/** Digits written as words ("five five five one two three four"), English, French and Spanish. */
const DIGIT_WORDS = new Map<string, number>(
  [
    ["zero", "oh", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"],
    ["zéro", "un", "une", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"],
    ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"],
  ].flatMap((words) => {
    // English has two words for 0 ("zero", "oh"), French two for 1 ("un", "une").
    const values = words.length === 11 ? (words[1] === "oh" ? [0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : [0, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9]) : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    return words.map((w, i) => [w, values[i]] as [string, number]);
  }),
);

/* ---------------------------------------------------------------- scanner */

type Span = { start: number; end: number; type: ContactFindingType };

function collect(re: RegExp, text: string, type: ContactFindingType, accept: (m: string) => boolean = () => true, group = 0): Span[] {
  const out: Span[] = [];
  re.lastIndex = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const value = m[group];
    if (value === undefined) continue;
    const start = m.index + m[0].indexOf(value);
    if (accept(value)) out.push({ start, end: start + value.length, type });
    if (m[0].length === 0) re.lastIndex++;
  }
  return out;
}

const isAllowedDomain = (s: string) => {
  const host = s
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];
  return ALLOWED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
};

/** "12 13 14 15", "1 2 3 4 5 6 7 8": page or exercise numbers, not a phone number. */
const isCounting = (groups: number[]) => groups.length >= 3 && groups.every((g, i) => i === 0 || g === groups[i - 1] + 1);

function phoneSpans(text: string): Span[] {
  return collect(PHONE, text, "phone", (m) => {
    const trimmed = m.trim();
    if (DATE_LIKE.test(trimmed)) return false;
    const digits = trimmed.replace(/\D/g, "");
    if (/^[\d ]+$/.test(trimmed) && isCounting(trimmed.split(/ +/).map(Number))) return false;
    return digits.length >= 8 && digits.length <= 15;
  });
}

function spelledPhoneSpans(text: string): Span[] {
  const out: Span[] = [];
  const word = /[a-zéèêáíóúñ]+|\d+/g; // whole numbers: "2026" must break a run, not count as four digits
  let run: { start: number; end: number; values: number[] } | null = null;
  const flush = () => {
    // 8+ digits, but not plain counting ("one two three … nine" in a lesson).
    if (run && run.values.length >= 8 && !isCounting(run.values)) out.push({ start: run.start, end: run.end, type: "phone" });
    run = null;
  };
  let lastEnd = 0;
  for (let m = word.exec(text); m; m = word.exec(text)) {
    const between = text.slice(lastEnd, m.index);
    const value = DIGIT_WORDS.get(m[0]) ?? (/^\d$/.test(m[0]) ? Number(m[0]) : undefined);
    if (value !== undefined && run && /^[\s,.\-]*$/.test(between)) {
      run.end = m.index + m[0].length;
      run.values.push(value);
    } else {
      flush();
      if (value !== undefined) run = { start: m.index, end: m.index + m[0].length, values: [value] };
    }
    lastEnd = m.index + m[0].length;
  }
  flush();
  return out;
}

/**
 * Filters bare-domain matches that are really two sentences glued together ("I agree.Me too",
 * "I like it.It is good"): the part after a dot starts with a capital letter in the original text,
 * or the name before a word-like TLD is shorter than 3 letters.
 */
function looksLikeDomain(input: string, n: { text: string; from: number[] }, sp: Span) {
  const host = n.text.slice(sp.start, sp.end).split("/")[0];
  const labels = host.split(".");
  const tld = labels[labels.length - 1];
  if (SHORT_WORD_TLDS.has(tld) && labels[labels.length - 2].length < 3) return false;
  let offset = sp.start;
  for (const label of labels.slice(0, -1)) {
    offset += label.length + 1; // index just after the dot
    const ch = input[n.from[offset]];
    if (ch && ch !== ch.toLowerCase()) return false;
  }
  return true;
}

/** Overlapping spans are merged; the more severe type wins (email > link > phone > handle > app). */
function merge(spans: Span[]): Span[] {
  const rank: Record<ContactFindingType, number> = { email: 5, link: 4, phone: 3, handle: 2, app: 1 };
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Span[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && s.start < last.end) {
      last.end = Math.max(last.end, s.end);
      if (rank[s.type] > rank[last.type]) last.type = s.type;
    } else out.push({ ...s });
  }
  return out;
}

/** Finds and redacts contact details. Safe on any input (empty, very long, any script). */
export function scanContactDetails(input: string): ContactScan {
  if (!input) return { text: input, findings: [], redacted: false };
  const n = normalise(input);
  const t = n.text;

  const hard = merge([
    ...collect(EMAIL, t, "email"),
    ...collect(OBFUSCATED_EMAIL, t, "email"),
    ...collect(PROVIDER_EMAIL, t, "email"),
    ...collect(APP_LINK, t, "link"),
    ...collect(URL, t, "link", (m) => !isAllowedDomain(m)),
    ...collect(BARE_DOMAIN, t, "link", (m) => !isAllowedDomain(m)).filter((sp) => looksLikeDomain(input, n, sp)),
    ...collect(HANDLE, t, "handle"),
    ...phoneSpans(t),
    ...spelledPhoneSpans(t),
  ]);
  const apps = collect(APP, t, "app", () => true, 1).filter((a) => !hard.some((h) => a.start < h.end && h.start < a.end));

  // Map normalised spans back to the original text.
  const orig = (s: Span) => ({ start: n.from[s.start], end: n.to[s.end - 1], type: s.type });
  const hardOrig = hard.map(orig);
  const findings: ContactFinding[] = [...hardOrig, ...apps.map(orig)]
    .sort((a, b) => a.start - b.start)
    .map((s) => ({ type: s.type, match: input.slice(s.start, s.end) }));

  let text = input;
  for (const s of [...hardOrig].sort((a, b) => b.start - a.start)) text = text.slice(0, s.start) + REDACTION + text.slice(s.end);
  return { text, findings, redacted: hardOrig.length > 0 };
}

/** Distinct finding types, for storage and display. */
export const findingTypes = (f: ContactFinding[]) => [...new Set(f.map((x) => x.type))];
