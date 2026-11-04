import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { canManageCourse } from "@/lib/access";
import { isIso, isoToDate, fmtDate } from "@/lib/dates";
import { PageTitle, Card, Notice } from "@/components/ui";
import { saveAttendance } from "@/app/actions/attendance";

export default async function AttendancePage({ params, searchParams }: { params: Promise<{ entryId: string; date: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { entryId, date } = await params;
  const sp = await searchParams;
  if (!isIso(date)) notFound();
  const user = await requireUser();
  const { t, tj, locale } = await getT();
  const entry = await db.timetableEntry.findUnique({
    where: { id: entryId },
    include: {
      slot: true,
      course: { include: { subject: true, enrollments: { where: { status: "ACTIVE" }, include: { student: { include: { user: true } } } } } },
      sessions: { where: { date: isoToDate(date) }, include: { records: true } },
    },
  });
  if (!entry) notFound();
  if (!(await canManageCourse(user, entry.courseId))) return <Notice tone="red">{t("accessDenied")}</Notice>;
  const codes = await db.attendanceCode.findMany({ where: { active: true }, orderBy: { kind: "asc" } });
  const present = codes.find((c) => c.kind === "PRESENT")!;
  const records = new Map(entry.sessions[0]?.records.map((r) => [r.studentId, r]) ?? []);
  const students = entry.course.enrollments.map((e) => e.student).sort((a, b) => a.user.lastName.localeCompare(b.user.lastName, "ru"));

  return (
    <>
      <PageTitle
        back={{ href: `/today?date=${date}`, label: t("todayLessons") }}
        title={`${t("navAttendance")}: ${entry.course.name}`}
        subtitle={`${fmtDate(date, locale, { weekday: "long", day: "numeric", month: "long" })} · ${entry.slot.startTime}–${entry.slot.endTime} · ${tj(entry.course.subject.name)}`}
      />
      {sp.saved && <Notice tone="green">✓ {t("attendanceSaved")}</Notice>}
      <form action={saveAttendance}>
        <input type="hidden" name="entryId" value={entryId} />
        <input type="hidden" name="date" value={date} />
        <Card actions={<button name="allPresent" value="1" className="btn btn-sm">✓ {t("allPresent")}</button>}>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th className="w-8">#</th><th>{t("student")}</th><th>{t("status")}</th><th>{t("comment")}</th></tr></thead>
              <tbody>
                {students.map((s, i) => {
                  const current = records.get(s.id)?.codeId ?? present.id;
                  return (
                    <tr key={s.id}>
                      <td className="text-slate-400">{i + 1}</td>
                      <td className="whitespace-nowrap font-medium">{s.user.lastName} {s.user.firstName}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {codes.map((c) => (
                            <label key={c.id} className="cursor-pointer">
                              <input type="radio" name={`code_${s.id}`} value={c.id} defaultChecked={c.id === current} className="peer sr-only" />
                              <span className="inline-block rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500 peer-checked:border-transparent peer-checked:text-white" style={{ ["--c" as string]: c.color ?? "#64748b" }}>
                                {tj(c.name)}
                              </span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td><input name={`note_${s.id}`} defaultValue={records.get(s.id)?.note ?? ""} className="input w-full min-w-[10rem] py-1" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end"><button className="btn btn-primary">{t("save")}</button></div>
        </Card>
      </form>
      <style>{`input[type=radio]:checked + span { background: var(--c); }`}</style>
    </>
  );
}
