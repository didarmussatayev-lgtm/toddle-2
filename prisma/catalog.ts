/**
 * Каталог предметов IB: предметные группы, предметы MYP с критериями A–D (0–8) и предметы DP.
 * Общий для демо-заполнения и настройки рабочей школы. Названия предметов используются при импорте курсов из CSV.
 */
import type { PrismaClient } from "@prisma/client";

const I = (ru: string, en: string, kk?: string) => ({ ru, en, kk: kk ?? ru });
type Crit = [string, string, string, string]; // code, ru, en, kk

export const SUBJECT_GROUPS: [string, string, string, string, number][] = [
  ["LANG_LIT", "Язык и литература", "Language and literature", "Тіл және әдебиет", 1],
  ["LANG_ACQ", "Изучение языка", "Language acquisition", "Тілді меңгеру", 2],
  ["INDIV_SOC", "Индивидуумы и общества", "Individuals and societies", "Жеке тұлға және қоғам", 3],
  ["SCIENCES", "Естественные науки", "Sciences", "Жаратылыстану ғылымдары", 4],
  ["MATH", "Математика", "Mathematics", "Математика", 5],
  ["DESIGN", "Дизайн", "Design", "Дизайн", 6],
];

export const MYP_SUBJECTS: { key: string; group: string; name: [string, string, string]; hours: number; criteria: Crit[] }[] = [
  { key: "math", group: "MATH", name: ["Математика", "Mathematics", "Математика"], hours: 5, criteria: [["A", "Знание и понимание", "Knowing and understanding", "Білу және түсіну"], ["B", "Исследование закономерностей", "Investigating patterns", "Заңдылықтарды зерттеу"], ["C", "Коммуникация", "Communicating", "Коммуникация"], ["D", "Применение математики в реальных ситуациях", "Applying mathematics in real-life contexts", "Математиканы өмірлік жағдайларда қолдану"]] },
  { key: "sci", group: "SCIENCES", name: ["Естественные науки", "Sciences", "Жаратылыстану"], hours: 4, criteria: [["A", "Знание и понимание", "Knowing and understanding", "Білу және түсіну"], ["B", "Исследование и планирование", "Inquiring and designing", "Зерттеу және жоспарлау"], ["C", "Обработка и оценка", "Processing and evaluating", "Өңдеу және бағалау"], ["D", "Влияние науки", "Reflecting on the impacts of science", "Ғылымның әсері туралы ой толғау"]] },
  { key: "lit", group: "LANG_LIT", name: ["Русский язык и литература", "Russian language and literature", "Орыс тілі мен әдебиеті"], hours: 4, criteria: [["A", "Анализ", "Analysing", "Талдау"], ["B", "Организация", "Organizing", "Ұйымдастыру"], ["C", "Создание текста", "Producing text", "Мәтін құру"], ["D", "Использование языка", "Using language", "Тілді қолдану"]] },
  { key: "eng", group: "LANG_ACQ", name: ["Английский язык", "English language acquisition", "Ағылшын тілі"], hours: 4, criteria: [["A", "Аудирование", "Listening", "Тыңдалым"], ["B", "Чтение", "Reading", "Оқылым"], ["C", "Говорение", "Speaking", "Айтылым"], ["D", "Письмо", "Writing", "Жазылым"]] },
  { key: "ind", group: "INDIV_SOC", name: ["Индивидуумы и общества", "Individuals and societies", "Жеке тұлға және қоғам"], hours: 3, criteria: [["A", "Знание и понимание", "Knowing and understanding", "Білу және түсіну"], ["B", "Исследование", "Investigating", "Зерттеу"], ["C", "Коммуникация", "Communicating", "Коммуникация"], ["D", "Критическое мышление", "Thinking critically", "Сыни ойлау"]] },
  { key: "des", group: "DESIGN", name: ["Дизайн", "Design", "Дизайн"], hours: 2, criteria: [["A", "Исследование и анализ", "Inquiring and analysing", "Зерттеу және талдау"], ["B", "Разработка идей", "Developing ideas", "Идеяларды әзірлеу"], ["C", "Создание решения", "Creating the solution", "Шешім жасау"], ["D", "Оценка", "Evaluating", "Бағалау"]] },
  { key: "kaz", group: "LANG_ACQ", name: ["Казахский язык", "Kazakh language", "Қазақ тілі"], hours: 3, criteria: [["A", "Аудирование", "Listening", "Тыңдалым"], ["B", "Чтение", "Reading", "Оқылым"], ["C", "Говорение", "Speaking", "Айтылым"], ["D", "Письмо", "Writing", "Жазылым"]] },
];

export const DP_SUBJECTS: { key: string; group: string; name: [string, string, string]; level: "SL" | "HL"; hours: number; demoTeacher: string }[] = [
  { key: "dpmath", group: "MATH", name: ["Математика: анализ и подходы", "Mathematics: analysis and approaches", "Математика: талдау және тәсілдер"], level: "SL", hours: 4, demoTeacher: "math" },
  { key: "dpphys", group: "SCIENCES", name: ["Физика", "Physics", "Физика"], level: "HL", hours: 5, demoTeacher: "phys" },
  { key: "dpeng", group: "LANG_ACQ", name: ["Английский B", "English B", "Ағылшын B"], level: "HL", hours: 4, demoTeacher: "eng" },
  { key: "dplit", group: "LANG_LIT", name: ["Русский A: литература", "Russian A: literature", "Орыс A: әдебиет"], level: "SL", hours: 3, demoTeacher: "lit" },
];

const DESCRIPTORS = [
  { levelFrom: 0, levelTo: 0, text: I("Не достигает ни одного дескриптора", "Does not reach a standard described", "Ешбір дескрипторға жетпейді") },
  { levelFrom: 1, levelTo: 2, text: I("Ограниченный уровень", "Limited", "Шектеулі деңгей") },
  { levelFrom: 3, levelTo: 4, text: I("Достаточный уровень", "Adequate", "Жеткілікті деңгей") },
  { levelFrom: 5, levelTo: 6, text: I("Существенный уровень", "Substantial", "Елеулі деңгей") },
  { levelFrom: 7, levelTo: 8, text: I("Отличный уровень", "Excellent", "Өте жақсы деңгей") },
];

export async function createSubjectCatalog(db: PrismaClient, schoolId: string, mypId: string, dpId: string) {
  const groups: Record<string, string> = {};
  for (const [code, ru, en, kk, sortOrder] of SUBJECT_GROUPS) {
    groups[code] = (await db.subjectGroup.create({ data: { schoolId, code, name: I(ru, en, kk), sortOrder } })).id;
  }
  const subjectIds: Record<string, string> = {};
  const criteriaBySubject: Record<string, { id: string; code: string }[]> = {};
  for (const s of MYP_SUBJECTS) {
    const subj = await db.subject.create({ data: { programmeId: mypId, subjectGroupId: groups[s.group], name: I(s.name[0], s.name[1], s.name[2]) } });
    subjectIds[s.key] = subj.id;
    criteriaBySubject[subj.id] = [];
    for (const [code, ru, en, kk] of s.criteria) {
      const c = await db.criterion.create({ data: { subjectId: subj.id, code, name: I(ru, en, kk), maxLevel: 8, descriptors: { create: DESCRIPTORS } } });
      criteriaBySubject[subj.id].push({ id: c.id, code });
    }
  }
  for (const s of DP_SUBJECTS) {
    const subj = await db.subject.create({ data: { programmeId: dpId, subjectGroupId: groups[s.group], name: I(s.name[0], s.name[1], s.name[2]), firstAssessment: 2021 } });
    subjectIds[s.key] = subj.id;
    criteriaBySubject[subj.id] = [];
  }
  return { groups, subjectIds, criteriaBySubject };
}
