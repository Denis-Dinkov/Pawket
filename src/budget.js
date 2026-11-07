// Pure budget logic (no RN) — used by the screens, the dog and the widgets.
import { categoryById } from './theme';
import { t } from './i18n';

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
 * Total income for the month: the recorded salary when there is one (it replaces the monthly income setting,
 * as the app says, even when it's lower), otherwise the setting; plus all extra income (bonus, freelance, gift...).
 */
export function monthIncome({ incomes = {}, incomeEntries = [] }, year, month) {
  const base = getIncome(incomes, year, month);
  const list = filterMonth(incomeEntries, year, month);
  const sum = (arr) => arr.reduce((a, e) => a + e.amount, 0);
  const salary = sum(list.filter((e) => e.kind === 'salary'));
  const extra = sum(list.filter((e) => e.kind !== 'salary'));
  return { base, salary, extra, total: (salary > 0 ? salary : base) + extra, list };
}

/**
 * Whether an expense counts in the month's budget. Two kinds don't:
 * - a payment out of a goal or sinking fund (fromGoalId): its money was already counted as savings
 *   when it was put aside, so counting it again would double it;
 * - an entry marked "outside the budget" (offBudget): paid from money the user already had elsewhere
 *   (another account, old savings), e.g. existing savings moved into a goal. It's kept for the record
 *   and still moves a goal's progress, but this month's numbers ignore it.
 */
export const countsInBudget = (e) => !e.fromGoalId && !e.offBudget;

// Entries grouped by month, built once per array. The store replaces the array on every change,
// so a cached index is never stale, and the many per-render month lookups don't re-scan and re-parse every date.
const monthIndex = new WeakMap();
function indexByMonth(list) {
  let index = monthIndex.get(list);
  if (!index) {
    index = new Map();
    for (const e of list) {
      const d = new Date(e.date);
      const key = monthKey(d.getFullYear(), d.getMonth());
      const bucket = index.get(key);
      if (bucket) bucket.push(e);
      else index.set(key, [e]);
    }
    monthIndex.set(list, index);
  }
  return index;
}

const EMPTY_LIST = Object.freeze([]);

// The entries of one month, in the array's order. The result is shared: callers must not mutate it.
export function filterMonth(expenses, year, month) {
  if (!expenses?.length) return EMPTY_LIST;
  return indexByMonth(expenses).get(monthKey(year, month)) || EMPTY_LIST;
}

// The 50/30/20 part an expense counts in. One without a category yet (an Apple Pay payment from a shop
// Pawket doesn't know) still is spending, so it counts as a want until the user picks one.
export const bucketOf = (e) => categoryById(e.categoryId)?.bucket || 'wants';

export function summarize(list) {
  const byCategory = {};
  const byBucket = { needs: 0, wants: 0, savings: 0 };
  let total = 0;
  for (const e of list) {
    if (!countsInBudget(e)) continue;
    total += e.amount;
    byCategory[e.categoryId] = (byCategory[e.categoryId] || 0) + e.amount;
    byBucket[bucketOf(e)] += e.amount;
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
  if (score >= 85) return t('отлично');
  if (score >= 65) return t('добре');
  if (score >= 45) return t('внимавай');
  return t('време за промяна');
}

// The same score broken into parts — for the "Why is the dog like this" explanation
export function budgetScoreParts({ income, byBucket, dayFrac = 1 }) {
  if (!income) return null;
  const I = income;
  const { needs, wants } = byBucket;
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
  // Only spending over income caps the score. Savings above the leftover come from money saved earlier
  // (e.g. moving existing savings into a goal), which isn't overspending.
  const overIncome = needs + wants > I;
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
  return {
    list,
    ...sum,
    income,
    incomeInfo,
    progress,
    remaining,
    score: budgetScore({ income, byBucket: sum.byBucket, dayFrac: progress.dayFrac }),
  };
}

/**
 * What's left of this month's income before recurring payments still due: the whole income minus what was
 * spent and what was put into savings this month. Nothing is held back in advance; the 20% for savings is a
 * target (the score and the tips follow it), not a deduction. Money the user already had (offBudget) isn't
 * counted at all.
 */
export function spendRoom(ov) {
  const { needs, wants, savings } = ov.byBucket;
  return ov.income - needs - wants - savings;
}

/**
 * The app's main number: what's still free to spend this month. That's what's left of the income (spendRoom),
 * minus the recurring payments still due, minus the savings still to be put aside (savingsReserve), so it's
 * exactly the money the daily limit spreads over the days left. Negative: spending has reached the savings.
 * ratio: the part of the spending budget (the 80%) still free.
 */
export function freeToSpend(ov, pending = 0) {
  if (!ov.income) return null;
  const reserve = savingsReserve(ov);
  const budget = ov.income * (1 - SAVINGS_SHARE);
  const free = spendRoom(ov) - pending - reserve;
  return { free, budget, reserve, ratio: free / budget };
}

// Fixed costs: paid once a month whether recorded as recurring or by hand. Like recurring payments, they
// lower the limit for the days left without counting as today's overspending
export const FIXED_CATEGORIES = new Set(['rent', 'bills']);

// The 50/30/20 savings share
export const SAVINGS_SHARE = 0.2;

/**
 * The part of this month's savings target (20% of income) not put aside yet. The daily limit keeps it
 * out of reach, so spending exactly to the limit every day still leaves the 20% at the end of the month.
 */
export function savingsReserve(ov) {
  if (!ov.income) return 0;
  return Math.max(0, SAVINGS_SHARE * ov.income - ov.byBucket.savings);
}

/**
 * The daily limit. Each morning the money free to spend (freeToSpend: the income minus what's spent and saved,
 * the recurring payments still due and the rest of the 20% for savings) is split evenly over the days left,
 * today included: that's today's limit (todayLimit). Every expense today comes off it in full (leftToday), so
 * it's a budget for the day. The next day starts from what's actually left: spend less today and tomorrow's
 * limit grows, spend more and it drops. Spending exactly the limit every day leaves 20% for savings.
 *
 * - todayLimit: today's limit, set before today's everyday spending (also morningLimit)
 * - leftToday: what's left of it now; overToday: how far today's spending went past it; over = overToday > 0
 * - limit: the average per day from now on, today's spending included (tomorrow's limit is limitTomorrow)
 * - eatenSavings: how much of the savings still to be put aside is spent this month; eatenToday: today's part
 * - overIncome: spending beyond the whole income, after the savings are gone
 * Recurring payments booked today and fixed costs (FIXED_CATEGORIES) lower the limit but never count as "over":
 * they're planned, not everyday spending.
 */
export function dailyLimit(ov, now = new Date(), pendingRecurring = 0) {
  if (!ov.progress.isCurrent || !ov.income || !ov.progress.daysLeft) return null;
  const days = ov.progress.daysLeft;
  const todayNW = ov.list.filter(
    (e) =>
      countsInBudget(e) &&
      new Date(e.date).toDateString() === now.toDateString() &&
      ['needs', 'wants'].includes(bucketOf(e))
  );
  const sum = (list) => list.reduce((a, e) => a + e.amount, 0);
  // Everyday spending today: what can push the limit down. Recurring payments and fixed costs (rent, bills)
  // are planned, not today's choice, so they lower the limit without counting as "over"
  const spentToday = sum(todayNW.filter((e) => e.source !== 'recurring' && !FIXED_CATEGORIES.has(e.categoryId)));
  // All of today's needs and wants: what today took from the savings, whatever it was
  const spentTodayAll = sum(todayNW.filter((e) => e.source !== 'recurring'));
  const reserve = savingsReserve(ov);
  // Left of the income now (after the payments still due), and before today's everyday spending
  const room = spendRoom(ov) - pendingRecurring;
  const morningRoom = room + spentToday;
  const free = room - reserve;
  const limit = Math.max(0, free) / days;
  const morningLimit = Math.max(0, morningRoom - reserve) / days;
  const eaten = (r) => Math.min(reserve, Math.max(0, reserve - r));
  const eatenSavings = eaten(room);
  const leftToday = morningLimit - spentToday;
  return {
    // The calculation in four numbers, for the explanation: income − spent − savings (20%) − due = free; free ÷ days
    income: ov.income,
    spent: ov.byBucket.needs + ov.byBucket.wants,
    savings: ov.byBucket.savings + reserve,
    pending: pendingRecurring,
    free,
    days,
    limit,
    morningLimit,
    todayLimit: morningLimit,
    // The free money this morning, before today's everyday spending: what todayLimit is divided from
    morningFree: Math.max(0, morningRoom - reserve),
    leftToday,
    overToday: Math.max(0, -leftToday),
    // Tomorrow's limit if nothing more is spent today: what's free then, over one day less
    limitTomorrow: days > 1 ? Math.max(0, free) / (days - 1) : 0,
    spentToday,
    over: spentToday > morningLimit + 0.005,
    reserve,
    eatenSavings,
    eatenToday: Math.max(0, eatenSavings - eaten(room + spentTodayAll)),
    overIncome: Math.max(0, -room),
  };
}
