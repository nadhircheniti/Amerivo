"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { isRtl } from "@/i18n/config";
import { cn } from "@/lib/cn";
import type { ChatMessage, ClassroomLesson, SharedFile } from "../_data";
import { LocalIcon } from "./local-icons";

type TabId = "chat" | "notes" | "files";
const tabs: { id: TabId; labelKey: "chat" | "notes" | "files" }[] = [
  { id: "chat", labelKey: "chat" },
  { id: "notes", labelKey: "notes" },
  { id: "files", labelKey: "files" },
];

export function SidePanel({ lesson }: { lesson: ClassroomLesson }) {
  const t = useTranslations("classroom.panel");
  const rtl = isRtl(useLocale());
  const [tab, setTab] = useState<TabId>("chat");
  const uid = useId();
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ chat: null, notes: null, files: null });

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    // Arrow keys follow the reading direction (reversed in right-to-left languages).
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    const delta = e.key === forward ? 1 : e.key === back ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = tabs[(index + delta + tabs.length) % tabs.length].id;
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <aside aria-label={t("label")} className="flex min-h-[480px] w-full shrink-0 flex-col overflow-hidden rounded-t-[20px] bg-white text-navy lg:min-h-0 lg:w-[380px]">
      <div role="tablist" aria-label={t("label")} className="m-3.5 flex gap-1 rounded-[14px] bg-beige p-2">
        {tabs.map((tb, i) => (
          <button
            key={tb.id}
            ref={(el) => {
              tabRefs.current[tb.id] = el;
            }}
            type="button"
            role="tab"
            id={`${uid}-tab-${tb.id}`}
            aria-selected={tab === tb.id}
            aria-controls={`${uid}-panel-${tb.id}`}
            tabIndex={tab === tb.id ? 0 : -1}
            onClick={() => setTab(tb.id)}
            onKeyDown={(e) => onTabKey(e, i)}
            className={cn("h-[42px] flex-1 rounded-[10px] text-sm text-navy", tab === tb.id ? "bg-white font-semibold shadow-[0_2px_6px_rgb(15_59_91/0.1)]" : "hover:bg-white/60")}
          >
            {t(tb.labelKey)}
          </button>
        ))}
      </div>

      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${uid}-panel-${t.id}`}
          aria-labelledby={`${uid}-tab-${t.id}`}
          hidden={tab !== t.id}
          className="min-h-0 flex-1 flex-col data-[active=true]:flex"
          data-active={tab === t.id}
        >
          {t.id === "chat" && <ChatTab lesson={lesson} />}
          {t.id === "notes" && <NotesTab initial={lesson.notes} />}
          {t.id === "files" && <FilesTab initial={lesson.files} />}
        </div>
      ))}
    </aside>
  );
}

function ChatTab({ lesson }: { lesson: ClassroomLesson }) {
  const t = useTranslations("classroom.panel");
  const [messages, setMessages] = useState<ChatMessage[]>(lesson.chat);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    // TODO(daily): broadcast via call.sendAppMessage() and persist through apps/api.
    setMessages((m) => [...m, { id: `local-${Date.now()}`, from: "me", text }]);
    setDraft("");
  }

  return (
    <>
      <div ref={listRef} role="log" aria-label={t("chatMessages")} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-[18px] py-1">
        {messages.map((m) =>
          m.from === "teacher" ? (
            <div key={m.id} className="max-w-[280px] self-start rounded-[14px] rounded-es-[4px] bg-beige px-3.5 py-2.5 text-sm leading-normal">
              <strong className="block text-xs text-teal-dark">{lesson.teacher.firstName}</strong>
              <span dir="auto" className="block">
                {m.text}
              </span>
            </div>
          ) : (
            <div key={m.id} className="max-w-[280px] self-end rounded-[14px] rounded-ee-[4px] bg-navy px-3.5 py-2.5 text-sm leading-normal text-white">
              <span className="sr-only">{t("youPrefix")} </span>
              <span dir="auto" className="block">
                {m.text}
              </span>
            </div>
          ),
        )}
      </div>
      <form onSubmit={send} className="m-3.5 flex h-[50px] items-center gap-2 rounded-full border border-line ps-[18px] pe-1.5 focus-within:border-teal-dark">
        <label htmlFor={inputId} className="sr-only">
          {t("chatMessage")}
        </label>
        <input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("messagePlaceholder", { name: lesson.teacher.firstName })}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm text-navy placeholder:text-muted focus:outline-none"
        />
        <button
          type="submit"
          aria-label={t("send")}
          disabled={!draft.trim()}
          className="flex size-10 items-center justify-center rounded-full bg-teal-dark text-white disabled:opacity-40"
        >
          <LocalIcon name="send" size={18} />
        </button>
      </form>
    </>
  );
}

function NotesTab({ initial }: { initial: string }) {
  const t = useTranslations("classroom.panel");
  const id = useId();
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-[18px] pt-1 pb-[18px]">
      <label htmlFor={id} className="text-[13px] text-muted">
        {t("notesLabel")}
      </label>
      {/* TODO(api): sync notes between participants and autosave to the lesson record. */}
      <textarea
        id={id}
        defaultValue={initial}
        className="min-h-[260px] flex-1 resize-none rounded-[14px] border border-line p-4 text-sm leading-[1.7] text-navy focus:border-teal-dark focus:outline-none"
      />
    </div>
  );
}

const kindTone: Record<SharedFile["kind"], string> = {
  PDF: "bg-orange-100 text-orange-dark",
  MP3: "bg-sky-100 text-sky",
  DOC: "bg-lilac-100 text-lilac",
  IMG: "bg-teal-100 text-teal-dark",
  FILE: "bg-sand text-navy",
};

function kindOf(name: string): SharedFile["kind"] {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "PDF";
  if (["mp3", "wav", "m4a"].includes(ext)) return "MP3";
  if (["doc", "docx", "txt"].includes(ext)) return "DOC";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "IMG";
  return "FILE";
}

function FilesTab({ initial }: { initial: SharedFile[] }) {
  const t = useTranslations("classroom.panel");
  const [files, setFiles] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-1 flex-col gap-2.5 px-[18px] pt-1 pb-[18px]">
      <ul className="flex flex-col gap-2.5" aria-label={t("sharedFiles")}>
        {files.map((f) => (
          <li key={f.id} className="flex items-center gap-3 rounded-xl bg-beige p-3">
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[10px] text-xs font-bold", kindTone[f.kind])} aria-hidden="true">
              {f.kind}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
          </li>
        ))}
      </ul>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          // TODO(api): upload to lesson storage; this only lists the file locally.
          setFiles((cur) => [...cur, ...picked.map((p, i) => ({ id: `u-${Date.now()}-${i}`, name: p.name, kind: kindOf(p.name) }))]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-1.5 flex h-12 items-center justify-center gap-2 rounded-full border border-dashed border-teal-dark bg-teal-50 font-semibold text-navy hover:bg-teal-100"
      >
        <LocalIcon name="upload" size={18} />
        {t("upload")}
      </button>
    </div>
  );
}
