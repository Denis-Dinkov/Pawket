// Tamagotchi logic for the dog: mood, fullness, growth. No RN imports.
import { monthKey, shiftMonth, filterMonth, summarize, monthIncome, budgetScore, monthOverview } from '../budget';
import { colors } from '../theme';


export const STAGES = [
  { key: 'kitten', name: 'Кутре', xp: 0 },
  { key: 'young', name: 'Кученце', xp: 250 },
  { key: 'adult', name: 'Кавалер', xp: 800 },
  { key: 'champion', name: 'Шампион', xp: 2000 },
];

export const DAILY_XP = 10;
export const HUNGRY_AT = 30;
const STARVE_HOURS = 72;
const MIN_EXPENSES_FOR_BONUS = 3;

export const EXPRESSIONS = {
  // color is a getter so it follows the live palette (light / dark); every one is readable as text
  ecstatic: { label: 'Във възторг', emoji: '🤩', get color() { return colors.savings; } },
  happy: { label: 'Щастлив', emoji: '😊', get color() { return colors.savings; } },
  worried: { label: 'Притеснен', emoji: '😟', get color() { return colors.warning; } },
  sad: { label: 'Тъжен', emoji: '😢', get color() { return colors.orange; } },
  crying: { label: 'Плаче', emoji: '😭', get color() { return colors.danger; } },
  hungry: { label: 'Гладен', emoji: '🦴', get color() { return colors.warning; } },
  sleeping: { label: 'Спи', emoji: '💤', get color() { return colors.muted; } },
};

export const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export function stageFor(xp = 0) {
  let index = 0;
  STAGES.forEach((st, i) => {
    if (xp >= st.xp) index = i;
  });
  const stage = STAGES[index];
  const next = STAGES[index + 1] || null;
  const progress = next ? (xp - stage.xp) / (next.xp - stage.xp) : 1;
  return { index, stage, next, progress };
}

// 100 right after feeding, 0 after 72 hours
export function fullness(lastFedAt, now = new Date()) {
  if (!lastFedAt) return 100;
  const hours = (now - new Date(lastFedAt)) / 3600000;
  return Math.max(0, Math.min(100, Math.round(100 - (hours / STARVE_HOURS) * 100)));
}

export function expressionFor(score) {
  if (score >= 85) return 'ecstatic';
  if (score >= 65) return 'happy';
  if (score >= 45) return 'worried';
  if (score >= 25) return 'sad';
  return 'crying';
}

// The dog's current state — always for the current month
export function petStatus({ expenses, incomes, incomeEntries, pet, now = new Date() }) {
  const ov = monthOverview({ expenses, incomes, incomeEntries, year: now.getFullYear(), month: now.getMonth(), now });
  const full = fullness(pet?.lastFedAt, now);
  const growth = stageFor(pet?.xp || 0);
  const base = { fullness: full, xp: pet?.xp || 0, ...growth, overview: ov };

  if (!ov.income) return { ...base, score: null, mood: 0, expression: 'sleeping' };

  const hungry = full < HUNGRY_AT;
  const mood = Math.max(0, ov.score - (hungry ? 20 : 0));
  return { ...base, score: ov.score, mood, expression: hungry ? 'hungry' : expressionFor(mood) };
}

export function monthEndBonus(score) {
  if (score == null) return 0;
  if (score >= 85) return 150;
  if (score >= 65) return 80;
  if (score >= 45) return 30;
  return 0;
}

// An entry or "no spending today": feeds the dog and gives XP once a day
export function feedPet(pet, now = new Date()) {
  if (!pet) return pet;
  const today = dayKey(now);
  const gain = pet.lastActiveDay === today ? 0 : DAILY_XP;
  // The active days feed the streak; the last ~4 months are enough
  const activeDays = (pet.activeDays || []).includes(today) ? pet.activeDays || [] : [...(pet.activeDays || []), today].slice(-120);
  return { ...pet, lastFedAt: now.toISOString(), lastActiveDay: today, activeDays, xp: (pet.xp || 0) + gain };
}

/**
 * Closes past months that haven't been scored yet (from the dog's birth until last month).
 * A month with fewer than 3 entries gives no bonus — otherwise an empty month would be "perfect".
 */
export function evaluateClosedMonths({ expenses, incomes, incomeEntries, pet, now = new Date() }) {
  if (!pet) return { pet, reports: [] };
  const born = new Date(pet.createdAt);
  let { year, month } = { year: born.getFullYear(), month: born.getMonth() };
  const currentKey = monthKey(now.getFullYear(), now.getMonth());
  const evaluated = { ...(pet.evaluatedMonths || {}) };
  const reports = [];

  while (monthKey(year, month) < currentKey) {
    const key = monthKey(year, month);
    if (!(key in evaluated)) {
      const list = filterMonth(expenses, year, month);
      const income = monthIncome({ incomes, incomeEntries }, year, month).total;
      const score =
        income && list.length >= MIN_EXPENSES_FOR_BONUS
          ? budgetScore({ income, byBucket: summarize(list).byBucket, dayFrac: 1 })
          : null;
      evaluated[key] = score;
      reports.push({ key, year, month, score, bonus: monthEndBonus(score) });
    }
    ({ year, month } = shiftMonth(year, month, 1));
  }

  if (!reports.length) return { pet, reports };
  const xpGain = reports.reduce((a, r) => a + r.bonus, 0);
  return { pet: { ...pet, evaluatedMonths: evaluated, xp: (pet.xp || 0) + xpGain }, reports };
}
