// Recurring payments, goals and the 48-hour wishlist.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { dueRecurring, resumedLastKey, upcomingPayments, pendingThisMonth, goalProgress, monthlyNeeded, wishHoursLeft, firstOpenGoal, averageNeeds, ruleDate } = require('../src/plans');

const now = new Date(2026, 10, 14, 12, 0, 0);
const rule = (extra = {}) => ({ id: 'r1', amount: 750, categoryId: 'rent', merchant: '', note: '', day: 1, lastKey: '2026-10', paused: false, ...extra });

test('a rule books every month it owes, once', () => {
  const due = dueRecurring([rule({ lastKey: '2026-08' })], now);
  assert.deepEqual(due.expenses.map((e) => new Date(e.date).getMonth()), [8, 9, 10]);
  assert.equal(due.rules[0].lastKey, '2026-11');
  // Run again with the updated rules: nothing more
  const again = dueRecurring(due.rules, now);
  assert.equal(again.expenses.length, 0);
  assert.equal(again.rules, due.rules);
});

test("a payment dated later this month isn't booked yet, and still counts as pending", () => {
  const later = rule({ day: 25 });
  assert.equal(dueRecurring([later], now).expenses.length, 0);
  assert.equal(pendingThisMonth([later], now), 750);
  assert.equal(upcomingPayments([later], now)[0].date.getDate(), 25);
});

test('paused rules book nothing, and resuming skips what was missed', () => {
  const paused = rule({ lastKey: '2026-06', paused: true });
  assert.equal(dueRecurring([paused], now).expenses.length, 0);
  assert.equal(pendingThisMonth([paused], now), 0);
  // Its day this month has passed: November counts as done
  assert.equal(resumedLastKey(paused, now), '2026-11');
  assert.equal(resumedLastKey(rule({ lastKey: '2026-06', day: 25 }), now), '2026-10');
});

test('day 31 falls on the last day of a shorter month', () => {
  assert.equal(ruleDate({ day: 31 }, 2027, 1).getDate(), 28);
  assert.equal(ruleDate({ day: 31 }, 2026, 10).getDate(), 30);
});

test('goal progress: deposits in, payments from the goal out', () => {
  const goal = { id: 'g1', target: 1000 };
  const expenses = [
    { goalId: 'g1', amount: 300 },
    { goalId: 'g1', amount: 200 },
    { fromGoalId: 'g1', amount: 100 },
    { goalId: 'other', amount: 999 },
  ];
  const p = goalProgress(goal, expenses);
  assert.deepEqual(p, { saved: 400, left: 600, progress: 0.4, done: false });
  assert.equal(goalProgress({ id: 'g1', target: 400 }, expenses).done, true);
});

test('monthly amount to reach a goal by its deadline', () => {
  const goal = { target: 1500, deadline: new Date(2027, 5, 1).toISOString() };
  // December … May: 7 months from November
  assert.equal(monthlyNeeded(goal, 100, now), 200);
  assert.equal(monthlyNeeded({ target: 1500 }, 0, now), null);
  assert.equal(monthlyNeeded({ target: 1500, deadline: new Date(2026, 0, 1).toISOString() }, 0, now), null);
});

test('an unfinished goal comes first', () => {
  const states = [{ g: { name: 'a' }, p: { done: true } }, { g: { name: 'b' }, p: { done: false } }];
  assert.equal(firstOpenGoal(states).g.name, 'b');
  assert.equal(firstOpenGoal([]), undefined);
});

test('a wish can be decided after 48 hours', () => {
  const wish = { createdAt: new Date(now - 10 * 3600000).toISOString() };
  assert.equal(wishHoursLeft(wish, now), 38);
  assert.equal(wishHoursLeft({ createdAt: new Date(now - 50 * 3600000).toISOString() }, now), 0);
});

test('average needs over the last full months', () => {
  const e = (amount, month, day = 2) => ({ amount, categoryId: 'rent', date: new Date(2026, month, day).toISOString() });
  assert.equal(averageNeeds([e(700, 8), e(900, 9), e(5000, 10)], now), 800);
  // Nothing before this month: this month is all there is
  assert.equal(averageNeeds([e(600, 10)], now), 600);
  // ...unless a planned budget is given: a few days of logging say little about a whole month
  assert.equal(averageNeeds([e(3, 10)], now, 3, 1200), 1200);
  // Earlier months still win over the plan
  assert.equal(averageNeeds([e(700, 8), e(900, 9)], now, 3, 1200), 800);
});
