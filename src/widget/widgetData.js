// Widget data — pure logic, used by the app and by the Android task handler.
import { moneyShort, money } from '../theme';
import { petStatus, EXPRESSIONS } from '../pet/logic';
import { getAdvice } from '../pet/advice';
import { dailyLimit } from '../budget';
import { pendingSpend } from '../plans';
// Labels come in as props — the iOS widget function can't see anything outside itself
const labels = () => ({ needsLabel: 'Нужди', wantsLabel: 'Желания', savingsLabel: 'Спестявания' });

export const WIDGET_EMOJI = {
  ecstatic: '🤩', happy: '🐶', worried: '😟', sad: '😢', crying: '😭', hungry: '🦴', sleeping: '💤',
};

const clamp01 = (x) => Math.max(0, Math.min(1, x || 0));

// Short amount for the round lock-screen widget: 850, 1,2k, −42
export function shortAmount(n) {
  const sign = n < 0 ? '−' : '';
  const v = Math.abs(n);
  if (v < 1000) return `${sign}${Math.round(v)}`;
  // Round down so we never show more than is actually left (1 988 → 1,9k)
  const k = v < 10000 ? Math.floor(v / 100) / 10 : Math.floor(v / 1000);
  return `${sign}${String(k).replace('.', ',')}k`;
}

// Serializable props: strings and numbers only, already formatted
export function widgetProps({ expenses = [], incomes = {}, incomeEntries = [], recurring = [], pet }, now = new Date()) {
  if (!pet) {
    return { ...labels(), ready: 0, petName: 'Pawket', expression: 'sleeping', emoji: WIDGET_EMOJI.sleeping, moodLabel: 'Отвори приложението', remainingLabel: 'Остават', remainingText: '—', remainingShort: '—', leftRatio: 0, perDayText: '', tip: '', mood: 0, fullness: 0, needs: 0, wants: 0, savings: 0, stageKey: 'kitten' };
  }
  const st = petStatus({ expenses, incomes, incomeEntries, pet, now });
  const ov = st.overview;
  const daily = dailyLimit(ov, now, pendingSpend(recurring, now));
  const tip = getAdvice({ expenses, incomes, incomeEntries, recurring, year: now.getFullYear(), month: now.getMonth(), now, lastFedAt: pet.lastFedAt })[0];
  const I = ov.income || 0;
  return {
    ...labels(),
    ready: 1,
    petName: pet.name,
    stageKey: st.stage.key,
    stageName: st.stage.name,
    expression: st.expression,
    emoji: WIDGET_EMOJI[st.expression],
    moodLabel: EXPRESSIONS[st.expression].label,
    moodColor: EXPRESSIONS[st.expression].color,
    mood: st.mood,
    fullness: st.fullness,
    remainingLabel: ov.remaining < 0 ? 'Над дохода с' : 'Остават',
    remainingText: I ? moneyShort(Math.abs(ov.remaining)) : 'задай доход',
    remainingShort: I ? shortAmount(ov.remaining) : '—',
    leftRatio: I ? clamp01(ov.remaining / I) : 0,
    perDayText: daily ? `≈ ${money(daily.limit)}/ден` : '',
    needs: I ? clamp01(ov.byBucket.needs / (0.5 * I)) : 0,
    wants: I ? clamp01(ov.byBucket.wants / (0.3 * I)) : 0,
    savings: I ? clamp01(ov.byBucket.savings / (0.2 * I)) : 0,
    tip: tip ? tip.title : '',
  };
}

// Hunger and "€/day" change over time, so the iOS widget gets entries for 72 hours ahead
export function buildWidgetTimeline(data, now = new Date(), hours = 72, stepHours = 6) {
  const entries = [];
  for (let h = 0; h <= hours; h += stepHours) {
    const date = new Date(now.getTime() + h * 3600000);
    entries.push({ date, props: widgetProps(data, date) });
  }
  return entries;
}

// Props for the Live Activity (Dynamic Island): today's limit first, then the month
export function activityProps({ expenses = [], incomes = {}, incomeEntries = [], recurring = [], pet }, now = new Date()) {
  const st = petStatus({ expenses, incomes, incomeEntries, pet, now });
  const ov = st.overview;
  const daily = dailyLimit(ov, now, pendingSpend(recurring, now));
  const left = daily ? Math.round(daily.left) : 0;
  const tip = getAdvice({ expenses, incomes, incomeEntries, recurring, year: now.getFullYear(), month: now.getMonth(), now, lastFedAt: pet.lastFedAt })[0];
  return {
    petName: pet.name,
    stageKey: st.stage.key,
    expression: st.expression,
    emoji: WIDGET_EMOJI[st.expression],
    moodLabel: EXPRESSIONS[st.expression].label.toLowerCase(),
    todayLeft: Math.abs(left),
    // Over the limit it reads "−42 €", so the red number isn't mistaken for what's left
    todayLeftText: daily ? `${left < 0 ? '−' : ''}${moneyShort(Math.abs(left))}` : '—',
    over: daily?.over ? 1 : 0,
    spentRatio: daily && daily.limit > 0 ? clamp01(daily.spentToday / daily.limit) : 0,
    remainingText: ov.income ? `${ov.remaining < 0 ? 'Над дохода с' : 'Остават до края на месеца'} ${moneyShort(Math.abs(ov.remaining))}` : 'Задай доход в приложението',
    remainingShort: ov.income ? `месец ${moneyShort(ov.remaining)}` : '',
    tip: tip?.title || 'Всичко е наред 🐶',
  };
}
