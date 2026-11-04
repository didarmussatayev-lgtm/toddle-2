import type { BoundarySets, PercentBand, DependentEntry } from "./engine";

/**
 * Значения по умолчанию для seed и тестов.
 * ВНИМАНИЕ: таблицы для 1–3 критериев — демонстрационные (пропорциональные IB-границам).
 * Перед запуском заменить данными из Приложений 1 и 4 школьной политики (через админку/таблицы).
 */
export const MYP_BOUNDARIES: BoundarySets = {
  4: [
    { grade: 1, minTotal: 0, maxTotal: 5 },
    { grade: 2, minTotal: 6, maxTotal: 9 },
    { grade: 3, minTotal: 10, maxTotal: 14 },
    { grade: 4, minTotal: 15, maxTotal: 18 },
    { grade: 5, minTotal: 19, maxTotal: 23 },
    { grade: 6, minTotal: 24, maxTotal: 27 },
    { grade: 7, minTotal: 28, maxTotal: 32 },
  ],
  3: [
    { grade: 1, minTotal: 0, maxTotal: 3 },
    { grade: 2, minTotal: 4, maxTotal: 7 },
    { grade: 3, minTotal: 8, maxTotal: 10 },
    { grade: 4, minTotal: 11, maxTotal: 14 },
    { grade: 5, minTotal: 15, maxTotal: 17 },
    { grade: 6, minTotal: 18, maxTotal: 20 },
    { grade: 7, minTotal: 21, maxTotal: 24 },
  ],
  2: [
    { grade: 1, minTotal: 0, maxTotal: 2 },
    { grade: 2, minTotal: 3, maxTotal: 4 },
    { grade: 3, minTotal: 5, maxTotal: 7 },
    { grade: 4, minTotal: 8, maxTotal: 9 },
    { grade: 5, minTotal: 10, maxTotal: 11 },
    { grade: 6, minTotal: 12, maxTotal: 13 },
    { grade: 7, minTotal: 14, maxTotal: 16 },
  ],
  1: [
    { grade: 1, minTotal: 0, maxTotal: 1 },
    { grade: 2, minTotal: 2, maxTotal: 2 },
    { grade: 3, minTotal: 3, maxTotal: 3 },
    { grade: 4, minTotal: 4, maxTotal: 4 },
    { grade: 5, minTotal: 5, maxTotal: 5 },
    { grade: 6, minTotal: 6, maxTotal: 6 },
    { grade: 7, minTotal: 7, maxTotal: 8 },
  ],
};

/** Проценты → 1–7 (0–14→1 … 85–100→7). Для DP — подтвердить у координатора DP. */
export const PERCENT_BANDS: PercentBand[] = [
  { grade: 1, minPct: 0, maxPct: 14 },
  { grade: 2, minPct: 15, maxPct: 29 },
  { grade: 3, minPct: 30, maxPct: 44 },
  { grade: 4, minPct: 45, maxPct: 59 },
  { grade: 5, minPct: 60, maxPct: 74 },
  { grade: 6, minPct: 75, maxPct: 84 },
  { grade: 7, minPct: 85, maxPct: 100 },
];

/** 5-балльная шкала: 1–2→2, 3–4→3, 5→4, 6–7→5 */
export const FIVE_SCALE: DependentEntry[] = [
  { label: "5", value: 5, sourceValues: [6, 7] },
  { label: "4", value: 4, sourceValues: [5] },
  { label: "3", value: 3, sourceValues: [3, 4] },
  { label: "2", value: 2, sourceValues: [1, 2] },
];

export const CATEGORY_WEIGHTS = { FORMATIVE: 25, SUMMATIVE: 75 };
