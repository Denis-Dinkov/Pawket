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

export function summarize(list) {
  const byCategory = {};
  const byBucket = { needs: 0, wants: 0, savings: 0 };
  let total = 0;
  for (const e of list) {
    if (!countsInBudget(e)) continue;
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
 * Today's limit: what's left of the income after this month's spending, savings and the recurring
 * payments still due, minus the savings still to be put aside (savingsReserve), spread over the remaining days.
 * It's computed as of the start of the day, so it doesn't move with every expense; `left` is what remains of it today.
 *
 * Going over the limit borrows from the next days (their limit drops). Once the money for needs and wants
 * is gone altogether, spending comes out of the savings reserve:
 * - eatenSavings: how much of the reserve is spent this month (0..reserve)
 * - eatenToday: how much of that happened today (what today's spending took from the savings)
 * - overIncome: spending beyond the whole income, after the reserve is gone
 * - tomorrowLimit: the limit tomorrow will start with if nothing else is spent today
 */
export function dailyLimit(ov, now = new Date(), pendingRecurring = 0) {
  if (!ov.progress.isCurrent || !ov.income || !ov.progress.daysLeft) return null;
  const today = ov.list.filter((e) => countsInBudget(e) && new Date(e.date).toDateString() === now.toDateString());
  // Recurring payments aren't today's spending: until booked they're in pendingRecurring, so a rent day
  // would otherwise count the rent twice and read as hundreds over the limit
  const spentToday = today
    .filter((e) => e.source !== 'recurring' && ['needs', 'wants'].includes(categoryById(e.categoryId)?.bucket))
    .reduce((a, e) => a + e.amount, 0);
  const reserve = savingsReserve(ov);
  // What's left now, and what was left this morning (today's needs and wants added back)
  const room = spendRoom(ov) - pendingRecurring;
  const startRoom = room + spentToday;
  const eaten = (r) => Math.min(reserve, Math.max(0, reserve - r));
  // What the limit spreads over the days left: the morning's room minus the savings still to be put aside
  const base = startRoom - reserve;
  const limit = Math.max(0, base) / ov.progress.daysLeft;
  const eatenSavings = eaten(room);
  const daysAfter = ov.progress.daysLeft - 1;
  return {
    // The steps of the calculation, for the explanation sheet: income − spent before today − saved
    // − payments still due − savings still to put aside = base; base ÷ days = limit
    income: ov.income,
    spentBefore: ov.byBucket.needs + ov.byBucket.wants - spentToday,
    saved: ov.byBucket.savings,
    pending: pendingRecurring,
    base,
    days: ov.progress.daysLeft,
    limit,
    spentToday,
    left: limit - spentToday,
    over: spentToday > limit,
    reserve,
    eatenSavings,
    eatenToday: Math.max(0, eatenSavings - eaten(startRoom)),
    overIncome: Math.max(0, -room),
    tomorrowLimit: daysAfter > 0 ? Math.max(0, room - reserve) / daysAfter : null,
  };
}
