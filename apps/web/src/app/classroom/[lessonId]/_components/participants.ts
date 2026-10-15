/**
 * Who is who in the video room (pure; unit tests in apps/web/test/helpers.test.ts). The API gives
 * each person a Daily user_id: "teacher:<id>", "student:<id>" or, for an Amerivo admin observing
 * the lesson for quality control (Terms §7), "observer:<id>".
 */
export const OBSERVER_PREFIX = "observer:";

export const isObserverId = (userId: unknown) => typeof userId === "string" && userId.startsWith(OBSERVER_PREFIX);

/** A remote teacher or student (not this browser, not an observer). */
export const isRemotePerson = (p: { local: boolean; user_id?: string }) => !p.local && !isObserverId(p.user_id);

/** A remote observer. */
export const isRemoteObserver = (p: { local: boolean; user_id?: string }) => !p.local && isObserverId(p.user_id);
