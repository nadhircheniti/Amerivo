"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Avatar } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { conversations, type Conversation, type ThreadItem } from "./_data";

const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const extOf = (name: string) => name.split(".").pop()?.toUpperCase() ?? "FILE";

function Bubble({ item, name }: { item: ThreadItem; name: string }) {
  if (item.kind === "day") {
    return <span className="self-center rounded-full bg-line-soft px-3 py-1 text-xs text-muted">{item.label}</span>;
  }
  const mine = item.from === "me";
  if (item.kind === "text") {
    return (
      <p
        className={cn(
          "max-w-[520px] px-[18px] py-3.5 text-[15px] leading-relaxed whitespace-pre-wrap",
          mine ? "self-end rounded-[18px_18px_4px_18px] bg-navy text-white" : "self-start rounded-[18px_18px_18px_4px] bg-white",
        )}
      >
        <span className="sr-only">{mine ? "You: " : `${name}: `}</span>
        {item.text}
      </p>
    );
  }
  if (item.kind === "homework") {
    return (
      <div className="flex w-full max-w-[340px] items-center gap-3 self-end rounded-[18px] bg-navy p-3.5 text-white">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/14">
          <Icon name="book" size={22} className="text-yellow" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{item.title}</p>
          <p className="truncate text-xs text-ink-soft">{item.file}</p>
        </div>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex w-full max-w-[340px] items-center gap-3 rounded-[18px] p-3.5",
        mine ? "self-end bg-navy text-white" : "self-start border border-sand bg-white",
      )}
    >
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", mine ? "bg-white/14" : "bg-orange-100 text-orange-dark")}>
        <Icon name="file" size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{item.name}</p>
        <p className={cn("text-xs", mine ? "text-ink-soft" : "text-muted")}>{item.meta}</p>
      </div>
      {!mine && (
        // TODO(api): signed download URL for the attachment.
        <a href="#" className="text-sm font-semibold text-teal-dark hover:text-navy" aria-label={`Open ${item.name}`}>
          Open
        </a>
      )}
    </div>
  );
}

function InfoPanel({ c }: { c: Conversation }) {
  return (
    <aside className="hidden w-[300px] shrink-0 flex-col gap-5 overflow-y-auto border-l border-sand bg-white px-6 py-7 xl:flex" aria-label="Conversation details">
      <div className="flex flex-col items-center gap-2.5 text-center">
        <Avatar initials={c.initials} tone={c.tone} size={88} />
        <h2 className="text-lg font-bold">{c.name}</h2>
        <p className="inline-flex items-center gap-1 text-sm text-muted">
          {c.subtitle}
          {c.teacherSlug && <Icon name="star" size={14} className="text-orange" />}
        </p>
        {c.teacherSlug && (
          <Link href={`/teachers/${c.teacherSlug}`} className="text-sm font-semibold text-teal-dark hover:text-navy">
            View profile
          </Link>
        )}
      </div>
      {c.sharedFiles.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-line-soft pt-[18px]">
          <h3 className="text-sm font-bold">Shared files</h3>
          <ul className="flex flex-col gap-3 text-sm">
            {c.sharedFiles.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Icon name="file" size={16} className="shrink-0 text-muted" />
                <span className="truncate">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {c.together && (
        <div className="flex flex-col gap-2 border-t border-line-soft pt-[18px] text-sm">
          <h3 className="text-sm font-bold">Together so far</h3>
          <p className="text-navy-soft">{c.together}</p>
        </div>
      )}
    </aside>
  );
}

export function MessagesView() {
  const [activeId, setActiveId] = useState(conversations[0].id);
  const [query, setQuery] = useState("");
  const [read, setRead] = useState<Set<string>>(() => new Set([conversations[0].id]));
  const [threads, setThreads] = useState<Record<string, ThreadItem[]>>(() => Object.fromEntries(conversations.map((c) => [c.id, c.thread])));
  const [draft, setDraft] = useState("");
  const [mobilePane, setMobilePane] = useState<"list" | "thread">("thread");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];
  const thread = threads[active.id];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.name.toLowerCase().includes(q) || threads[c.id].some((m) => m.kind === "text" && m.text.toLowerCase().includes(q)));
  }, [query, threads]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [thread.length, activeId]);

  const append = (item: ThreadItem) => setThreads((t) => ({ ...t, [active.id]: [...t[active.id], item] }));

  const open = (id: string) => {
    setActiveId(id);
    setRead((r) => new Set(r).add(id));
    setMobilePane("thread");
  };

  const lastPreview = (c: Conversation) => {
    const items = threads[c.id];
    const own = items.slice(c.thread.length).reverse().find((m) => m.kind === "text" || m.kind === "file");
    if (!own) return c.preview;
    return own.kind === "text" ? `You: ${own.text}` : own.kind === "file" ? `You sent ${own.name}` : c.preview;
  };

  return (
    <div className="flex h-dvh min-h-[560px] md:h-screen">
      {/* Conversation list */}
      <section
        className={cn("w-full shrink-0 flex-col border-r border-sand bg-white lg:flex lg:w-[340px] xl:w-[360px]", mobilePane === "list" ? "flex" : "hidden")}
        aria-labelledby="messages-title"
      >
        <div className="flex flex-col gap-3.5 px-6 pt-7 pb-4">
          <h1 id="messages-title" className="text-[26px] font-extrabold">
            Messages
          </h1>
          <label className="flex h-[46px] items-center gap-2.5 rounded-xl bg-beige px-3.5 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-teal">
            <Icon name="search" size={18} className="text-muted" />
            <span className="sr-only">Search messages</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-navy outline-none placeholder:text-muted"
            />
          </label>
        </div>
        <ul className="flex-1 overflow-y-auto" aria-label="Conversations">
          {filtered.map((c) => {
            const isActive = c.id === active.id;
            const unread = c.unread && !read.has(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => open(c.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "flex w-full gap-3 border-l-4 px-6 py-4 text-left text-navy",
                    isActive ? "border-teal-dark bg-teal-50" : "border-transparent hover:bg-beige",
                  )}
                >
                  <Avatar initials={c.initials} tone={c.tone} size={48} online={c.online} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex justify-between gap-2">
                      <span className="font-semibold">{c.name}</span>
                      <span className="shrink-0 text-xs text-muted">{c.time}</span>
                    </span>
                    <span className={cn("truncate text-sm", unread ? "font-semibold text-navy" : isActive ? "text-navy-soft" : "text-muted")}>{lastPreview(c)}</span>
                  </span>
                  {unread && (
                    <span className="size-2.5 shrink-0 self-center rounded-full bg-orange-dark">
                      <span className="sr-only">Unread</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && <li className="px-6 py-4 text-sm text-muted">No conversations match &ldquo;{query}&rdquo;.</li>}
        </ul>
      </section>

      {/* Thread */}
      <section className={cn("min-w-0 flex-1 flex-col lg:flex", mobilePane === "thread" ? "flex" : "hidden")} aria-label={`Conversation with ${active.name}`}>
        <div className="flex min-h-[84px] items-center gap-3.5 border-b border-sand bg-white px-4 py-3 sm:px-7">
          <button
            type="button"
            onClick={() => setMobilePane("list")}
            className="-ml-1 inline-flex size-10 items-center justify-center rounded-full text-navy hover:bg-beige lg:hidden"
            aria-label="Back to conversations"
          >
            <Icon name="chevronLeft" />
          </button>
          <Avatar initials={active.initials} tone={active.tone} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{active.name}</p>
            <p className={cn("truncate text-[13px]", active.online ? "text-teal-dark" : "text-muted")}>{active.status}</p>
          </div>
          {active.nextLesson && (
            <ButtonLink href={`/classroom/${active.nextLesson.id}`} variant="teal" size="sm" className="shrink-0 px-[18px]">
              {active.nextLesson.label}
            </ButtonLink>
          )}
        </div>

        <div ref={scrollRef} className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-7" role="log" aria-live="polite" aria-label="Messages">
          {thread.map((item) => (
            <Bubble key={item.id} item={item} name={active.name} />
          ))}
        </div>

        <form
          className="flex items-center gap-3 px-4 pt-[18px] pb-6 sm:px-7"
          onSubmit={(e) => {
            e.preventDefault();
            const text = draft.trim();
            if (!text) return;
            // TODO(api): POST /conversations/:id/messages (optimistic append for now).
            append({ id: `local-${Date.now()}`, kind: "text", from: "me", text });
            setDraft("");
          }}
        >
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) append({ id: `local-${Date.now()}`, kind: "file", from: "me", name: f.name, meta: `${extOf(f.name)} · ${formatSize(f.size)}` });
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Attach a file"
            className="inline-flex size-[50px] shrink-0 items-center justify-center rounded-full border border-line bg-white text-navy hover:bg-beige"
          >
            <Icon name="paperclip" />
          </button>
          <label className="flex h-[54px] min-w-0 flex-1 items-center rounded-full border border-line bg-white px-5 focus-within:border-teal-dark">
            <span className="sr-only">Message</span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message…"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-navy outline-none placeholder:text-muted"
            />
          </label>
          <button
            type="submit"
            aria-label="Send"
            disabled={!draft.trim()}
            className="inline-flex size-[54px] shrink-0 items-center justify-center rounded-full bg-orange text-navy hover:bg-[#ffa64d] disabled:opacity-60"
          >
            <Icon name="arrowRight" size={22} strokeWidth={2} />
          </button>
        </form>
      </section>

      <InfoPanel c={active} />
    </div>
  );
}
