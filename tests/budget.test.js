// The money math behind Home: what's free, today's limit and the score.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { monthOverview, freeToSpend, dailyLimit, savingsReserve, budgetScore, getIncome, filterMonth, monthProgress } = require('../src/budget');

// 14 November 2026, midday: 17 days left with today
const now = new Date(2026, 10, 14, 12, 0, 0);
const at = (day, hour = 10) => new Date(2026, 10, day, hour).toISOString();
const exp = (amount, categoryId, day, extra = {}) => ({ id: `${categoryId}-${day}-${amount}`, amount, categoryId, date: at(day), source: 'manual', ...extra });
const overview = (expenses, income = 2000) => monthOverview({ expenses, incomes: { '2026-11': income }, incomeEntries: [], year: 2026, month: 10, now });
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.005, `${a} ≉ ${b}`);

test('income falls back to the last one set before the month', () => {
  const incomes = { '2026-03': 1500, '2026-09': 2000 };
  assert.equal(getIncome(incomes, 2026, 2), 1500);
  assert.equal(getIncome(incomes, 2026, 6), 1500);
  assert.equal(getIncome(incomes, 2026, 10), 2000);
  // Before any was set: the earliest known
  assert.equal(getIncome(incomes, 2025, 0), 1500);
  assert.equal(getIncome({}, 2026, 0), 0);
});

test('filterMonth returns only that month, in the list order', () => {
  const list = [exp(10, 'groceries', 3), { ...exp(20, 'groceries', 3), date: new Date(2026, 9, 30).toISOString() }, exp(30, 'dining', 9)];
  assert.deepEqual(filterMonth(list, 2026, 10).map((e) => e.amount), [10, 30]);
  assert.deepEqual(filterMonth(list, 2026, 9).map((e) => e.amount), [20]);
  assert.equal(filterMonth([], 2026, 10).length, 0);
});

test('month progress counts today among the days left', () => {
  const p = monthProgress(2026, 10, now);
  assert.equal(p.daysInMonth, 30);
  assert.equal(p.daysLeft, 17);
  assert.equal(p.isCurrent, true);
  assert.equal(monthProgress(2026, 9, now).isPast, true);
});

test('totals by bucket; off-budget and paid-from-goal entries are left out', () => {
  const ov = overview([
    exp(700, 'rent', 1),
    exp(100, 'dining', 5),
    exp(200, 'saving', 6, { goalId: 'g1' }),
    exp(999, 'shopping', 7, { offBudget: true }),
    exp(50, 'travel', 8, { fromGoalId: 'g1' }),
  ]);
  assert.deepEqual(ov.byBucket, { needs: 700, wants: 100, savings: 200 });
  assert.equal(ov.total, 1000);
  assert.equal(ov.remaining, 1000);
});

test('free to spend keeps the unsaved part of the savings target and the payments still due', () => {
  const ov = overview([exp(700, 'rent', 1), exp(100, 'dining', 5), exp(200, 'saving', 6)]);
  // 20% of 2000 = 400 target, 200 already saved
  assert.equal(savingsReserve(ov), 200);
  const free = freeToSpend(ov, 50);
  // 2000 − 700 − 100 − 200 saved − 200 still to save − 50 due
  assert.equal(free.free, 750);
  assert.equal(free.reserve, 200);
  assert.equal(freeToSpend(overview([], 0)), null);
});

test("today's limit is the morning's free money over the days left, and today's spending comes off it", () => {
  const before = [exp(700, 'rent', 1), exp(100, 'dining', 5)];
  const morning = dailyLimit(overview(before), now);
  // 2000 − 800 − 400 reserve = 800 over 17 days
  near(morning.todayLimit, 800 / 17);
  near(morning.leftToday, 800 / 17);
  assert.equal(morning.over, false);

  const after = dailyLimit(overview([...before, exp(20, 'groceries', 14)]), now);
  near(after.todayLimit, 800 / 17);
  near(after.leftToday, 800 / 17 - 20);
  near(after.limitTomorrow, 780 / 16);

  const over = dailyLimit(overview([...before, exp(120, 'shopping', 14)]), now);
  assert.equal(over.over, true);
  near(over.overToday, 120 - 800 / 17);
});

test('rent paid today lowers the limit without counting as overspending', () => {
  const d = dailyLimit(overview([exp(700, 'rent', 14)]), now);
  assert.equal(d.spentToday, 0);
  assert.equal(d.over, false);
  near(d.todayLimit, (2000 - 700 - 400) / 17);
});

test('spending past the free money eats the savings, never more than the reserve', () => {
  const d = dailyLimit(overview([exp(1700, 'shopping', 3)]), now);
  // 300 left of the income, 400 should be kept: 100 of the savings is gone
  assert.equal(d.eatenSavings, 100);
  assert.equal(d.limit, 0);
  const worse = dailyLimit(overview([exp(2300, 'shopping', 3)]), now);
  assert.equal(worse.eatenSavings, 400);
  assert.equal(worse.overIncome, 300);
});

test('no limit outside the current month or without income', () => {
  const past = monthOverview({ expenses: [], incomes: { '2026-10': 2000 }, year: 2026, month: 9, now });
  assert.equal(dailyLimit(past, now), null);
  assert.equal(dailyLimit(overview([], 0), now), null);
});

test('score: on the rule is 100, over income is capped at 15, no income is null', () => {
  const split = { needs: 0.5, wants: 0.3, savings: 0.2 };
  assert.equal(budgetScore({ income: 2000, byBucket: { needs: 1000, wants: 600, savings: 400 }, dayFrac: 1, split }), 100);
  assert.ok(budgetScore({ income: 2000, byBucket: { needs: 1500, wants: 600, savings: 0 }, dayFrac: 1, split }) <= 15);
  assert.equal(budgetScore({ income: 0, byBucket: { needs: 0, wants: 0, savings: 0 } }), null);
  // Wants ahead of the month lose points even under the cap
  const early = budgetScore({ income: 2000, byBucket: { needs: 0, wants: 500, savings: 0 }, dayFrac: 0.3, split });
  assert.ok(early < 100);
});
