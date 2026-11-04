/**
 * Движок оценок — чистые функции без доступа к БД.
 * Все числовые правила (границы, проценты, веса, шкалы) приходят параметрами
 * из таблиц GradingPolicy / GradeBoundary / PercentGradeBand / GradeScale.
 */

export type Aggregation = "MEAN_ROUND_HALF_UP" | "MODE" | "LATEST" | "HIGHEST" | "BEST_FIT";
export type Boundary = { grade: number; minTotal: number; maxTotal: number };
/** criteriaCount (1..4) → таблица «сумма уровней → 1–7» */
export type BoundarySets = Record<number, Boundary[]>;
export type PercentBand = { grade: number; minPct: number; maxPct: number };
/** Запись зависимой шкалы: label (например «5») и какие значения 1–7 в неё переходят */
export type DependentEntry = { label: string; value: number; sourceValues: number[] };

const EPS = 1e-9;

/** Округление «вверх от .5» (для неотрицательных чисел). 2.5 → 3, 2.49 → 2. */
export function roundHalfUp(x: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.floor(x * f + 0.5 + EPS) / f;
}

/** Итоговый уровень критерия за период по набору уровней (в хронологическом порядке). */
export function aggregateLevels(levels: number[], method: Aggregation = "MEAN_ROUND_HALF_UP"): number | null {
  if (levels.length === 0) return null;
  switch (method) {
    case "LATEST":
      return levels[levels.length - 1];
    case "HIGHEST":
      return Math.max(...levels);
    case "MODE": {
      const counts = new Map<number, number>();
      for (const l of levels) counts.set(l, (counts.get(l) ?? 0) + 1);
      let best = levels[0];
      let bestCount = 0;
      for (const [level, c] of counts) {
        if (c > bestCount || (c === bestCount && level > best)) {
          best = level;
          bestCount = c;
        }
      }
      return best;
    }
    case "BEST_FIT": // профессиональное суждение учителя; по умолчанию — как среднее, учитель может переопределить
    case "MEAN_ROUND_HALF_UP":
    default:
      return roundHalfUp(levels.reduce((a, b) => a + b, 0) / levels.length);
  }
}

/** Сумма уровней критериев → оценка 1–7 по таблице для данного числа оценённых критериев. */
export function criteriaToGrade(total: number, criteriaCount: number, sets: BoundarySets): number | null {
  const table = sets[criteriaCount];
  if (!table || criteriaCount === 0) return null;
  const hit = table.find((b) => total >= b.minTotal && total <= b.maxTotal);
  return hit ? hit.grade : null;
}

/** Процент → оценка 1–7: берётся полоса с наибольшим minPct ≤ процента (дробные значения между полосами не теряются). */
export function percentToGrade(pct: number, bands: PercentBand[]): number | null {
  if (!Number.isFinite(pct) || bands.length === 0) return null;
  const p = roundHalfUp(pct, 2);
  const sorted = [...bands].sort((a, b) => b.minPct - a.minPct);
  const hit = sorted.find((b) => p + EPS >= b.minPct);
  return hit ? hit.grade : null;
}

/**
 * Взвешенный процент по категориям (Formative 25 / Summative 75).
 * Внутри категории — среднее процентов работ. Пустые категории исключаются, веса перенормируются.
 */
export function weightedCategoryPercent(
  items: { category: string; pct: number }[],
  weights: Record<string, number>,
): number | null {
  const byCat = new Map<string, number[]>();
  for (const it of items) {
    if (!(it.category in weights)) continue;
    byCat.set(it.category, [...(byCat.get(it.category) ?? []), it.pct]);
  }
  let sumW = 0;
  let acc = 0;
  for (const [cat, list] of byCat) {
    const w = weights[cat];
    if (w <= 0) continue;
    acc += w * (list.reduce((a, b) => a + b, 0) / list.length);
    sumW += w;
  }
  return sumW === 0 ? null : roundHalfUp(acc / sumW, 2);
}

/** Перевод 1–7 в зависимую шкалу (5-балльную): 1–2→2, 3–4→3, 5→4, 6–7→5 — по данным шкалы. */
export function toDependentScale(grade7: number | null, entries: DependentEntry[]): number | null {
  if (grade7 == null) return null;
  const hit = entries.find((e) => e.sourceValues.includes(grade7));
  return hit ? hit.value : null;
}

/** Накопительный период (семестр, год): взвешенное среднее дочерних оценок 1–7 с округлением вверх от .5. */
export function combinePeriodGrades(parts: { grade: number | null; weight: number }[]): number | null {
  const valid = parts.filter((p) => p.grade != null && p.weight > 0) as { grade: number; weight: number }[];
  if (valid.length === 0) return null;
  const sumW = valid.reduce((a, p) => a + p.weight, 0);
  return roundHalfUp(valid.reduce((a, p) => a + p.grade * p.weight, 0) / sumW);
}

/** Итог 9 класса: годовая и экзамен с весом examWeight (например 0.5). */
export function annualWithExam(annual: number | null, exam: number | null, examWeight: number): number | null {
  if (annual == null) return null;
  if (exam == null) return annual;
  return roundHalfUp(annual * (1 - examWeight) + exam * examWeight);
}

export type TermInput = {
  /** уровни по каждому критерию за период (в хронологическом порядке) */
  criteria: { code: string; levels: number[] }[];
  aggregation: Aggregation;
  boundarySets: BoundarySets;
  percentItems?: { category: string; pct: number }[];
  categoryWeights?: Record<string, number>;
  percentBands?: PercentBand[];
  useCriteriaMethod?: boolean;
  usePercentMethod?: boolean;
};

export type TermResult = {
  criterionLevels: Record<string, number | null>;
  criteriaSum: number | null;
  criteriaCount: number;
  overallPct: number | null;
  grade7: number | null;
  method: "CRITERIA" | "PERCENT" | null;
};

/** Итог за reporting-период (Term): критериальная схема — основная, процентная — запасная/параллельная. */
export function computeTermGrade(input: TermInput): TermResult {
  const criterionLevels: Record<string, number | null> = {};
  let sum = 0;
  let count = 0;
  for (const c of input.criteria) {
    const lvl = aggregateLevels(c.levels, input.aggregation);
    criterionLevels[c.code] = lvl;
    if (lvl != null) {
      sum += lvl;
      count += 1;
    }
  }
  const overallPct =
    input.usePercentMethod !== false && input.percentItems && input.categoryWeights
      ? weightedCategoryPercent(input.percentItems, input.categoryWeights)
      : null;

  let grade7: number | null = null;
  let method: TermResult["method"] = null;
  if (input.useCriteriaMethod !== false && count > 0) {
    grade7 = criteriaToGrade(sum, count, input.boundarySets);
    method = "CRITERIA";
  }
  if (grade7 == null && overallPct != null && input.percentBands) {
    grade7 = percentToGrade(overallPct, input.percentBands);
    method = grade7 == null ? null : "PERCENT";
  }
  return { criterionLevels, criteriaSum: count ? sum : null, criteriaCount: count, overallPct, grade7, method };
}

/** Действующая оценка: ручное переопределение важнее расчёта. */
export function effective<T>(computed: T | null, override: T | null | undefined): T | null {
  return override ?? computed;
}
