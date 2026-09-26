import type { Metadata } from "next";
import { TeacherManagement } from "./_components/teacher-management";
import { applicants } from "./_data";

export const metadata: Metadata = { title: "Teacher management · Amerivo Admin" };

export default function AdminTeachersPage() {
  return (
    <div className="px-4 py-[30px] sm:px-6 lg:px-9">
      <TeacherManagement initial={applicants} />
    </div>
  );
}
