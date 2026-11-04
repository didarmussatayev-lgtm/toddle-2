import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canAdmin, hasRole } from "@/lib/access";

export default async function Home() {
  const u = await requireUser();
  if (canAdmin(u)) redirect("/admin");
  if (hasRole(u, "TEACHER")) redirect("/today");
  if (u.studentProfile) redirect("/me");
  if (u.guardianProfile) redirect("/family");
  redirect("/notifications");
}
