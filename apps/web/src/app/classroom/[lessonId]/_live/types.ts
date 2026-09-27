export type ClassroomInfo = {
  bookingId: string;
  status: string;
  type: "trial" | "single" | "package";
  topic: string | null;
  startsAt: string;
  durationMin: number;
  opensAt: string;
  closesAt: string;
  role: "teacher" | "student" | "admin";
  teacher: { id: string; firstName: string; lastName: string };
  student: { id: string; firstName: string; lastName: string };
  notes: string;
};

/** Messages exchanged between the two browsers over Daily's data channel. */
export type LiveMessage = { kind: "chat"; id: string; text: string; from: string } | { kind: "notes"; text: string };
