// Checks that every language has exactly the same message keys and placeholders as English.
// Usage: node scripts/check-i18n.mjs [namespace...]
import fs from "node:fs";
import path from "node:path";

const dir = path.join(import.meta.dirname, "..", "messages");
const locales = ["en", "es", "fr", "ar", "zh", "ru"];
const all = fs.readdirSync(path.join(dir, "en")).map((f) => f.replace(/\.json$/, ""));
const namespaces = process.argv.slice(2).length ? process.argv.slice(2) : all;

const flat = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, `${prefix}${k}.`) : [[`${prefix}${k}`, String(v)]]));
// Top-level ICU arguments only ({name} or {count, plural, …}), not words inside plural branches.
const args = (s) => {
  const out = new Set();
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "{") {
      if (depth === 0) out.add(s.slice(i + 1).match(/^\s*([A-Za-z0-9_]+)/)?.[1]);
      depth++;
    } else if (s[i] === "}") depth--;
  }
  out.delete(undefined);
  return [...out].sort().join(",");
};
const tags = (s) => [...s.matchAll(/<(\w+)>/g)].map((m) => m[1]).sort().join(",");

let problems = 0;
for (const ns of namespaces) {
  const read = (l) => JSON.parse(fs.readFileSync(path.join(dir, l, `${ns}.json`), "utf8"));
  const en = new Map(flat(read("en")));
  for (const l of locales.slice(1)) {
    let other;
    try {
      other = new Map(flat(read(l)));
    } catch (e) {
      console.log(`✗ ${l}/${ns}.json: ${e.message}`);
      problems++;
      continue;
    }
    for (const k of en.keys()) if (!other.has(k)) (console.log(`✗ ${l}/${ns}: missing ${k}`), problems++);
    for (const k of other.keys()) if (!en.has(k)) (console.log(`✗ ${l}/${ns}: extra ${k}`), problems++);
    for (const [k, v] of en) {
      const o = other.get(k);
      if (o === undefined) continue;
      if (args(v) !== args(o)) (console.log(`✗ ${l}/${ns}: ${k} placeholders {${args(v)}} vs {${args(o)}}`), problems++);
      if (tags(v) !== tags(o)) (console.log(`✗ ${l}/${ns}: ${k} tags <${tags(v)}> vs <${tags(o)}>`), problems++);
      if (!o.trim()) (console.log(`✗ ${l}/${ns}: ${k} is empty`), problems++);
    }
  }
  console.log(`${ns}: ${en.size} keys`);
}
if (problems) {
  console.log(`\n${problems} problem(s)`);
  process.exit(1);
}
console.log("\nAll languages match English.");
