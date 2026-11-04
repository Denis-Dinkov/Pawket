// Weekly missions, the daily streak and Charlie's rewards. Pure logic, no RN imports.
import { categoryById } from '../theme';
import { dayKey } from './logic';

export const MISSION_XP = 25;

// Monday 00:00 of the week that contains `now`
export function weekStart(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
export const weekKey = (now = new Date()) => dayKey(weekStart(now));

// Days the user did something: logged an expense or income, or tapped "No spending today".
// Automatic recurring expenses don't count.
export function activityDays({ expenses = [], incomeEntries = [], pet }) {
  const days = new Set(pet?.activeDays || []);
  if (pet?.lastActiveDay) days.add(pet.lastActiveDay);
  expenses.forEach((e) => e.source !== 'recurring' && days.add(dayKey(e.date)));
  incomeEntries.forEach((e) => days.add(dayKey(e.date)));
  return days;
}

// Consecutive active days up to today. Today not logged yet doesn't break it: the streak stays alive until midnight.
export function streak(days, now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) {
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

// The days of this week up to today
function weekDays(now) {
  const start = weekStart(now);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (d > now) break;
    out.push(d);
  }
  return out;
}

const POOL = [
  {
    id: 'log5',
    icon: 'create-outline',
    title: 'Записвай 5 дни тази седмица',
    check: ({ week, days }) => count(week.filter((d) => days.has(dayKey(d))).length, 5),
  },
  {
    id: 'noDining2',
    icon: 'restaurant-outline',
    title: '2 дни без заведения',
    check: ({ week, days, expenses }) =>
      count(
        week.filter((d) => days.has(dayKey(d)) && !expenses.some((e) => e.categoryId === 'dining' && dayKey(e.date) === dayKey(d))).length,
        2
      ),
  },
  {
    id: 'goal',
    icon: 'flag-outline',
    title: 'Сложи пари в цел',
    check: ({ expenses, start }) => count(expenses.some((e) => e.goalId && new Date(e.date) >= start) ? 1 : 0, 1),
  },
  {
    id: 'wants3',
    icon: 'sparkles-outline',
    title: '3 дни с желания под дневния лимит',
    check: ({ week, days, expenses, wantsPerDay }) =>
      count(
        wantsPerDay > 0
          ? week.filter((d) => {
              if (!days.has(dayKey(d))) return false;
              const wants = expenses
                .filter((e) => dayKey(e.date) === dayKey(d) && categoryById(e.categoryId)?.bucket === 'wants')
                .reduce((a, e) => a + e.amount, 0);
              return wants <= wantsPerDay;
            }).length
          : 0,
        3
      ),
  },
  {
    id: 'streak7',
    icon: 'flame-outline',
    title: 'Стигни серия от 7 дни',
    check: ({ currentStreak }) => count(Math.min(currentStreak, 7), 7),
  },
];

const count = (n, of) => ({ n, of, done: n >= of });

/**
 * This week's three missions with their progress.
 * income: the current month's income (for the wants limit).
 */
export function weekMissions({ expenses = [], incomeEntries = [], pet, income = 0, now = new Date() }) {
  const start = weekStart(now);
  const index = Math.floor(start.getTime() / (7 * 86400000));
  const picked = [0, 1, 2].map((i) => POOL[(index + i * 2) % POOL.length]);
  const days = activityDays({ expenses, incomeEntries, pet });
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const ctx = {
    start,
    week: weekDays(now),
    days,
    expenses,
    wantsPerDay: (0.3 * income) / daysInMonth,
    currentStreak: streak(days, now),
  };
  const claimed = pet?.missionsDone?.[dayKey(start)] || [];
  return picked.map((m) => ({ id: m.id, icon: m.icon, title: m.title, ...m.check(ctx), claimed: claimed.includes(m.id) }));
}

export const missionsTotal = (pet) => Object.values(pet?.missionsDone || {}).reduce((a, list) => a + list.length, 0);

// Accessories: unlocked by habits, never bought with money
export const REWARDS = [
  { id: 'collar', name: 'Червен нашийник', icon: 'medal-outline', need: 'Серия от 3 дни', test: (p) => p.bestStreak >= 3 },
  { id: 'bandana', name: 'Синьо шалче', icon: 'triangle-outline', need: 'Серия от 7 дни', test: (p) => p.bestStreak >= 7 },
  { id: 'bow', name: 'Папийонка', icon: 'ribbon-outline', need: '3 изпълнени мисии', test: (p) => p.missions >= 3 },
  { id: 'hat', name: 'Парти шапка', icon: 'balloon-outline', need: 'Етап „Младо куче“', test: (p) => p.xp >= 250 },
  { id: 'glasses', name: 'Слънчеви очила', icon: 'glasses-outline', need: 'Постигната цел', test: (p) => p.goalsDone >= 1 },
];

export function rewardsState({ pet, goalsDone = 0 }) {
  const progress = { bestStreak: pet?.bestStreak || 0, missions: missionsTotal(pet), xp: pet?.xp || 0, goalsDone };
  return REWARDS.map((r) => ({ ...r, unlocked: r.test(progress) }));
}
