import { uuidOr404 } from "@/lib/validate";
import { requireUser } from "@/lib/auth";
import { canViewStudent, guardianChildIds } from "@/lib/access";
import { getT } from "@/lib/i18n";
import { Notice } from "@/components/ui";
import { StudentOverview } from "@/components/StudentOverview";

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const id = uuidOr404((await params).id);
  const user = await requireUser();
  const { t } = await getT();
  if (!(await canViewStudent(user, id))) return <Notice tone="red">{t("accessDenied")}</Notice>;
  const familyView = user.studentProfile?.id === id || guardianChildIds(user).includes(id);
  return <StudentOverview studentId={id} familyView={familyView} />;
}
