// Pure budget logic (no RN) — used by the screens, the dog and the widgets.
import { categoryById } from './theme';

export const monthKey = (year, month) => `${year}-${String(month + 1).padStart(2, '0')}`;

export function shiftMonth(year, month, delta) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

// The income for a month, or the last one set before it (otherwise the earliest known)
export function getIncome(incomes, year, month) {
  const key = monthKey(year, month);
  if (incomes[key] != null) return incomes[key];
  const keys = Object.keys(incomes).sort();
  if (!keys.length) return 0;
  const earlier = keys.filter((k) => k <= key);
  return incomes[earlier.length ? earlier[earlier.length - 1] : keys[0]];
}

/**
 * Total income for the month: the monthly income setting or the recorded salary (whichever is larger),
 * plus all extra income (bonus, freelance, gift...).
 */
export function monthIncome({ incomes = {}, incomeEntries = [] }, year, month) {
  const base = getIncome(incomes, year, month);
  const list = filterMonth(incomeEntries, year, month);
  const sum = (arr) => arr.reduce((a, e) => a + e.amount, 0);
  const salary = sum(list.filter((e) => e.kind === 'salary'));
  const extra = sum(list.filter((e) => e.kind !== 'salary'));
  return { base, salary, extra, total: Math.max(base, salary) + extra, list };
}

export function filterMonth(expenses, year, month) {
  return expenses.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export function summarize(list) {
  const byCategory = {};
  const byBucket = { needs: 0, wants: 0, savings: 0 };
  let total = 0;
  for (const e of list) {
    const cat = categoryById(e.categoryId);
    total += e.amount;
    byCategory[e.categoryId] = (byCategory[e.categoryId] || 0) + e.amount;
    if (cat) byBucket[cat.bucket] += e.amount;
  }
  return { total, byCategory, byBucket };
}

export const sortByDateDesc = (list) => [...list].sort((a, b) => new Date(b.date) - new Date(a.date));

// How much of the month has passed (0..1) and how many days are left, including today
export function monthProgress(year, month, now = new Date()) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  const daysInMonth = Math.round((end - start) / 86400000);
  if (now >= end) return { dayFrac: 1, daysLeft: 0, daysInMonth, isCurrent: false, isPast: true };
  if (now < start) return { dayFrac: 0, daysLeft: daysInMonth, daysInMonth, isCurrent: false, isPast: false };
  return {
    dayFrac: (now - start) / (end - start),
    daysLeft: daysInMonth - now.getDate() + 1,
    daysInMonth,
    isCurrent: true,
    isPast: false,
  };
}

/**
 * Score 0–100 against the 50/30/20 rule.
 * Needs are measured against the cap for the whole month (rent comes on the 1st),
 * wants against the elapsed part of the month, and savings
 * against the most that can still be left over (income − needs − wants).
 * At the end of the month (dayFrac = 1) whatever wasn't spent counts as savings.
 */
export function budgetScore(args) {
  return budgetScoreParts(args)?.score ?? null;
}

// Short verdict for the score (same scale as in the explanation)
export function scoreVerdict(score) {
  if (score >= 85) return "отлично";
  if (score >= 65) return "добре";
  if (score >= 45) return "внимавай";
  return "време за промяна";
}

// The same score broken into parts — for the "Why is the dog like this" explanation
export function budgetScoreParts({ income, byBucket, dayFrac = 1 }) {
  if (!income) return null;
  const I = income;
  const { needs, wants, savings } = byBucket;
  const wantsCap = 0.3 * I;
  const wantsAllowed = wantsCap * Math.max(dayFrac, 0.15);
  const room = I - needs - wants;

  const parts = [
    { key: 'needs', penalty: Math.min(45, (Math.max(0, needs - 0.5 * I) / I) * 150), value: needs / I, target: 0.5 },
    {
      key: 'wantsPace',
      penalty: wants > wantsAllowed ? Math.min(35, (wants / wantsAllowed - 1) * 30) : 0,
      value: wants / wantsCap,
      target: Math.max(dayFrac, 0.15),
    },
    { key: 'wantsCap', penalty: Math.min(20, (Math.max(0, wants - wantsCap) / I) * 80), value: wants / I, target: 0.3 },
    { key: 'savings', penalty: Math.min(40, (Math.max(0, 0.2 * I - room) / I) * 150), value: Math.max(0, room) / I, target: 0.2 },
  ];
  let s = 100 - parts.reduce((a, p) => a + p.penalty, 0);
  const overIncome = needs + wants + savings > I;
  if (overIncome) s = Math.min(s, 15);
  return { score: Math.max(0, Math.round(s)), parts, overIncome };
}

// Everything Home and Statistics show for one month
export function monthOverview({ expenses, incomes, incomeEntries = [], year, month, now = new Date() }) {
  const list = filterMonth(expenses, year, month);
  const sum = summarize(list);
  const incomeInfo = monthIncome({ incomes, incomeEntries }, year, month);
  const income = incomeInfo.total;
  const progress = monthProgress(year, month, now);
  const remaining = income - sum.total;
  const spendable = 0.8 * income - sum.byBucket.needs - sum.byBucket.wants;
  return {
    list,
    ...sum,
    income,
    incomeInfo,
    progress,
    remaining,
    perDay: progress.daysLeft > 0 ? Math.max(0, spendable) / progress.daysLeft : 0,
    score: budgetScore({ income, byBucket: sum.byBucket, dayFrac: progress.dayFrac }),
  };
}
