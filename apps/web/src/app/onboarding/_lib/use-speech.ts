"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Reads the listening clips aloud with the browser's built-in voices (American English preferred).
 * Dialogue lines starting with "A:" / "B:" are read by two different voices when available.
 * Long texts are queued sentence by sentence (Chrome stops utterances longer than ~15 s).
 */
const PREFERRED = [/Samantha/i, /Google US English/i, /Microsoft (Aria|Jenny|Guy|Zira|Mark)/i, /Alex/i];

function pickVoices(voices: SpeechSynthesisVoice[]) {
  const us = voices.filter((v) => /^en[-_]US/i.test(v.lang));
  const en = us.length ? us : voices.filter((v) => /^en/i.test(v.lang));
  const sorted = [...en].sort((a, b) => score(b) - score(a));
  const first = sorted[0] ?? null;
  const second = sorted.find((v) => v !== first && v.name.split(" ")[0] !== first?.name.split(" ")[0]) ?? first;
  return { a: first, b: second };
}
const score = (v: SpeechSynthesisVoice) => {
  const i = PREFERRED.findIndex((re) => re.test(v.name));
  return (i === -1 ? 0 : 10 - i) + (v.localService ? 1 : 0);
};

const sentences = (text: string) =>
  text
    .match(/[^.!?]+[.!?]*\s*/g)
    ?.map((s) => s.trim())
    .filter(Boolean) ?? [text];

export type SpeechState = "unsupported" | "loading" | "ready" | "speaking";

export function useSpeech() {
  // Only rendered in the browser (after the test has loaded), so reading `window` here is safe.
  const [state, setState] = useState<SpeechState>(() => (typeof window !== "undefined" && "speechSynthesis" in window ? "loading" : "unsupported"));
  const voices = useRef<{ a: SpeechSynthesisVoice | null; b: SpeechSynthesisVoice | null }>({ a: null, b: null });

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const load = () => {
      const v = pickVoices(synth.getVoices());
      voices.current = v;
      if (v.a) setState((s) => (s === "speaking" ? s : "ready"));
    };
    load();
    synth.addEventListener("voiceschanged", load);
    // Some browsers never fire voiceschanged when no voice exists.
    const timer = setTimeout(() => setState((s) => (s === "loading" ? (voices.current.a ? "ready" : "unsupported") : s)), 2500);
    return () => {
      synth.removeEventListener("voiceschanged", load);
      clearTimeout(timer);
      synth.cancel();
    };
  }, []);

  const speak = useCallback((script: string, rate = 1) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const parts: { voice: SpeechSynthesisVoice | null; text: string }[] = [];
    for (const line of script.split("\n")) {
      const m = line.match(/^\s*([AB]):\s*(.*)$/);
      const voice = m ? (m[1] === "B" ? voices.current.b : voices.current.a) : voices.current.a;
      for (const s of sentences(m ? m[2] : line)) parts.push({ voice, text: s });
    }
    if (!parts.length) return;
    setState("speaking");
    parts.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p.text);
      if (p.voice) u.voice = p.voice;
      u.lang = p.voice?.lang ?? "en-US";
      u.rate = rate;
      if (i === parts.length - 1) {
        u.onend = () => setState("ready");
        u.onerror = () => setState("ready");
      }
      synth.speak(u);
    });
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setState((s) => (s === "speaking" ? "ready" : s));
  }, []);

  return { state, speak, stop };
}
