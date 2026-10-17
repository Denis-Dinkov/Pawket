// The dog's advice: rules over the expenses, no internet. No RN imports.
import { getCategories, categoryById, money, pct, MONTHS } from '../theme';
import { monthOverview, filterMonth, summarize, shiftMonth } from '../budget';

// A concrete idea for each category
const HINTS = {
  rent: 'Наемът трудно се променя, но ако е над 35% от дохода, помисли за по-евтин вариант или съквартирант.',
  groceries: 'Планирай менюто за седмицата и пазарувай със списък — така се купуват по-малко излишни неща.',
  bills: 'Провери тарифите за ток, телефон и интернет — често има по-евтин план.',
  transport: 'Градски транспорт, колело или споделено пътуване няколко пъти седмично пести осезаемо.',
  health: 'Питай за генерични лекарства — действат по същия начин, но са по-евтини.',
  dining: 'Готви вкъщи 2–3 пъти повече седмично и носи обяд за работа.',
  shopping: 'Изчакай 48 часа преди импулсивна покупка — често желанието минава само.',
  fun: 'Потърси безплатни събития, паркове и музеи с безплатен вход.',
  travel: 'Резервирай по-рано и пътувай извън сезона — цените падат значително.',
  subscriptions: 'Прегледай абонаментите и спри тези, които не са ползвани последния месец.',
  saving: '',
  invest: '',
};

const normalizeMerchant = (m) => (m || '').trim().toLowerCase();

// Categories spent evenly through the month that can be forecast
const VARIABLE = new Set(['groceries', 'transport', 'dining', 'fun']);

/**
 * Returns a list of advice, ordered by importance:
 * { id, tone: 'warn' | 'tip' | 'praise', icon, title, text, saving? }
 */
export function getAdvice({ expenses, incomes, incomeEntries, year, month, now = new Date(), lastFedAt }) {
  const ov = monthOverview({ expenses, incomes, incomeEntries, year, month, now });
  const CATEGORIES = getCategories(true);
  const { income: I, byBucket, byCategory, total, progress, list } = ov;
  const { dayFrac, daysLeft, isCurrent } = progress;
  const tips = [];
  const add = (priority, tip) => tips.push({ priority, ...tip });

  const prevYM = shiftMonth(year, month, -1);
  const prev = summarize(filterMonth(expenses, prevYM.year, prevYM.month));
  const prevName = MONTHS[prevYM.month].toLowerCase();

  // Habit: days without entries
  if (isCurrent && lastFedAt) {
    const days = Math.floor((now - new Date(lastFedAt)) / 86400000);
    if (days >= 2) {
      add(90, {
        id: 'habit', tone: 'warn', icon: 'restaurant',
        title: `Няма записи от ${days} дни 🦴`,
        text: 'Записвай разходите веднага след плащане — така нищо не се губи. Ако наистина не е имало разходи, натисни „Днес без разходи“ и ме нахрани.',
      });
    }
  }

  if (!I) {
    add(100, {
      id: 'no-income', tone: 'tip', icon: 'cash-outline',
      title: 'Кажи ми колко е месечният ти доход 💤',
      text: 'Без доход не мога да сметна 50/30/20. Задай го от настройките (⚙︎) и се събуждам.',
    });
    return finish(tips);
  }

  const wantsCap = 0.3 * I;
  const needsCap = 0.5 * I;
  const topIn = (bucket) =>
    CATEGORIES.filter((c) => c.bucket === bucket && byCategory[c.id])
      .map((c) => ({ ...c, value: byCategory[c.id] }))
      .sort((a, b) => b.value - a.value)[0];

  // Over income
  if (total > I) {
    add(100, {
      id: 'over-income', tone: 'warn', icon: 'alert-circle',
      title: 'Харчиш повече, отколкото печелиш 😢',
      text: `Разходите са ${money(total)} при доход ${money(I)} — с ${money(total - I)} отгоре. ${
        isCurrent ? 'До края на месеца купувай само най-необходимото.' : 'Следващия месец започни с план за всяка кофа.'
      }`,
    });
  }

  // Pace of wants
  const wantsAllowed = wantsCap * Math.max(dayFrac, 0.15);
  if (byBucket.wants > wantsAllowed * 1.15 || byBucket.wants > wantsCap) {
    const top = topIn('wants');
    const left = wantsCap - byBucket.wants;
    const pace = isCurrent
      ? `Желанията вече са ${pct(byBucket.wants / wantsCap)} от бюджета им (${money(wantsCap)}), а месецът е изминал ${pct(dayFrac)}. `
      : `Желанията бяха ${money(byBucket.wants)} при бюджет ${money(wantsCap)}. `;
    const rest = !isCurrent
      ? ''
      : left > 0
        ? `Остават ${money(left)} — около ${money(left / Math.max(1, daysLeft))} на ден за желания. `
        : 'Бюджетът за желания е изчерпан — опитай до края на месеца без тях. ';
    add(80, {
      id: 'wants-pace', tone: 'warn', icon: 'sparkles',
      title: isCurrent ? 'Желанията изпреварват месеца 😟' : 'Желанията надхвърлиха 30%',
      text: pace + rest + (top ? `Най-много отива за ${top.name.toLowerCase()} (${money(top.value)}). ${HINTS[top.id] || ''}` : ''),
      saving: Math.max(0, byBucket.wants - (isCurrent ? wantsAllowed : wantsCap)),
    });
  }

  // Needs over 50%
  if (byBucket.needs > needsCap) {
    const top = topIn('needs');
    add(70, {
      id: 'needs-over', tone: 'warn', icon: 'home',
      title: 'Нуждите надхвърлят 50% 🏠',
      text: `Нуждите са ${pct(byBucket.needs / I)} от дохода при цел 50% — трябва да паднат с ${money(byBucket.needs - needsCap)}. ${
        top ? `Най-голямата е ${top.name.toLowerCase()} (${money(top.value)}). ${HINTS[top.id] || ''}` : ''
      }`,
      saving: byBucket.needs - needsCap,
    });
  }

  // Savings
  const room = I - byBucket.needs - byBucket.wants;
  if (total <= I && room < 0.2 * I) {
    add(60, {
      id: 'savings-short', tone: 'warn', icon: 'wallet',
      title: 'Спестяванията падат под 20% 🐷',
      text: `${isCurrent ? 'Дори без нови разходи' : 'Този месец'} ще останат най-много ${money(Math.max(0, room))} (${pct(Math.max(0, room) / I)}) вместо ${money(0.2 * I)}. Следващия месец задели спестяванията още в деня на заплатата — каквото остане, лесно се харчи.`,
    });
  } else if (isCurrent && dayFrac > 0.5 && byBucket.savings === 0) {
    add(30, {
      id: 'savings-now', tone: 'tip', icon: 'wallet',
      title: 'Задели спестяванията сега 💰',
      text: `Още няма нищо отделено за спестявания. Прехвърли ${money(0.2 * I)} в спестовна сметка и го запиши в категория „Спестявания“.`,
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
        title: `${c.name}: +${pct(diff / before)} спрямо ${prevName} 📈`,
        text: `${
          already
            ? `${isCurrent ? 'Вече са' : 'Бяха'} ${money(value)} при ${money(before)} през ${prevName}.`
            : `С това темпо ще стигнат около ${money(value)} при ${money(before)} през ${prevName}.`
        } Върни се на миналото ниво и спестяваш ${money(diff)}. ${HINTS[c.id] || ''}`,
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
          title: `Браво! ${c.name}: −${pct(1 - projected / before)} 🎉`,
          text: `Спрямо ${prevName} за ${c.name.toLowerCase()} отиват с ${money(before - projected)} по-малко. Така те искам!`,
        });
      });
  }

  // Frequent small purchases at one merchant
  const byMerchant = {};
  for (const e of list) {
    const key = normalizeMerchant(e.merchant);
    if (!key || categoryById(e.categoryId)?.bucket === 'savings') continue;
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
      title: `${frequent.count} покупки в ${frequent.name} 🧾`,
      text: `Общо ${money(frequent.sum)} този месец, средно по ${money(frequent.sum / frequent.count)}. Дребните суми се трупат — наполовина по-малко посещения пестят около ${money(frequent.sum / 2)}.`,
      saving: frequent.sum / 2,
    });
  }

  // Subscriptions
  const subs = byCategory.subscriptions || 0;
  if (subs > 0) {
    add(subs > 0.03 * I ? 45 : 25, {
      id: 'subscriptions', tone: 'tip', icon: 'repeat',
      title: `Абонаментите: ${money(subs)} на месец`,
      text: `Това прави около ${money(subs * 12)} на година. ${HINTS.subscriptions}`,
    });
  }

  // Daily limit
  const spendable = 0.8 * I - byBucket.needs - byBucket.wants;
  if (isCurrent && daysLeft > 0 && spendable > 0) {
    add(20, {
      id: 'daily-limit', tone: 'tip', icon: 'calendar-outline',
      title: `Дневният ти лимит е ${money(spendable / daysLeft)}`,
      text: `За да спазиш 50/30/20, до края на месеца (${daysLeft} дни) можеш да харчиш средно до ${money(spendable / daysLeft)} на ден, без спестяванията.`,
    });
  }

  // Praise for following the rule — only if there isn't a single warning
  if (ov.score >= 85 && (dayFrac >= 0.25 || !isCurrent) && !tips.some((t) => t.tone === 'warn')) {
    add(15, {
      id: 'rule-ok', tone: 'praise', icon: 'trophy',
      title: 'Спазваш 50/30/20 отлично 🤩',
      text: `Нужди ${pct(byBucket.needs / I)}, желания ${pct(byBucket.wants / I)}, спестявания до ${pct(Math.max(0, room) / I)}. Продължавай така и ще порасна!`,
    });
  }

  return finish(tips);
}

function finish(tips) {
  return tips.sort((a, b) => b.priority - a.priority).map(({ priority, ...t }) => t);
}

export const TONE_COLORS = { warn: '#E5484D', tip: '#B8622A', praise: '#1FBF87' };
