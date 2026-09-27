"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

/** Accessible modal on the native <dialog> (focus trap, Esc to close, backdrop). */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const t = useTranslations("student.states");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(520px,calc(100vw-32px))] rounded-3xl bg-white p-0 text-navy backdrop:bg-navy/50"
    >
      {open && (
        <div className="flex flex-col gap-4 p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-[20px] font-bold">
              {title}
            </h2>
            <button type="button" onClick={onClose} className="-m-1 rounded-full p-1 text-muted hover:text-navy" aria-label={t("close")}>
              <Icon name="x" size={20} />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
