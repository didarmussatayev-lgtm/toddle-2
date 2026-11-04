import { describe, it, expect } from "vitest";
import {
  roundHalfUp, aggregateLevels, criteriaToGrade, percentToGrade, weightedCategoryPercent,
  toDependentScale, combinePeriodGrades, annualWithExam, computeTermGrade, effective,
} from "@/lib/grading/engine";
import { MYP_BOUNDARIES, PERCENT_BANDS, FIVE_SCALE } from "@/lib/grading/defaults";

describe("roundHalfUp", () => {
  it("округляет вверх от .5", () => {
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(3.5)).toBe(4);
    expect(roundHalfUp(2.49)).toBe(2);
    expect(roundHalfUp(6.666, 2)).toBe(6.67);
    expect(roundHalfUp(1.005, 2)).toBe(1.01);
  });
});

describe("aggregateLevels", () => {
  it("среднее с округлением (по умолчанию)", () => {
    expect(aggregateLevels([5, 6])).toBe(6); // 5.5 → 6
    expect(aggregateLevels([5, 6, 6])).toBe(6); // 5.67
    expect(aggregateLevels([4, 5, 5, 4])).toBe(5); // 4.5 → 5
    expect(aggregateLevels([3, 4, 4])).toBe(4); // 3.67
    expect(aggregateLevels([])).toBeNull();
  });
  it("другие методы", () => {
    expect(aggregateLevels([3, 7, 5], "LATEST")).toBe(5);
    expect(aggregateLevels([3, 7, 5], "HIGHEST")).toBe(7);
    expect(aggregateLevels([3, 5, 5, 7], "MODE")).toBe(5);
    expect(aggregateLevels([3, 3, 6, 6], "MODE")).toBe(6);
  });
});

describe("criteriaToGrade (4 критерия, IB-границы)", () => {
  const cases: [number, number][] = [
    [0, 1], [5, 1], [6, 2], [9, 2], [10, 3], [14, 3], [15, 4], [18, 4],
    [19, 5], [23, 5], [24, 6], [27, 6], [28, 7], [32, 7],
  ];
  it.each(cases)("сумма %i → %i", (sum, grade) => {
    expect(criteriaToGrade(sum, 4, MYP_BOUNDARIES)).toBe(grade);
  });
  it("использует таблицу по числу оценённых критериев", () => {
    expect(criteriaToGrade(14, 2, MYP_BOUNDARIES)).toBe(7);
    expect(criteriaToGrade(14, 3, MYP_BOUNDARIES)).toBe(4);
    expect(criteriaToGrade(5, 0, MYP_BOUNDARIES)).toBeNull();
  });
});

describe("percentToGrade", () => {
  it.each([
    [0, 1], [14, 1], [14.6, 1], [15, 2], [44.99, 3], [45, 4], [59.5, 4], [60, 5], [74, 5], [75, 6], [84.9, 6], [85, 7], [100, 7],
  ])("%f%% → %i", (pct, grade) => {
    expect(percentToGrade(pct, PERCENT_BANDS)).toBe(grade);
  });
});

describe("weightedCategoryPercent (25/75)", () => {
  const w = { FORMATIVE: 25, SUMMATIVE: 75 };
  it("взвешивает средние по категориям", () => {
    const items = [
      { category: "FORMATIVE", pct: 80 },
      { category: "FORMATIVE", pct: 60 },
      { category: "SUMMATIVE", pct: 90 },
      { category: "SUMMATIVE", pct: 70 },
    ];
    // 0.25*70 + 0.75*80 = 77.5
    expect(weightedCategoryPercent(items, w)).toBe(77.5);
  });
  it("перенормирует, если категория пустая", () => {
    expect(weightedCategoryPercent([{ category: "SUMMATIVE", pct: 64 }], w)).toBe(64);
    expect(weightedCategoryPercent([], w)).toBeNull();
  });
});

describe("5-балльная шкала", () => {
  it.each([[1, 2], [2, 2], [3, 3], [4, 3], [5, 4], [6, 5], [7, 5]])("%i → %i", (g, f) => {
    expect(toDependentScale(g, FIVE_SCALE)).toBe(f);
  });
  it("пустая оценка", () => expect(toDependentScale(null, FIVE_SCALE)).toBeNull());
});

describe("накопительные периоды", () => {
  it("семестр = среднее двух четвертей, вверх от .5", () => {
    expect(combinePeriodGrades([{ grade: 5, weight: 1 }, { grade: 6, weight: 1 }])).toBe(6);
    expect(combinePeriodGrades([{ grade: 4, weight: 1 }, { grade: 4, weight: 1 }])).toBe(4);
  });
  it("годовая 50/50", () => {
    expect(combinePeriodGrades([{ grade: 6, weight: 0.5 }, { grade: 5, weight: 0.5 }])).toBe(6);
    expect(combinePeriodGrades([{ grade: 3, weight: 0.5 }, { grade: null, weight: 0.5 }])).toBe(3);
    expect(combinePeriodGrades([])).toBeNull();
  });
  it("итог 9 класса: 50% экзамен + 50% годовая", () => {
    expect(annualWithExam(5, 6, 0.5)).toBe(6);
    expect(annualWithExam(5, 4, 0.5)).toBe(5);
    expect(annualWithExam(5, null, 0.5)).toBe(5);
  });
});

describe("computeTermGrade", () => {
  it("эталон MYP: A[5,6] B[6] C[4,5] D[7] → 6+6+5+7=24 → 6", () => {
    const r = computeTermGrade({
      criteria: [
        { code: "A", levels: [5, 6] },
        { code: "B", levels: [6] },
        { code: "C", levels: [4, 5] },
        { code: "D", levels: [7] },
      ],
      aggregation: "MEAN_ROUND_HALF_UP",
      boundarySets: MYP_BOUNDARIES,
    });
    expect(r.criterionLevels).toEqual({ A: 6, B: 6, C: 5, D: 7 });
    expect(r.criteriaSum).toBe(24);
    expect(r.criteriaCount).toBe(4);
    expect(r.grade7).toBe(6);
    expect(r.method).toBe("CRITERIA");
    expect(toDependentScale(r.grade7, FIVE_SCALE)).toBe(5);
  });
  it("оценены только 2 критерия → таблица для двух", () => {
    const r = computeTermGrade({
      criteria: [{ code: "A", levels: [4] }, { code: "B", levels: [5] }, { code: "C", levels: [] }],
      aggregation: "MEAN_ROUND_HALF_UP",
      boundarySets: MYP_BOUNDARIES,
    });
    expect(r.criteriaSum).toBe(9);
    expect(r.grade7).toBe(4);
  });
  it("DP: процентная схема 25/75", () => {
    const r = computeTermGrade({
      criteria: [],
      aggregation: "MEAN_ROUND_HALF_UP",
      boundarySets: MYP_BOUNDARIES,
      percentItems: [{ category: "FORMATIVE", pct: 50 }, { category: "SUMMATIVE", pct: 70 }],
      categoryWeights: { FORMATIVE: 25, SUMMATIVE: 75 },
      percentBands: PERCENT_BANDS,
    });
    expect(r.overallPct).toBe(65);
    expect(r.grade7).toBe(5);
    expect(r.method).toBe("PERCENT");
  });
  it("нет данных → нет оценки", () => {
    const r = computeTermGrade({ criteria: [], aggregation: "MEAN_ROUND_HALF_UP", boundarySets: MYP_BOUNDARIES });
    expect(r.grade7).toBeNull();
  });
});

describe("override", () => {
  it("ручное значение важнее расчёта", () => {
    expect(effective(4, 5)).toBe(5);
    expect(effective(4, null)).toBe(4);
  });
});
