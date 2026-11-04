import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { StudentOverview } from "@/components/StudentOverview";

export default async function FamilyPage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const user = await requireUser();
  const { t } = await getT();
  const children = user.guardianProfile?.students ?? [];
  if (!user.guardianProfile || children.length === 0) redirect("/notifications");
  const sp = await searchParams;
  const current = children.find((c) => c.studentId === sp.child) ?? children[0];
  return (
    <>
      {children.length > 1 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">{t("child")}:</span>
          {children.map((c) => (
            <Link key={c.studentId} href={`/family?child=${c.studentId}`} className={`btn btn-sm ${c.studentId === current.studentId ? "btn-primary" : ""}`}>
              {c.student.user.firstName}
            </Link>
          ))}
        </div>
      )}
      <StudentOverview studentId={current.studentId} familyView />
    </>
  );
}
