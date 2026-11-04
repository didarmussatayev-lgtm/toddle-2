import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { StudentOverview } from "@/components/StudentOverview";

export default async function MePage() {
  const user = await requireUser();
  if (!user.studentProfile) redirect("/");
  return <StudentOverview studentId={user.studentProfile.id} familyView />;
}
