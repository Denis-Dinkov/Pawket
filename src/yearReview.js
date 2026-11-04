// "Your year with Charlie": a summary of one calendar year. Pure logic, no RN imports.
import { getCategories } from './theme';
import { monthOverview, filterMonth, summarize, budgetScore, monthIncome, countsInBudget } from './budget';

const normalizeMerchant = (m) => (m || '').trim().toLowerCase();

export function yearReview({ expenses = [], incomes = {}, incomeEntries = [], year, now = new Date() }) {
  const list = expenses.filter((e) => new Date(e.date).getFullYear() === year);
  const sum = summarize(list);
  let income = 0;
  const months = [];
  for (let m = 0; m < 12; m++) {
    if (new Date(year, m, 1) > now) break;
    const ov = monthOverview({ expenses, incomes, incomeEntries, year, month: m, now });
    income += ov.income;
    const monthList = filterMonth(expenses, year, m);
    const score = ov.income && monthList.length >= 3
      ? budgetScore({ income: ov.income, byBucket: summarize(monthList).byBucket, dayFrac: ov.progress.dayFrac })
      : null;
    months.push({ month: m, total: ov.total, score, income: monthIncome({ incomes, incomeEntries }, year, m).total });
  }
  const scored = months.filter((x) => x.score != null);
  const best = scored.reduce((a, x) => (!a || x.score > a.score ? x : a), null);
  const priciest = months.reduce((a, x) => (!a || x.total > a.total ? x : a), null);

  const topCategory = getCategories(true)
    .filter((c) => sum.byCategory[c.id])
    .map((c) => ({ ...c, value: sum.byCategory[c.id] }))
    .sort((a, b) => b.value - a.value)[0];

  const merchants = {};
  list.forEach((e) => {
    const key = normalizeMerchant(e.merchant);
    if (!key || !countsInBudget(e)) return;
    merchants[key] = merchants[key] || { name: e.merchant.trim(), value: 0, count: 0 };
    merchants[key].value += e.amount;
    merchants[key].count += 1;
  });
  const topMerchant = Object.values(merchants).sort((a, b) => b.count - a.count)[0];

  return {
    year,
    count: list.length,
    total: sum.total,
    income,
    saved: sum.byBucket.savings,
    byBucket: sum.byBucket,
    avgScore: scored.length ? Math.round(scored.reduce((a, x) => a + x.score, 0) / scored.length) : null,
    best,
    priciest: priciest?.total ? priciest : null,
    topCategory,
    topMerchant,
    months,
  };
}
