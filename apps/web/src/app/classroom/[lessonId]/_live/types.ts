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
