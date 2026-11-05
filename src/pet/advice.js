// The dog's advice: rules over the expenses, no internet. No RN imports.
import { colors, getCategories, categoryById, money, pct, MONTHS, monthLower } from '../theme';
import { monthOverview, filterMonth, summarize, shiftMonth, dailyLimit, countsInBudget } from '../budget';
import { pendingSpend, VARIABLE_CATEGORIES } from '../plans';
import { t } from '../i18n';

// A concrete idea for each category
const HINTS = {
  get rent() { return t('Наемът трудно се променя, но ако е над 35% от дохода, помисли за по-евтин вариант или съквартирант.'); },
  get groceries() { return t('Планирай менюто за седмицата и пазарувай със списък — така се купуват по-малко излишни неща.'); },
  get bills() { return t('Провери тарифите за ток, телефон и интернет — често има по-евтин план.'); },
  get transport() { return t('Градски транспорт, колело или споделено пътуване няколко пъти седмично пести осезаемо.'); },
  get health() { return t('Питай за генерични лекарства — действат по същия начин, но са по-евтини.'); },
  get dining() { return t('Готви вкъщи 2–3 пъти повече седмично и носи обяд за работа.'); },
  get shopping() { return t('Изчакай 48 часа преди импулсивна покупка — често желанието минава само.'); },
  get fun() { return t('Потърси безплатни събития, паркове и музеи с безплатен вход.'); },
  get travel() { return t('Резервирай по-рано и пътувай извън сезона — цените падат значително.'); },
  get subscriptions() { return t('Прегледай абонаментите и спри тези, които не са ползвани последния месец.'); },
  saving: '',
  invest: '',
};

const normalizeMerchant = (m) => (m || '').trim().toLowerCase();

// Categories spent evenly through the month that can be forecast
const VARIABLE = VARIABLE_CATEGORIES;

/**
 * Returns a list of advice, ordered by importance:
 * { id, tone: 'warn' | 'tip' | 'praise', icon, title, text, saving? }
 */
export function getAdvice({ expenses, incomes, incomeEntries, recurring = [], year, month, now = new Date(), lastFedAt }) {
  const ov = monthOverview({ expenses, incomes, incomeEntries, year, month, now });
  const CATEGORIES = getCategories(true);
  const { income: I, byBucket, byCategory, total, progress, list } = ov;
  const { dayFrac, daysLeft, isCurrent } = progress;
  const tips = [];
  const add = (priority, tip) => tips.push({ priority, ...tip });

  const prevYM = shiftMonth(year, month, -1);
  const prev = summarize(filterMonth(expenses, prevYM.year, prevYM.month));
  const prevName = monthLower(prevYM.month);

  // Habit: days without entries
  if (isCurrent && lastFedAt) {
    const days = Math.floor((now - new Date(lastFedAt)) / 86400000);
    if (days >= 2) {
      add(90, {
        id: 'habit', tone: 'warn', icon: 'restaurant',
        title: t('Няма записи от {0} дни 🦴', { 0: days }),
        text: t('Записвай разходите веднага след плащане — така нищо не се губи. Ако наистина не е имало разходи, натисни „Без разходи днес“ и ме нахрани.'),
      });
    }
  }

  if (!I) {
    add(100, {
      id: 'no-income', tone: 'tip', icon: 'cash-outline',
      title: t('Кажи ми колко е месечният ти доход 💤'),
      text: t('Без доход не мога да сметна 50/30/20. Задай го от настройките (⚙︎) и се събуждам.'),
    });
    return finish(tips);
  }

  const wantsCap = 0.3 * I;
  const needsCap = 0.5 * I;
  const topIn = (bucket) =>
    CATEGORIES.filter((c) => c.bucket === bucket && byCategory[c.id])
      .map((c) => ({ ...c, value: byCategory[c.id] }))
      .sort((a, b) => b.value - a.value)[0];

  // Over income: spending only — money put into savings goals isn't overspending
  const spent = byBucket.needs + byBucket.wants;
  if (spent > I) {
    add(100, {
      id: 'over-income', tone: 'warn', icon: 'alert-circle',
      title: t('Харчиш повече, отколкото печелиш 😢'),
      text: t('Разходите са {0} при доход {1} — с {2} отгоре. {3}', { 0: money(spent), 1: money(I), 2: money(spent - I), 3: isCurrent ? t('До края на месеца купувай само най-необходимото.') : t('Следващия месец започни с план за всяка част от 50/30/20.') }),
    });
  }

  // Pace of wants
  const wantsAllowed = wantsCap * Math.max(dayFrac, 0.15);
  if (byBucket.wants > wantsAllowed * 1.15 || byBucket.wants > wantsCap) {
    const top = topIn('wants');
    const left = wantsCap - byBucket.wants;
    const pace = isCurrent
      ? t('Желанията вече са {0} от бюджета им ({1}), а месецът е изминал {2}. ', { 0: pct(byBucket.wants / wantsCap), 1: money(wantsCap), 2: pct(dayFrac) })
      : t('Желанията бяха {0} при бюджет {1}. ', { 0: money(byBucket.wants), 1: money(wantsCap) });
    const rest = !isCurrent
      ? ''
      : left > 0
        ? t('Остават {0} — около {1} на ден за желания. ', { 0: money(left), 1: money(left / Math.max(1, daysLeft)) })
        : t('Бюджетът за желания е изчерпан — опитай до края на месеца без тях. ');
    add(80, {
      id: 'wants-pace', tone: 'warn', icon: 'sparkles',
      title: isCurrent ? t('Желанията изпреварват месеца 😟') : t('Желанията надхвърлиха 30%'),
      text: pace + rest + (top ? t('Най-много отива за {0} ({1}). {2}', { 0: top.name.toLowerCase(), 1: money(top.value), 2: HINTS[top.id] || '' }) : ''),
      saving: Math.max(0, byBucket.wants - (isCurrent ? wantsAllowed : wantsCap)),
    });
  }

  // Needs over 50%
  if (byBucket.needs > needsCap) {
    const top = topIn('needs');
    add(70, {
      id: 'needs-over', tone: 'warn', icon: 'home',
      title: t('Нуждите надхвърлят 50% 🏠'),
      text: t('Нуждите са {0} от дохода при цел 50% — трябва да паднат с {1}. {2}', { 0: pct(byBucket.needs / I), 1: money(byBucket.needs - needsCap), 2: top ? t('Най-голямата е {0} ({1}). {2}', { 0: top.name.toLowerCase(), 1: money(top.value), 2: HINTS[top.id] || '' }) : '' }),
      saving: byBucket.needs - needsCap,
    });
  }

  // Savings
  const room = I - byBucket.needs - byBucket.wants;
  if (total <= I && room < 0.2 * I) {
    add(60, {
      id: 'savings-short', tone: 'warn', icon: 'wallet',
      title: t('Спестяванията падат под 20% 🐷'),
      text: t('{0} ще останат най-много {1} ({2}) вместо {3}. Следващия месец задели спестяванията още в деня на заплатата — каквото остане, лесно се харчи.', { 0: isCurrent ? t('Дори без нови разходи') : t('Този месец'), 1: money(Math.max(0, room)), 2: pct(Math.max(0, room) / I), 3: money(0.2 * I) }),
    });
  } else if (isCurrent && dayFrac > 0.5 && byBucket.savings === 0) {
    add(30, {
      id: 'savings-now', tone: 'tip', icon: 'wallet',
      title: t('Задели спестяванията сега 💰'),
      text: t('Още няма нищо отделено за спестявания. Прехвърли {0} в спестовна сметка и го запиши в категория „Спестявания“.', { 0: money(0.2 * I) }),
    });
  }

  // Growth and decline compared to last month.
  // Only everyday categories are forecast to the end of the month — rent, bills etc. are paid at once.
  const changes = CATEGORIES.filter((c) => c.bucket !== 'savings')
    .map((c) => {
      const cur = byCategory[c.id] || 0;
      const before = prev.byCategory[c.id] || 0;
      const canProject = isCurrent && VARIABLE.has(c.id) && dayFrac >= 0.33;
      return { c, cur, before, projected: canProject ? cur / dayFrac : cur, final: !isCurrent || canProject };
    })
    .filter((x) => x.before > 0);

  changes
    // What's already spent above last month, otherwise the forecast (everyday categories only)
    .map((x) => ({ ...x, already: x.cur > x.before, value: x.cur > x.before ? x.cur : x.projected }))
    .filter((x) => x.value > x.before * 1.25 && x.value - x.before > 20)
    .sort((a, b) => b.value - b.before - (a.value - a.before))
    .slice(0, 2)
    .forEach(({ c, before, value, already }) => {
      const diff = value - before;
      add(50, {
        id: `growth-${c.id}`, tone: 'tip', icon: 'trending-up',
        title: t('{0}: +{1} спрямо {2} 📈', { 0: c.name, 1: pct(diff / before), 2: prevName }),
        text: t('{0} Върни се на миналото ниво и спестяваш {1}. {2}', { 0: already
            ? t('{0} {1} при {2} през {3}.', { 0: isCurrent ? t('Вече са') : t('Бяха'), 1: money(value), 2: money(before), 3: prevName })
            : t('С това темпо ще стигнат около {0} при {1} през {2}.', { 0: money(value), 1: money(before), 2: prevName }), 1: money(diff), 2: HINTS[c.id] || '' }),
        saving: diff,
      });
    });

  if (!isCurrent || dayFrac >= 0.5) {
    changes
      .filter((x) => x.final && x.before >= 30 && x.projected < x.before * 0.8)
      .sort((a, b) => a.projected / a.before - b.projected / b.before)
      .slice(0, 1)
      .forEach(({ c, projected, before }) => {
        add(10, {
          id: `praise-${c.id}`, tone: 'praise', icon: 'heart',
          title: t('Браво! {0}: −{1} 🎉', { 0: c.name, 1: pct(1 - projected / before) }),
          text: t('Спрямо {0} за {1} отиват с {2} по-малко. Така те искам!', { 0: prevName, 1: c.name.toLowerCase(), 2: money(before - projected) }),
        });
      });
  }

  // Frequent small purchases at one merchant
  const byMerchant = {};
  for (const e of list) {
    const key = normalizeMerchant(e.merchant);
    if (!key || !countsInBudget(e) || categoryById(e.categoryId)?.bucket === 'savings') continue;
    (byMerchant[key] ||= { name: e.merchant.trim(), count: 0, sum: 0 });
    byMerchant[key].count += 1;
    byMerchant[key].sum += e.amount;
  }
  const frequent = Object.values(byMerchant)
    .filter((m) => m.count >= 6 && m.sum / m.count <= 20)
    .sort((a, b) => b.sum - a.sum)[0];
  if (frequent) {
    add(40, {
      id: 'frequent-merchant', tone: 'tip', icon: 'storefront-outline',
      title: t('{0} покупки в {1} 🧾', { 0: frequent.count, 1: frequent.name }),
      text: t('Общо {0} този месец, средно по {1}. Дребните суми се трупат — наполовина по-малко посещения пестят около {2}.', { 0: money(frequent.sum), 1: money(frequent.sum / frequent.count), 2: money(frequent.sum / 2) }),
      saving: frequent.sum / 2,
    });
  }

  // Subscriptions
  const subs = byCategory.subscriptions || 0;
  if (subs > 0) {
    add(subs > 0.03 * I ? 45 : 25, {
      id: 'subscriptions', tone: 'tip', icon: 'repeat',
      title: t('Абонаментите: {0} на месец', { 0: money(subs) }),
      text: t('Това прави около {0} на година. {1}', { 0: money(subs * 12), 1: HINTS.subscriptions }),
    });
  }

  // Daily limit — the same number as on Home, the recurring payments still due already taken out
  const pending = pendingSpend(recurring, now);
  const daily = dailyLimit(ov, now, pending);
  if (daily && daily.limit > 0) {
    add(20, {
      id: 'daily-limit', tone: 'tip', icon: 'calendar-outline',
      title: t('Дневният ти лимит е {0}', { 0: money(daily.limit) }),
      text: t('За да спазиш 50/30/20, до края на месеца ({0} дни) можеш да харчиш средно до {1} на ден, без спестяванията{2}.', { 0: daysLeft, 1: money(daily.limit), 2: pending > 0 ? t(' и след предстоящите плащания ({0})', { 0: money(pending) }) : '' }),
    });
  }

  // Praise for following the rule — only if there isn't a single warning
  if (ov.score >= 85 && (dayFrac >= 0.25 || !isCurrent) && !tips.some((item) => item.tone === 'warn')) {
    add(15, {
      id: 'rule-ok', tone: 'praise', icon: 'trophy',
      title: t('Спазваш 50/30/20 отлично 🤩'),
      text: t('Нужди {0}, желания {1}, спестявания до {2}. Продължавай така и ще порасна!', { 0: pct(byBucket.needs / I), 1: pct(byBucket.wants / I), 2: pct(Math.max(0, room) / I) }),
    });
  }

  return finish(tips);
}

function finish(tips) {
  return tips.sort((a, b) => b.priority - a.priority).map(({ priority, ...tip }) => tip);
}

export const TONE_COLORS = {
  get warn() { return colors.danger; },
  get tip() { return colors.primary; },
  get praise() { return colors.savings; },
};
