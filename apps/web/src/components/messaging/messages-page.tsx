"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ConversationsView } from "./conversations-view";
import { createDemoTeacherSource, useApiMessagingSource } from "./sources";
import type { ChatRole } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Messages screen powered by the API. Deep links: `?with=<teacherSlug>` (student) and
 * `?student=<studentId>` (teacher) open or create that conversation. Wrap in <Suspense>.
 */
export function LiveMessages({ role }: { role: ChatRole }) {
  const source = useApiMessagingSource();
  const params = useSearchParams();
  const withSlug = params.get("with");
  const studentId = params.get("student");
  const deepLink = useMemo(() => {
    if (role === "student" && withSlug) return { teacherSlug: withSlug.slice(0, 120) };
    if (role === "teacher" && studentId && UUID.test(studentId)) return { studentId };
    return null;
  }, [role, withSlug, studentId]);
  // Remount when the deep link changes (e.g. another "Message" button while the page is open).
  return <ConversationsView key={JSON.stringify(deepLink)} role={role} source={source} deepLink={deepLink} />;
}

/** Teacher space without the API: the same screen on sample conversations. */
export function DemoTeacherMessages() {
  const [source] = useState(createDemoTeacherSource);
  return <ConversationsView role="teacher" source={source} demo />;
}
