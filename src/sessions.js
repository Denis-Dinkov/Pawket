// A no-spend day: a challenge the user starts on purpose, kept until midnight or broken by an expense.
// Like the other Live Activity events, it has a start and an end, not a standing status.
// Pure logic, no RN imports.
import { countsInBudget, bucketOf } from './budget';
import { dayKey } from './pet/logic';

export const SESSION_XP = { nospend: 20 };
// A no-spend day earns XP only when started before this hour (starting at 23:00 isn't much of a challenge)
export const NOSPEND_XP_BEFORE = 12;

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const midnightAfter = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0);

// Spending that breaks a no-spend day: needs and wants actually paid (not recurring payments, savings, goals,
// or entries outside the budget)
const isSpending = (e) =>
  e.type !== 'income' && countsInBudget(e) && e.source !== 'recurring' && !e.goalId && ['needs', 'wants'].includes(bucketOf(e));

export function startNoSpend(now = new Date()) {
  return { id: newId(), kind: 'nospend', day: dayKey(now), startedAt: now.toISOString(), endsAt: midnightAfter(now).toISOString() };
}

// A no-spend day can't start once something was already spent today
export const spentToday = (expenses = [], now = new Date()) =>
  expenses.filter((e) => isSpending(e) && dayKey(e.date) === dayKey(now)).reduce((a, e) => a + e.amount, 0);

/**
 * Where a no-spend day stands: { spent, ratio, finished, won }. It's broken by any spending dated that day
 * (`finished` and not `won`), and kept once midnight comes (`won`). ratio: how much of the day has passed.
 */
export function sessionState(session, expenses = [], now = new Date()) {
  if (!session) return null;
  const start = new Date(session.startedAt);
  const end = new Date(session.endsAt);
  const spent = expenses.filter((e) => isSpending(e) && dayKey(e.date) === session.day).reduce((a, e) => a + e.amount, 0);
  const broken = spent > 0;
  const ratio = Math.min(1, Math.max(0, (now - start) / Math.max(1, end - start)));
  return { spent, ratio, finished: broken || now >= end, won: !broken && now >= end };
}
