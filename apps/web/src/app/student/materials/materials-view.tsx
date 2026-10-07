"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useFiles } from "@/components/ui/file-upload";
import { Icon } from "@/components/ui/icon";
import { fileSize, type Material } from "@/components/materials/types";
import { intlTags, type Locale } from "@/i18n/config";
import { ApiError } from "@/lib/api";
import { EmptyState, Loadable, PageHeader } from "../_components/states";
import { useStudentData } from "../_lib/use-student-data";

export function StudentMaterials() {
  const t = useTranslations("student.materials");
  const locale = useLocale() as Locale;
  const tag = intlTags[locale];
  const state = useStudentData<Material[]>("/student/materials", () => []);
  const { open } = useFiles();
  const [error, setError] = useState<string | null>(null);
  const date = (iso: string) => new Intl.DateTimeFormat(tag, { dateStyle: "medium" }).format(new Date(iso));

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
      <PageHeader title={t("title")} description={t("description")} />
      {error && (
        <p role="alert" className="rounded-2xl bg-danger-100 px-4 py-3 text-sm text-danger-text">
          {error}
        </p>
      )}
      <Loadable state={state}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState icon="file" title={t("emptyTitle")} text={t("emptyText")} />
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((m) => (
                <li key={m.id} className="flex flex-col gap-3 rounded-3xl bg-white p-5 sm:flex-row sm:items-center">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-dark">
                    <Icon name="file" size={22} />
                  </span>
                  <div className="flex min-w-0 grow flex-col gap-1">
                    <strong className="break-words">{m.title}</strong>
                    {m.description && <p className="text-sm break-words whitespace-pre-line text-navy-soft">{m.description}</p>}
                    <p className="text-xs text-muted">
                      {m.teacher &&
                        (m.teacher.slug ? (
                          <Link href={`/teachers/${m.teacher.slug}`} className="font-semibold text-teal-dark hover:text-navy">
                            {`${m.teacher.firstName} ${m.teacher.lastName}`.trim()}
                          </Link>
                        ) : (
                          `${m.teacher.firstName} ${m.teacher.lastName}`.trim()
                        ))}
                      {" · "}
                      {fileSize(m.sizeBytes, tag)} · {date(m.reviewedAt ?? m.createdAt)}
                    </p>
                  </div>
                  <Button
                    variant="teal"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      setError(null);
                      void open(m.fileUrl).catch((e) => setError(e instanceof ApiError && e.status ? e.message : t("openError")));
                    }}
                  >
                    {t("open")}
                  </Button>
                </li>
              ))}
            </ul>
          )
        }
      </Loadable>
    </div>
  );
}
