import { createHash } from "node:crypto";
import { TEACHER_AGREEMENT_MARKDOWN } from "./teacher-agreement.text";

/**
 * Version of the Independent Teacher Agreement in force (its effective date). A new version asks
 * every teacher to sign again. Keep in sync with the text in teacher-agreement.text.ts.
 */
export const TEACHER_AGREEMENT_VERSION = "2026-10-15";

/** SHA-256 of the exact text signed: stored with each signature as proof of what was accepted. */
export const TEACHER_AGREEMENT_SHA256 = createHash("sha256").update(TEACHER_AGREEMENT_MARKDOWN, "utf8").digest("hex");

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
/** **bold** → <strong>, everything else escaped (the text is ours, but it is still never trusted as HTML). */
const inlineHtml = (s: string) => escapeHtml(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

/**
 * The small Markdown subset the agreement uses → HTML: # / ## headings, paragraphs, "1." and "-"
 * lists, **bold**. Used for the page the teacher reads and for the e-mailed signed copy.
 */
export function agreementHtml(md = TEACHER_AGREEMENT_MARKDOWN): string {
  const out: string[] = [];
  let list: "ol" | "ul" | null = null;
  const close = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    const ul = /^-\s+(.*)$/.exec(line);
    if (ol || ul) {
      const kind = ol ? "ol" : "ul";
      if (list !== kind) {
        close();
        out.push(`<${kind}>`);
        list = kind;
      }
      out.push(`<li>${inlineHtml((ol ?? ul)![1])}</li>`);
      continue;
    }
    close();
    if (!line) continue;
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) out.push(`<h${h[1].length}>${inlineHtml(h[2])}</h${h[1].length}>`);
    else out.push(`<p>${inlineHtml(line)}</p>`);
  }
  close();
  return out.join("\n");
}

/** Plain-text version (e-mail clients that don't show HTML). */
export function agreementText(md = TEACHER_AGREEMENT_MARKDOWN): string {
  return md.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#{1,3}\s+/gm, "").trim();
}

/** Lower-case, no accents, single spaces: "  José   García " → "jose garcia". */
export function normalizeName(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z' -]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * The typed signature must contain the first and the last name of the account (a middle name or
 * a different order is fine): it ties the signature to the verified account holder.
 */
export function signatureMatchesAccount(typed: string, firstName: string, lastName: string) {
  const words = new Set(normalizeName(typed).split(" ").filter(Boolean));
  const needed = normalizeName(`${firstName} ${lastName}`).split(" ").filter(Boolean);
  return needed.length > 0 && needed.every((w) => words.has(w));
}
