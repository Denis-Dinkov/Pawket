// Recurring payments and savings goals. Pure logic, no RN imports.
import { monthKey, shiftMonth } from './budget';
import { categoryById } from './theme';

const parseKey = (key) => {
  const [y, m] = key.split('-').map(Number);
  return { year: y, month: m - 1 };
};
const nextKey = (key) => {
  const { year, month } = parseKey(key);
  const n = shiftMonth(year, month, 1);
  return monthKey(n.year, n.month);
};
const daysIn = (year, month) => new Date(year, month + 1, 0).getDate();

// The date of a rule in a month: its day, or the last day of a shorter month (31 → 28 Feb)
export function ruleDate(rule, year, month) {
  return new Date(year, month, Math.min(rule.day, daysIn(year, month)), 9, 0, 0);
}

/**
 * The expenses that recurring rules owe up to `now`.
 * rule = { id, amount, categoryId, merchant, note, day, lastKey, paused }
 * lastKey is the last month that already has its expense.
 * Returns { expenses: [...], rules: [...updated] } — nothing changes when nothing is due.
 */
export function dueRecurring(rules = [], now = new Date()) {
  const currentKey = monthKey(now.getFullYear(), now.getMonth());
  const expenses = [];
  let changed = false;
  const updated = rules.map((rule) => {
    if (rule.paused) return rule;
    let key = rule.lastKey;
    let next = nextKey(key);
    while (next <= currentKey) {
      const { year, month } = parseKey(next);
      const date = ruleDate(rule, year, month);
      if (date > now) break;
      expenses.push({
        amount: rule.amount,
        categoryId: rule.categoryId,
        merchant: rule.merchant || '',
        note: rule.note || '',
        date: date.toISOString(),
        source: 'recurring',
        recurringId: rule.id,
      });
      key = next;
      next = nextKey(key);
    }
    if (key === rule.lastKey) return rule;
    changed = true;
    return { ...rule, lastKey: key };
  });
  return { expenses, rules: changed ? updated : rules };
}

// The next payment of every active rule, soonest first: [{ rule, date }]
export function upcomingPayments(rules = [], now = new Date()) {
  return rules
    .filter((r) => !r.paused)
    .map((rule) => {
      const { year, month } = parseKey(nextKey(rule.lastKey));
      return { rule, date: ruleDate(rule, year, month) };
    })
    .sort((a, b) => a.date - b.date);
}

// What the recurring rules still take from this month (not yet recorded)
export function pendingThisMonth(rules = [], now = new Date()) {
  const key = monthKey(now.getFullYear(), now.getMonth());
  return rules.filter((r) => !r.paused && r.lastKey < key).reduce((a, r) => a + r.amount, 0);
}

// The part of it that lowers today's limit: needs and wants, not savings
export const pendingSpend = (rules = [], now = new Date()) =>
  pendingThisMonth(rules.filter((r) => categoryById(r.categoryId)?.bucket !== 'savings'), now);

// Goal progress: the money saved is the sum of the expenses booked to the goal
export function goalSaved(goal, expenses = []) {
  return expenses.filter((e) => e.goalId === goal.id).reduce((a, e) => a + e.amount, 0);
}

export function goalProgress(goal, expenses = []) {
  const saved = goalSaved(goal, expenses);
  return { saved, left: Math.max(0, goal.target - saved), progress: goal.target ? Math.min(1, saved / goal.target) : 0, done: saved >= goal.target };
}

// How much to put aside every month to reach the goal by its deadline
export function monthlyNeeded(goal, saved, now = new Date()) {
  if (!goal.deadline) return null;
  const end = new Date(goal.deadline);
  const months = (end.getFullYear() - now.getFullYear()) * 12 + end.getMonth() - now.getMonth() + 1;
  if (months <= 0) return null;
  return Math.max(0, goal.target - saved) / months;
}

export const GOAL_ICONS = ['airplane', 'home', 'car', 'gift', 'laptop', 'school', 'medkit', 'paw', 'heart', 'umbrella', 'bicycle', 'phone-portrait'];

/**
 * Where the month will end at today's pace: what's left, minus the recurring payments still due,
 * minus the usual daily spending (needs + wants, without recurring and goal entries) for the days left.
 * Returns { end, perDayVariable, daysLeft } or null outside the current month.
 */
export function monthForecast(ov, now = new Date(), pending = 0) {
  const { isCurrent, daysLeft, daysInMonth } = ov.progress;
  if (!isCurrent || !ov.income) return null;
  const elapsed = Math.max(1, daysInMonth - daysLeft + 1);
  const variable = ov.list
    .filter((e) => e.source !== 'recurring' && !e.goalId && ['needs', 'wants'].includes(categoryById(e.categoryId)?.bucket))
    .reduce((a, e) => a + e.amount, 0);
  const perDayVariable = variable / elapsed;
  // Today is partly spent already, so it counts as half a day
  const end = ov.remaining - pending - perDayVariable * Math.max(0, daysLeft - 0.5);
  return { end, perDayVariable, daysLeft };
}

// Average monthly "needs" over the last full months (falls back to this month): the base for the emergency fund
export function averageNeeds(expenses = [], now = new Date(), months = 3) {
  const totals = [];
  for (let i = 1; i <= months; i++) {
    const { year, month } = shiftMonth(now.getFullYear(), now.getMonth(), -i);
    const sum = expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getFullYear() === year && d.getMonth() === month && categoryById(e.categoryId)?.bucket === 'needs';
      })
      .reduce((a, e) => a + e.amount, 0);
    if (sum > 0) totals.push(sum);
  }
  if (!totals.length) {
    return expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && categoryById(e.categoryId)?.bucket === 'needs';
      })
      .reduce((a, e) => a + e.amount, 0);
  }
  return totals.reduce((a, x) => a + x, 0) / totals.length;
}

// Hours until a wish may be bought (48-hour rule); 0 when it's ready to decide
export const WISH_HOURS = 48;
export const wishHoursLeft = (wish, now = new Date()) =>
  Math.max(0, Math.ceil(WISH_HOURS - (now - new Date(wish.createdAt)) / 3600000));

// Ready-made sinking funds for yearly costs
export const FUND_PRESETS = [
  { name: 'Застраховка', icon: 'shield-checkmark' },
  { name: 'Данъци', icon: 'document-text' },
  { name: 'ГТП и гуми', icon: 'car' },
  { name: 'Коледа', icon: 'gift' },
  { name: 'Ваканция', icon: 'airplane' },
];
