/** Замер скорости пересчёта итогов: npx tsx scripts/bench-recalc.ts */
import { PrismaClient } from "@prisma/client";
import { recalcCourse } from "../src/lib/grading/service";

const db = new PrismaClient({ log: [{ emit: "event", level: "query" }] });
let queries = 0;
db.$on("query" as never, () => { queries++; });

async function main() {
  const courses = await db.course.findMany({ take: 25, select: { id: true, name: true } });
  const t0 = performance.now();
  queries = 0;
  for (const c of courses) await recalcCourse(db, c.id);
  const all = performance.now() - t0;
  const q = queries;
  const one = courses.find((c) => c.name === "7A Mathematics")!;
  const t1 = performance.now();
  queries = 0;
  await recalcCourse(db, one.id);
  console.log(JSON.stringify({ allCoursesMs: Math.round(all), allQueries: q, oneCourseMs: Math.round(performance.now() - t1), oneCourseQueries: queries }));
}
main().finally(() => db.$disconnect());
