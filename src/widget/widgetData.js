// Widget data — pure logic, used by the app and by the Android task handler.
import { moneyShort, money, decimalSep, categoryById } from '../theme';
import { petStatus, EXPRESSIONS, dayKey } from '../pet/logic';
import { getAdvice } from '../pet/advice';
import { dailyLimit, freeToSpend } from '../budget';
import { pendingSpend, upcomingPayments } from '../plans';
import { sessionState, SESSION_XP, NOSPEND_XP_BEFORE } from '../sessions';
import { outfitOf, lookKey } from '../pet/outfit';
import { t } from '../i18n';
// Labels come in as props — the iOS widget function can't see anything outside itself
const labels = () => ({ needsLabel: t('Нужди'), wantsLabel: t('Желания'), savingsLabel: t('Спестявания') });

export const WIDGET_EMOJI = {
  ecstatic: '🤩', happy: '🐶', worried: '😟', sad: '😢', crying: '😭', hungry: '🦴', sleeping: '💤',
};

const clamp01 = (x) => Math.max(0, Math.min(1, x || 0));

// The widget draws SF Symbols; the app's categories use Ionicons names
const SF_SYMBOLS = {
  home: 'house.fill', cart: 'cart.fill', flash: 'bolt.fill', car: 'car.fill', medkit: 'cross.case.fill',
  restaurant: 'fork.knife', 'bag-handle': 'bag.fill', film: 'film.fill', airplane: 'airplane', repeat: 'repeat',
  wallet: 'wallet.bifold.fill', 'trending-up': 'chart.line.uptrend.xyaxis', cafe: 'cup.and.saucer.fill', paw: 'pawprint.fill',
  gift: 'gift.fill', book: 'book.fill', school: 'graduationcap.fill', fitness: 'figure.run', barbell: 'dumbbell.fill',
  shirt: 'tshirt.fill', 'game-controller': 'gamecontroller.fill', beer: 'mug.fill', wine: 'wineglass.fill', bus: 'bus.fill',
  train: 'tram.fill', bicycle: 'bicycle', heart: 'heart.fill', 'phone-portrait': 'iphone', laptop: 'laptopcomputer',
  musical: 'music.note', pizza: 'fork.knife', basket: 'basket.fill', water: 'drop.fill', wifi: 'wifi', cut: 'scissors',
  'fast-food': 'takeoutbag.and.cup.and.straw.fill', tv: 'tv.fill', 'musical-notes': 'music.note', ticket: 'ticket.fill',
  briefcase: 'briefcase.fill', card: 'creditcard.fill', people: 'person.2.fill', leaf: 'leaf.fill',
  sparkles: 'sparkles', umbrella: 'umbrella.fill', 'color-palette': 'paintpalette.fill', construct: 'wrench.and.screwdriver.fill',
};
// Android draws text only, so its quick-add buttons use emoji
const EMOJI = {
  home: '🏠', cart: '🛒', flash: '⚡', car: '🚗', medkit: '💊', restaurant: '🍽️', 'bag-handle': '🛍️', film: '🎬',
  airplane: '✈️', repeat: '🔁', cafe: '☕', beer: '🍺', pizza: '🍕', 'fast-food': '🍔', bus: '🚌', bicycle: '🚲',
  train: '🚆', water: '💧', wifi: '📶', 'phone-portrait': '📱', tv: '📺', 'game-controller': '🎮', 'musical-notes': '🎵',
  ticket: '🎟️', book: '📚', school: '🎓', fitness: '🏃', barbell: '🏋️', paw: '🐾', heart: '❤️', gift: '🎁', shirt: '👕',
  cut: '✂️', construct: '🔧', briefcase: '💼', card: '💳', people: '👥', umbrella: '☂️', leaf: '🌿', basket: '🧺',
};
const emojiFor = (icon) => EMOJI[String(icon || '').replace(/-outline$/, '')] || '🏷️';
export const sfSymbolFor = (icon) => SF_SYMBOLS[String(icon || '').replace(/-outline$/, '')] || 'tag.fill';

// The widget's quick-add buttons: the categories used most in the last 60 days (savings aside), then the usual ones
const QUICK_COUNT = 3;
const QUICK_FALLBACK = ['groceries', 'dining', 'transport', 'shopping'];
export function quickCategories(expenses = [], now = new Date()) {
  const since = now.getTime() - 60 * 86400000;
  const counts = {};
  for (const e of expenses) {
    if (e.goalId || e.source === 'recurring' || new Date(e.date).getTime() < since) continue;
    counts[e.categoryId] = (counts[e.categoryId] || 0) + 1;
  }
  const ranked = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  return [...new Set([...ranked, ...QUICK_FALLBACK])]
    .map(categoryById)
    .filter((c) => c && !c.archived && c.bucket !== 'savings')
    .slice(0, QUICK_COUNT);
}

// "днес", "утре", "след 3 дни", or the date
function whenLabel(date, now) {
  const day = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(date) - day(now)) / 86400000);
  if (days <= 0) return t('днес');
  if (days === 1) return t('утре');
  if (days < 7) return t('след {0} дни', { 0: days });
  return `${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Short amount for the round lock-screen widget: 850, 1,2k, −42
export function shortAmount(n) {
  const sign = n < 0 ? '−' : '';
  const v = Math.abs(n);
  if (v < 1000) return `${sign}${Math.round(v)}`;
  // Round down so we never show more than is actually left (1 988 → 1,9k)
  const k = v < 10000 ? Math.floor(v / 100) / 10 : Math.floor(v / 1000);
  return `${sign}${String(k).replace('.', decimalSep())}k`;
}

// Serializable props: strings and numbers only, already formatted
export function widgetProps({ expenses = [], incomes = {}, incomeEntries = [], recurring = [], pet }, now = new Date()) {
  if (!pet) {
    return { ...labels(), ready: 0, petName: 'Pawket', expression: 'sleeping', emoji: WIDGET_EMOJI.sleeping, moodLabel: t('Отвори приложението'), remainingLabel: t('Свободни'), remainingText: '—', remainingShort: '—', leftRatio: 0, perDayText: '', todayText: '', over: 0, todayOver: 0, tip: '', mood: 0, fullness: 0, needs: 0, wants: 0, savings: 0, needsPct: '', wantsPct: '', savingsPct: '', stageKey: 'kitten', lookKey: '', nextPayment: '', ...quickProps([]) };
  }
  const st = petStatus({ expenses, incomes, incomeEntries, pet, now });
  const ov = st.overview;
  const pending = pendingSpend(recurring, now);
  const daily = dailyLimit(ov, now, pending);
  // The same main number as Home: free to spend on needs and wants this month
  const free = freeToSpend(ov, pending);
  const tip = getAdvice({ expenses, incomes, incomeEntries, recurring, year: now.getFullYear(), month: now.getMonth(), now, lastFedAt: pet.lastFedAt })[0];
  const I = ov.income || 0;
  const share = (k, target) => (I ? `${Math.round((ov.byBucket[k] / I) * 100)}% / ${target}%` : '');
  const left = daily ? Math.round(daily.left) : 0;
  // The next recurring payment, within two weeks
  const next = upcomingPayments(recurring, now).find((p) => p.date - now <= 14 * 86400000);
  return {
    ...labels(),
    ready: 1,
    petName: pet.name,
    stageKey: st.stage.key,
    // The picture to show: stage + outfit (PetSnapshots saves one set per look)
    lookKey: lookKey(st.stage.key, outfitOf(pet)),
    stageName: st.stage.name,
    expression: st.expression,
    emoji: WIDGET_EMOJI[st.expression],
    moodLabel: EXPRESSIONS[st.expression].label,
    moodColor: EXPRESSIONS[st.expression].color,
    mood: st.mood,
    fullness: st.fullness,
    remainingLabel: free && free.free < 0 ? t('Над бюджета с') : t('Свободни'),
    remainingText: free ? moneyShort(Math.abs(free.free)) : t('задай доход'),
    remainingShort: free ? shortAmount(free.free) : '—',
    leftRatio: free ? clamp01(free.ratio) : 0,
    perDayText: daily ? t('≈ {0}/ден', { 0: money(daily.limit) }) : '',
    over: free && free.free < 0 ? 1 : 0,
    // The same words as Home: what's left for today, or how much over the limit
    // Spending that reached the savings is said as it is, not just "over the limit"
    todayText: daily
      ? daily.eatenToday > 0
        ? t('Днес {0} от спестяванията', { 0: moneyShort(daily.eatenToday) })
        : left < 0
          ? t('Днес {0} над лимита', { 0: moneyShort(-left) })
          : t('Днес остават {0}', { 0: moneyShort(left) })
      : t('Задай доход в приложението'),
    todayOver: daily && left < 0 ? 1 : 0,
    needsPct: share('needs', 50),
    wantsPct: share('wants', 30),
    savingsPct: share('savings', 20),
    needs: I ? clamp01(ov.byBucket.needs / (0.5 * I)) : 0,
    wants: I ? clamp01(ov.byBucket.wants / (0.3 * I)) : 0,
    savings: I ? clamp01(ov.byBucket.savings / (0.2 * I)) : 0,
    tip: tip ? tip.title : '',
    nextPayment: next ? t('{0} · {1} · {2}', { 0: payeeOf(next.rule), 1: moneyShort(next.rule.amount), 2: whenLabel(next.date, now) }) : '',
    ...quickProps(quickCategories(expenses, now)),
  };
}

// Flat props (q1Id, q1Symbol, q1Name…): the widget gets plain values, not a list
function quickProps(list) {
  const out = {};
  for (let i = 0; i < QUICK_COUNT; i += 1) {
    const c = list[i];
    out[`q${i + 1}Id`] = c ? c.id : '';
    out[`q${i + 1}Symbol`] = c ? sfSymbolFor(c.icon) : '';
    out[`q${i + 1}Name`] = c ? c.name : '';
    out[`q${i + 1}Emoji`] = c ? emojiFor(c.icon) : '';
  }
  return out;
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

const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0);
const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const payeeOf = (rule) => rule.merchant || rule.note || categoryById(rule.categoryId)?.name || '';
const GOOD = '#3FD9A2';
const BAD = '#FF7A7E';
const WARN = '#FFC15E';
const INFO = '#8FB8FF';
// The last days of the month get the countdown
export const MONTH_END_DAYS = 3;
// Payments due tomorrow show up from this hour the evening before
const TOMORROW_FROM_HOUR = 18;

/**
 * What the Live Activity should show right now, or null when nothing is happening.
 * It appears only for something with a start and an end, most important first:
 * 1. a no-spend day (started by the user), 2. today's spending eating into the savings,
 * 3. today's spending over the daily limit, 4. a recurring payment due today (or tomorrow, in the evening),
 * 5. the last days of the month.
 * Returns { key, props, staleDate }: the key names the event, so the same event is updated, not restarted.
 */
export function activityEvent({ expenses = [], incomes = {}, incomeEntries = [], recurring = [], pet, session }, now = new Date()) {
  if (!pet) return null;
  const st = petStatus({ expenses, incomes, incomeEntries, pet, now });
  const ov = st.overview;
  const pending = pendingSpend(recurring, now);
  const free = freeToSpend(ov, pending);
  const base = {
    petName: pet.name,
    lookKey: lookKey(st.stage.key, outfitOf(pet)),
    expression: st.expression,
    emoji: WIDGET_EMOJI[st.expression],
    progress: -1,
    timerEnd: 0,
    actionUrl: '',
    actionLabel: '',
  };

  const state = sessionState(session, expenses, now);
  if (session?.kind === 'nospend' && state && !state.finished) {
    return {
      key: `session-${session.id}`,
      staleDate: new Date(session.endsAt),
      props: {
        ...base,
        kind: 'nospend',
        symbol: 'leaf.fill',
        title: t('Ден без разходи'),
        value: 0,
        valueText: '',
        valueLabel: t('до полунощ'),
        color: GOOD,
        progress: state.ratio,
        timerEnd: new Date(session.endsAt).getTime(),
        detail: new Date(session.startedAt).getHours() < NOSPEND_XP_BEFORE ? t('Издържи до полунощ за +{0} XP', { 0: SESSION_XP.nospend }) : t('Издържи до полунощ'),
        actionUrl: 'pawket://session?action=end',
        actionLabel: t('Спри'),
      },
    };
  }

  // Spending today that came out of the savings (the 20% the daily limit keeps), or went over today's limit.
  // Both are about today: they end at midnight, and a new day starts clean.
  const daily = dailyLimit(ov, now, pending);
  if (daily && daily.eatenToday > 0) {
    const saved = Math.max(0, daily.reserve - daily.eatenSavings);
    return {
      key: `savings-${dayKey(now)}`,
      staleDate: endOfDay(now),
      props: {
        ...base,
        kind: 'savings',
        symbol: 'exclamationmark.shield.fill',
        title: t('Ядеш от спестяванията'),
        value: Math.round(daily.eatenSavings),
        valueText: `−${moneyShort(daily.eatenSavings)}`,
        valueLabel: t('от {0} за спестяване', { 0: moneyShort(daily.reserve) }),
        color: BAD,
        progress: daily.reserve ? clamp01(daily.eatenSavings / daily.reserve) : 1,
        detail: daily.overIncome > 0
          ? t('{0} над дохода', { 0: moneyShort(daily.overIncome) })
          : t('Остават {0} · днес {1} от тях', { 0: moneyShort(saved), 1: moneyShort(daily.eatenToday) }),
      },
    };
  }
  if (daily && daily.over) {
    return {
      key: `overLimit-${dayKey(now)}`,
      staleDate: endOfDay(now),
      props: {
        ...base,
        kind: 'overLimit',
        symbol: 'arrow.down.right.circle.fill',
        title: t('Над лимита днес'),
        value: Math.round(-daily.left),
        valueText: `+${moneyShort(-daily.left)}`,
        valueLabel: t('над {0}', { 0: moneyShort(daily.limit) }),
        color: WARN,
        progress: 1,
        detail: daily.tomorrowLimit != null
          ? t('Утре лимитът пада на {0}', { 0: moneyShort(daily.tomorrowLimit) })
          : t('Последен ден от месеца'),
      },
    };
  }

  // Recurring payments: booked today, still due today, or (in the evening) due tomorrow
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12);
  const upcoming = upcomingPayments(recurring, now);
  const booked = expenses.filter((e) => e.source === 'recurring' && isSameDay(e.date, now));
  const dueToday = [
    ...booked.map((e) => ({ name: e.merchant || e.note || categoryById(e.categoryId)?.name || '', amount: e.amount })),
    ...upcoming.filter((p) => isSameDay(p.date, now)).map((p) => ({ name: payeeOf(p.rule), amount: p.rule.amount })),
  ];
  const dueTomorrow = now.getHours() >= TOMORROW_FROM_HOUR ? upcoming.filter((p) => isSameDay(p.date, tomorrow)).map((p) => ({ name: payeeOf(p.rule), amount: p.rule.amount })) : [];
  const due = dueToday.length ? dueToday : dueTomorrow;
  if (due.length) {
    const total = due.reduce((a, p) => a + p.amount, 0);
    const names = due.length > 1 ? t('{0} и още {1}', { 0: due[0].name, 1: due.length - 1 }) : due[0].name;
    return {
      key: `payment-${dayKey(now)}-${dueToday.length ? 'today' : 'tomorrow'}`,
      staleDate: endOfDay(now),
      props: {
        ...base,
        kind: 'payment',
        symbol: 'calendar.badge.clock',
        title: dueToday.length ? t('Плащане днес') : t('Плащане утре'),
        value: Math.round(total * 100),
        // The exact amount: a bill is 12,99 €, not "13 €"
        valueText: money(total),
        valueLabel: '',
        color: INFO,
        // `free` already has every payment still due this month taken out, this one included
        detail: free
          ? `${names} · ${free.free < 0 ? t('{0} над бюджета с него', { 0: moneyShort(-free.free) }) : t('свободни след него: {0}', { 0: moneyShort(free.free) })}`
          : names,
      },
    };
  }

  // The last days of the month: what's left and how much a day
  if (free && ov.progress.isCurrent && ov.progress.daysLeft <= MONTH_END_DAYS) {
    const over = free.free < 0;
    const days = ov.progress.daysLeft;
    return {
      key: `monthEnd-${dayKey(now)}`,
      staleDate: endOfDay(now),
      props: {
        ...base,
        kind: 'monthEnd',
        symbol: 'hourglass',
        title: days === 1 ? t('Последен ден от месеца') : t('Последни {0} дни от месеца', { 0: days }),
        value: Math.round(Math.abs(free.free)),
        valueText: `${over ? '−' : ''}${moneyShort(Math.abs(free.free))}`,
        valueLabel: over ? t('над бюджета') : t('свободни'),
        color: over ? BAD : GOOD,
        progress: clamp01(1 - free.ratio),
        detail: daily ? (daily.left < 0 ? t('Днес {0} над лимита', { 0: moneyShort(-daily.left) }) : t('Днес остават {0}', { 0: moneyShort(daily.left) })) : '',
      },
    };
  }
  return null;
}
