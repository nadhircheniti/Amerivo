/** Teaching documents (apps/api/src/modules/materials): teacher uploads → admin review → students. */
export type MaterialStatus = "pending" | "approved" | "rejected";

export type Material = {
  id: string;
  title: string;
  description: string | null;
  status: MaterialStatus;
  /** Admin's reason (rejections) — not sent to students. */
  reviewNote?: string | null;
  reviewedAt: string | null;
  createdAt: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  /** "/api/files/<id>" — private: open it with useFiles().open(). */
  fileUrl: string;
  teacher?: { id: string; firstName: string; lastName: string; slug?: string; email?: string };
};

export type MaterialPage = { items: Material[]; total: number; page: number; pageSize: number };

/** Same limits as the API (checked here first to avoid a useless upload). */
export const MATERIAL_RULES = { types: ["application/pdf", "image/jpeg", "image/png"], accept: "application/pdf,image/jpeg,image/png", maxMb: 5, titleMax: 120, descriptionMax: 1000 };

export const STATUS_TONE = { pending: "warning", approved: "success", rejected: "danger" } as const;

/** "1.2 MB", "340 KB" in the reader's language. */
export function fileSize(bytes: number, locale: string) {
  const mb = bytes / (1024 * 1024);
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: mb < 10 ? 1 : 0 });
  return mb >= 1 ? `${nf.format(mb)} MB` : `${nf.format(Math.max(1, Math.round(bytes / 1024)))} KB`;
}
