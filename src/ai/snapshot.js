// The user's finances as text, for the chat with the dog: this month in the app's own numbers (the same
// functions the screens use, so the chat never disagrees with Home), earlier months, plans, and this
// month's entries. Pure logic, no RN imports.
import { monthOverview, dailyLimit, freeToSpend, shiftMonth, filterMonth, summarize, countsInBudget, bucketOf, sortByDateDesc } from '../budget';
import { pendingSpend, upcomingPayments, goalProgress, monthlyNeeded, monthForecast } from '../plans';
import { getCategories, categoryById, incomeKindById, MONTHS } from '../theme';
import { getAdvice } from '../pet/advice';
import { t } from '../i18n';

// Earlier months to include, and the most entries of the current month (newest first)
const HISTORY_MONTHS = 5;
const MAX_ENTRIES = 250;

// Plain numbers for the model: 1240.5 → "1240.50"
const n = (x) => (Number(x) || 0).toFixed(2);
const share = (x, of) => (of > 0 ? `${Math.round((x / of) * 100)}%` : '–');
const isoDay = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
const catName = (id) => categoryById(id)?.name || t('Без категория');
const BUCKET_NAMES = { needs: 'needs', wants: 'wants', savings: 'savings' };

function categoryLines(byCategory, total) {
  const known = getCategories(true).filter((c) => byCategory[c.id]);
  const lines = known
    .sort((a, b) => byCategory[b.id] - byCategory[a.id])
    .map((c) => `- ${c.name} (${BUCKET_NAMES[c.bucket]}): ${n(byCategory[c.id])} (${share(byCategory[c.id], total)} of spending)`);
  // Automatic payments from shops the app doesn't know yet: counted as wants until the user picks a category
  const rest = total - known.reduce((a, c) => a + byCategory[c.id], 0);
  if (rest > 0.005) lines.push(`- ${t('Без категория')} (counted as wants until a category is picked): ${n(rest)} (${share(rest, total)} of spending)`);
  return lines;
}

function merchantLines(list) {
  const by = {};
  for (const e of list) {
    const key = (e.merchant || '').trim().toLowerCase();
    if (!key || !countsInBudget(e) || bucketOf(e) === 'savings') continue;
    (by[key] ||= { name: e.merchant.trim(), count: 0, sum: 0 });
    by[key].count += 1;
    by[key].sum += e.amount;
  }
  return Object.values(by)
    .sort((a, b) => b.sum - a.sum)
    .slice(0, 12)
    .map((m) => `- ${m.name}: ${n(m.sum)} in ${m.count} payments`);
}

/**
 * data: the store's state ({ expenses, incomes, incomeEntries, recurring, goals, wishes, pet }).
 * Returns the text given to the model as the second part of its system prompt.
 */
export function financeSnapshot(data, now = new Date()) {
  const { expenses = [], incomes = {}, incomeEntries = [], recurring = [], goals = [], wishes = [] } = data;
  const year = now.getFullYear();
  const month = now.getMonth();
  const ov = monthOverview({ expenses, incomes, incomeEntries, year, month, now });
  const pending = pendingSpend(recurring, now);
  const daily = dailyLimit(ov, now, pending);
  const free = freeToSpend(ov, pending);
  const forecast = monthForecast(ov, now, pending);
  const I = ov.income;
  const out = [];
  const add = (...lines) => out.push(...lines);

  add(
    `Today: ${isoDay(now)} (${now.toLocaleDateString('en', { weekday: 'long' })}). Currency: EUR. Amounts are plain numbers in euro.`,
    `Month: ${MONTHS[month]} ${year}, day ${now.getDate()} of ${ov.progress.daysInMonth}, ${ov.progress.daysLeft} days left including today.`,
    ''
  );

  add('## This month');
  if (!I) {
    add('No monthly income is set, so the app cannot compute 50/30/20, the free money or the daily limit. The income is set in Settings.');
  } else {
    const { base, salary, extra } = ov.incomeInfo;
    add(`Income: ${n(I)} (${salary > 0 ? `recorded salary ${n(salary)}` : `monthly income setting ${n(base)}`}${extra > 0 ? `, extra income ${n(extra)}` : ''}).`);
    const b = ov.byBucket;
    add(
      `Needs: ${n(b.needs)} = ${share(b.needs, I)} of income (target up to ${Math.round(ov.split.needs * 100)}% = ${n(I * ov.split.needs)}).`,
      `Wants: ${n(b.wants)} = ${share(b.wants, I)} of income (target up to ${Math.round(ov.split.wants * 100)}% = ${n(I * ov.split.wants)}).`,
      `Put into savings: ${n(b.savings)} = ${share(b.savings, I)} of income (target at least ${Math.round(ov.split.savings * 100)}% = ${n(I * ov.split.savings)}).`,
      `50/30/20 score: ${ov.score ?? '–'} of 100.`
    );
    if (pending > 0) add(`Recurring payments still due this month (not booked yet): ${n(pending)}.`);
    if (free) {
      add(`Free to spend until the end of the month: ${n(free.free)}. This is income − spent − saved − recurring payments still due − the part of the 20% savings not put aside yet (${n(free.reserve)}).`);
    }
    if (daily) {
      add(
        `Daily limit today: ${n(daily.todayLimit)}; spent today on everyday things: ${n(daily.spentToday)}; left for today: ${n(daily.leftToday)}; tomorrow's limit if nothing more is spent today: ${n(daily.limitTomorrow)}.`
      );
      if (daily.eatenSavings > 0) add(`Spending has already eaten ${n(daily.eatenSavings)} of the ${n(daily.reserve)} still meant for savings.`);
      if (daily.overIncome > 0) add(`Spending is ${n(daily.overIncome)} over the whole income.`);
    }
    if (forecast) {
      add(`At the current pace of everyday spending (${n(forecast.perDayVariable)} per day on food, transport, dining and fun) the spending budget ends the month at ${n(forecast.end)}.`);
    }
  }
  const cats = categoryLines(ov.byCategory, ov.total);
  add('', 'Spending by category this month:', ...(cats.length ? cats : ['- nothing recorded yet']));
  const merchants = merchantLines(ov.list);
  if (merchants.length) add('', 'Where the money went this month (top merchants):', ...merchants);

  // Earlier months, newest first; months with nothing recorded are skipped
  const history = [];
  for (let i = 1; i <= HISTORY_MONTHS; i++) {
    const p = shiftMonth(year, month, -i);
    const list = filterMonth(expenses, p.year, p.month);
    if (!list.length) continue;
    const past = monthOverview({ expenses, incomes, incomeEntries, year: p.year, month: p.month, now });
    const sum = summarize(list);
    const top = getCategories(true)
      .filter((c) => sum.byCategory[c.id])
      .sort((a, b) => sum.byCategory[b.id] - sum.byCategory[a.id])
      .map((c) => `${c.name} ${n(sum.byCategory[c.id])}`)
      .join(', ');
    history.push(
      `- ${MONTHS[p.month]} ${p.year}: income ${n(past.income)}, needs ${n(sum.byBucket.needs)}, wants ${n(sum.byBucket.wants)}, savings ${n(sum.byBucket.savings)}, score ${past.score ?? '–'}. By category: ${top}`
    );
  }
  if (history.length) add('', '## Earlier months', ...history);

  if (recurring.length) {
    const next = new Map(upcomingPayments(recurring, now).map((u) => [u.rule.id, u.date]));
    add(
      '',
      '## Recurring payments (booked automatically each month)',
      ...recurring.map((r) => {
        const what = [r.merchant, r.note].filter(Boolean).join(' · ') || catName(r.categoryId);
        return `- ${what} (${catName(r.categoryId)}): ${n(r.amount)} on day ${r.day}${r.paused ? ', paused' : next.has(r.id) ? `, next on ${isoDay(next.get(r.id))}` : ''}`;
      })
    );
  }

  if (goals.length) {
    add(
      '',
      '## Savings goals',
      ...goals.map((g) => {
        const p = goalProgress(g, expenses);
        const perMonth = monthlyNeeded(g, p.saved, now);
        const kind = g.kind === 'emergency' ? 'emergency fund' : g.kind === 'fund' ? 'sinking fund for a yearly cost' : 'goal';
        return `- ${g.name} (${kind}): saved ${n(p.saved)} of ${n(g.target)}${p.done ? ', reached' : ''}${g.deadline ? `, deadline ${isoDay(g.deadline)}` : ''}${perMonth != null && !p.done ? `, needs about ${n(perMonth)} per month` : ''}`;
      })
    );
  }

  const waiting = wishes.filter((w) => !w.decision);
  if (waiting.length) {
    add('', '## Wishlist (things waiting 48 hours before buying)', ...waiting.map((w) => `- ${w.name}: ${n(w.amount)} (${catName(w.categoryId)}), added ${isoDay(w.createdAt)}`));
  }

  const monthIncomes = ov.incomeInfo.list;
  if (monthIncomes.length) {
    add('', '## Income entries this month', ...monthIncomes.map((e) => `- ${isoDay(e.date)}: ${n(e.amount)} ${incomeKindById(e.kind).name}${e.note ? ` (${e.note})` : ''}`));
  }

  // The app's own rule-based tips, so the chat builds on what the user already sees instead of contradicting it
  const tips = getAdvice({ expenses, incomes, incomeEntries, recurring, year, month, now, lastFedAt: data.pet?.lastFedAt });
  if (tips.length) add('', '## Tips the app already shows the user', ...tips.map((tip) => `- ${tip.title} ${tip.text}`));

  const entries = sortByDateDesc(ov.list);
  if (entries.length) {
    add(
      '',
      `## Entries this month, newest first${entries.length > MAX_ENTRIES ? ` (the newest ${MAX_ENTRIES} of ${entries.length})` : ''}`,
      'date | amount | category | where | what for',
      ...entries.slice(0, MAX_ENTRIES).map((e) => {
        const flags = [
          e.source === 'recurring' && 'recurring',
          e.offBudget && 'outside the budget',
          e.fromGoalId && 'paid from a goal, not counted',
        ].filter(Boolean);
        return `${isoDay(e.date)} | ${n(e.amount)} | ${catName(e.categoryId)} | ${e.merchant || '–'} | ${e.note || '–'}${flags.length ? ` [${flags.join(', ')}]` : ''}`;
      })
    );
  }

  return out.join('\n');
}
