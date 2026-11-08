import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { monthKey, monthIncome } from './budget';
import { setCustomCategories, CUSTOM_SHADES, money, categoryById } from './theme';
import { evaluateClosedMonths, feedPet, stageFor } from './pet/logic';
import { dueRecurring, goalProgress, resumedLastKey, WISH_HOURS } from './plans';
import { weekMissions, weekKey, activityDays, streak, MISSION_XP } from './pet/missions';
import { outfitOf, toggleItem } from './pet/outfit';
import { animateNextLayout } from './motion';
import { scheduleWishReminder, cancelWishReminder } from './reminders';
import { t, setLang, resolveLang } from './i18n';
import { startNoSpend, sessionState, SESSION_XP, NOSPEND_XP_BEFORE } from './sessions';
import { takePendingPayments, writeCategorizer, matchManual } from './pendingPayments';
import { guessCategory, rememberedCategory, sameMerchant } from './categoryGuess';

export const KEY = 'spendlite:v2';
const KEY_V1 = 'spendlite:v1';
const Ctx = createContext(null);
// The toast lives apart from the data, so showing or hiding it doesn't re-render every screen
const ToastCtx = createContext(null);
// Saving waits for a quiet moment instead of serializing everything during the animations after a change
const SAVE_DELAY = 700;

const EMPTY = {
  expenses: [],
  incomes: {},
  incomeEntries: [],
  categories: [],
  merchants: {},
  pet: null,
  homeLayout: null,
  // Recurring payments: { id, amount, categoryId, merchant, note, day, lastKey, paused }
  recurring: [],
  // Savings goals: { id, name, icon, target, deadline?, createdAt, kind? }. The saved money is the expenses with goalId.
  // kind: undefined (a goal), 'fund' (a sinking fund for a yearly cost), 'emergency' (the emergency fund)
  goals: [],
  // The 48-hour wishlist: { id, name, amount, categoryId, createdAt, decision?: 'bought' | 'skipped', decidedAt? }
  wishes: [],
  // The running no-spend day (see sessions.js), or null
  session: null,
  // theme: 'system' | 'light' | 'dark'; reminder: the evening notification
  // liveActivity: Charlie in the Dynamic Island for a no-spend day, spending over the limit or from the savings,
  // payments due and the last days of the month
  // savingsAlert: a notification when the day's spending starts eating the savings
  settings: { theme: 'system', language: 'system', reminder: { enabled: false, hour: 20 }, liveActivity: true, savingsAlert: true },
  lastBackupAt: null,
};
// Older saves lack the newer keys; settings are merged one level deep
const withDefaults = (d) => ({ ...EMPTY, ...d, settings: { ...EMPTY.settings, ...(d?.settings || {}) } });
// The default name, stored in Bulgarian; a dog still called that is shown as "Charlie" in English
const DEFAULT_PET_NAME_BG = 'Чарли';
export const defaultPetName = () => t('Чарли');
// The default name from back when the pet was a cat
const OLD_DEFAULT_NAME = 'Мърка';
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const normalizeMerchant = (m) => (m || '').trim().toLowerCase();

// v1: { expenses, income } → v2. The old income becomes the income for the earliest month with expenses.
function migrateV1(v1) {
  const expenses = (v1.expenses || []).map((e) => ({ merchant: '', source: 'manual', note: '', ...e }));
  const incomes = {};
  if (v1.income > 0) {
    const first = expenses.reduce((min, e) => (!min || e.date < min ? e.date : min), null);
    const d = first ? new Date(first) : new Date();
    incomes[monthKey(d.getFullYear(), d.getMonth())] = v1.income;
  }
  return { ...EMPTY, expenses, incomes };
}

async function load() {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw) {
    const saved = JSON.parse(raw);
    // Saves from before English existed stay in Bulgarian; new installs follow the phone
    if (saved && !saved.settings?.language) saved.settings = { ...(saved.settings || {}), language: 'bg' };
    const data = withDefaults(saved);
    if (data.pet?.name === OLD_DEFAULT_NAME) data.pet = { ...data.pet, name: DEFAULT_PET_NAME_BG };
    // Only no-spend days are sessions now (an early build also had shopping trips)
    if (data.session && data.session.kind !== 'nospend') data.session = null;
    return data;
  }
  const old = await AsyncStorage.getItem(KEY_V1);
  return old ? migrateV1(JSON.parse(old)) : EMPTY;
}

export function StoreProvider({ children }) {
  const [data, setData] = useState(EMPTY);
  const [ready, setReady] = useState(false);
  // { reports?: [...], levelUp?: stage } — shown in PetEventModal
  const [pendingEvent, setPendingEvent] = useState(null);
  // Short message at the bottom of the screen, optionally with an action ("Undo"): { id, text, actionLabel?, onAction? }
  const [toast, setToast] = useState(null);
  const showToast = useCallback((next) => setToast({ id: Date.now(), ...next }), []);
  const stageRef = useRef(null);

  // Custom categories are needed by the pure modules too (theme.categoryById)
  setCustomCategories(data.categories);
  // The language is set here, before anything below (or any screen) produces text
  const lang = resolveLang(data.settings?.language);
  setLang(lang);

  useEffect(() => {
    load()
      .then(setData)
      .catch(() => setData(EMPTY))
      .finally(() => setReady(true));
  }, []);

  const saveTimer = useRef(null);
  const unsaved = useRef(null);
  const flush = useCallback(() => {
    clearTimeout(saveTimer.current);
    if (!unsaved.current) return;
    const d = unsaved.current;
    unsaved.current = null;
    AsyncStorage.setItem(KEY, JSON.stringify(d)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!ready) return;
    unsaved.current = data;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, SAVE_DELAY);
  }, [data, ready, flush]);
  // Leaving the app saves right away, so nothing waits in the timer when iOS suspends it
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st !== 'active' && flush());
    return () => sub.remove();
  }, [flush]);

  const dataRef = useRef(data);
  dataRef.current = data;

  // On launch and when returning to the app: books the recurring payments that are due and closes past months
  const closeMonths = useCallback(() => {
    const now = new Date();
    const due = dueRecurring(dataRef.current.recurring, now);
    const booked = due.expenses.map((e) => ({ id: newId(), ...e }));
    if (booked.length) {
      setData((d) => ({ ...d, recurring: due.rules, expenses: [...booked, ...d.expenses] }));
    }
    // The payments just booked belong to the months being closed, so they count in the score
    const { reports } = evaluateClosedMonths({
      ...dataRef.current,
      expenses: [...booked, ...dataRef.current.expenses],
      now,
    });
    if (!reports.length) return;
    // Only the scoring fields change, so the pet's newer state (fed, accessory) isn't overwritten.
    // Months already closed by an earlier pass are skipped, so the bonus is never given twice.
    setData((d) => {
      if (!d.pet) return d;
      const done = d.pet.evaluatedMonths || {};
      const fresh = reports.filter((r) => !(r.key in done));
      if (!fresh.length) return d;
      const evaluatedMonths = { ...done, ...Object.fromEntries(fresh.map((r) => [r.key, r.score])) };
      const xp = (d.pet.xp || 0) + fresh.reduce((a, r) => a + r.bonus, 0);
      return { ...d, pet: { ...d.pet, evaluatedMonths, xp } };
    });
    const shown = reports.filter((r) => r.score != null);
    if (shown.length) setPendingEvent((e) => ({ ...e, reports: shown }));
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    closeMonths();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && closeMonths());
    return () => sub.remove();
  }, [ready, closeMonths]);

  // Payments the "Запиши плащане" Shortcuts action recorded while Pawket was closed (even on a locked phone):
  // booked straight away, with the category remembered for the merchant (or guessed from its name), and marked `unreviewed`
  // so the list highlights them until the user has looked at them
  const importing = useRef(false);
  const importPayments = useCallback(async () => {
    if (importing.current) return;
    importing.current = true;
    try {
      const payments = await takePendingPayments();
      if (!payments.length) return;
      // A payment already entered by hand (same amount and shop within 24 hours) isn't booked again: that
      // expense is matched to it instead. Same amount but nothing to compare: booked, marked "Дубликат?"
      const known = new Set(dataRef.current.expenses.map((e) => e.paymentId).filter(Boolean));
      let pool = dataRef.current.expenses;
      const matched = {};
      const fresh = [];
      for (const p of payments) {
        if (known.has(p.id)) continue;
        const m = matchManual(p, pool, sameMerchant);
        if (m.skip) {
          matched[m.skip] = p.id;
          pool = pool.map((e) => (e.id === m.skip ? { ...e, matchedPayment: p.id } : e));
          continue;
        }
        fresh.push({ ...p, maybeDuplicate: p.maybeDuplicate || m.flag });
      }
      if (!fresh.length && !Object.keys(matched).length) return;
      setData((d) => {
        const expenses = d.expenses.map((e) => (matched[e.id] ? { ...e, matchedPayment: matched[e.id] } : e));
        if (!fresh.length) return { ...d, expenses };
        const booked = fresh
          .map((p) => {
            // The user's own choice for this merchant first, then a guess from its name
            const remembered = rememberedCategory(d.merchants, p.merchant);
            const cat = remembered && categoryById(remembered);
            return {
              id: newId(),
              amount: p.amount,
              categoryId: cat && !cat.archived ? remembered : guessCategory(p.merchant),
              merchant: p.merchant,
              note: '',
              source: 'applepay',
              date: p.date,
              loggedAt: p.date,
              paymentId: p.id,
              unreviewed: true,
              ...(p.maybeDuplicate && { possibleDuplicate: true }),
            };
          })
          .reverse();
        return { ...d, expenses: [...booked, ...expenses], pet: feedPet(d.pet) };
      });
      if (!fresh.length) return;
      showToast({
        text:
          fresh.length === 1
            ? t('Записах {0} от Apple Pay 🐾', { 0: money(fresh[0].amount) })
            : t('Записах {0} плащания от Apple Pay 🐾', { 0: fresh.length }),
        icon: 'logo-apple',
      });
    } catch {
      // nothing to import this time
    } finally {
      importing.current = false;
    }
  }, [showToast]);

  // The action needs the merchant memory (and the category names, which follow the language) while the app is closed
  const { merchants: mMerchants, categories: mCategories } = data;
  useEffect(() => {
    if (ready) writeCategorizer(mMerchants);
  }, [ready, mMerchants, mCategories, lang]);

  useEffect(() => {
    if (!ready) return undefined;
    importPayments();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && importPayments());
    return () => sub.remove();
  }, [ready, importPayments]);

  // Weekly missions: a finished mission gives XP once. The best streak is remembered for the rewards.
  // Runs only when the fields the missions read change, not on every settings or layout change
  const { expenses: mExpenses, incomeEntries: mIncomeEntries, incomes: mIncomes, pet: mPet } = data;
  useEffect(() => {
    if (!ready || !mPet) return;
    const now = new Date();
    const src = { expenses: mExpenses, incomeEntries: mIncomeEntries, incomes: mIncomes, pet: mPet };
    const income = monthIncome(src, now.getFullYear(), now.getMonth()).total;
    const fresh = weekMissions({ ...src, income, now }).filter((m) => m.done && !m.claimed);
    const current = streak(activityDays(src), now);
    const best = mPet.bestStreak || 0;
    if (!fresh.length && current <= best) return;
    setData((d) => {
      if (!d.pet) return d;
      const key = weekKey(now);
      const done = d.pet.missionsDone?.[key] || [];
      const add = fresh.map((m) => m.id).filter((id) => !done.includes(id));
      return {
        ...d,
        pet: {
          ...d.pet,
          bestStreak: Math.max(d.pet.bestStreak || 0, current),
          xp: (d.pet.xp || 0) + add.length * MISSION_XP,
          missionsDone: add.length ? { ...(d.pet.missionsDone || {}), [key]: [...done, ...add] } : d.pet.missionsDone,
        },
      };
    });
    if (fresh.length) showToast({ text: t('Мисия изпълнена: {0} · +{1} XP', { 0: fresh[0].title, 1: MISSION_XP * fresh.length }), icon: 'trophy', celebrate: true });
  }, [ready, mExpenses, mIncomeEntries, mIncomes, mPet, showToast]);

  // A no-spend day ends at midnight, when it's broken by an expense, or when the user stops it (manual).
  // A kept day started in the morning gives XP.
  const finishedId = useRef(null);
  const finishSession = useCallback(
    (manual = false) => {
      const session = dataRef.current.session;
      // Called from several places (timer, app coming back, data change): one end per session
      if (!session || finishedId.current === session.id) return;
      const now = new Date();
      const st = sessionState(session, dataRef.current.expenses, now);
      if (!manual && !st.finished) return;
      finishedId.current = session.id;
      let xp = 0;
      let toastNext;
      if (st.won) {
        // Only a day started in the morning earns XP; a late start is still allowed, just for the habit
        xp = new Date(session.startedAt).getHours() < NOSPEND_XP_BEFORE ? SESSION_XP.nospend : 0;
        toastNext = { text: xp ? t('Ден без разходи! +{0} XP 🦴', { 0: xp }) : t('Ден без разходи! 🦴'), icon: 'trophy', celebrate: true };
      } else if (st.spent > 0) {
        toastNext = { text: t('Денят без разходи приключи — нищо, утре пак 🐾'), icon: 'paw-outline' };
      } else {
        toastNext = { text: t('Денят без разходи е спрян'), icon: 'paw-outline' };
      }
      setData((d) => {
        if (d.session?.id !== session.id) return d;
        return { ...d, session: null, pet: xp && d.pet ? { ...d.pet, xp: (d.pet.xp || 0) + xp } : d.pet };
      });
      showToast(toastNext);
    },
    [showToast]
  );
  const { session: sSession, expenses: sExpenses } = data;
  useEffect(() => {
    if (!ready || !sSession) return undefined;
    finishSession();
    // While the app stays open, end it right on time; coming back to the app checks again
    const ms = new Date(sSession.endsAt) - Date.now();
    const timer = ms > 0 && ms < 2 ** 31 - 1 ? setTimeout(() => finishSession(), ms + 500) : null;
    const sub = AppState.addEventListener('change', (st) => st === 'active' && finishSession());
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [ready, sSession, sExpenses, finishSession]);

  // Celebration on reaching a new growth stage
  useEffect(() => {
    if (!data.pet) {
      stageRef.current = null;
      return;
    }
    const { index, stage } = stageFor(data.pet.xp);
    if (stageRef.current != null && index > stageRef.current) setPendingEvent((e) => ({ ...e, levelUp: stage }));
    stageRef.current = index;
  }, [data.pet]);

  const value = useMemo(
    () => ({
      ready,
      ...data,
      // The default name follows the language (Чарли / Charlie); a name the user chose stays as it is
      pet: data.pet && data.pet.name === DEFAULT_PET_NAME_BG ? { ...data.pet, name: defaultPetName() } : data.pet,
      pendingEvent,
      dismissEvent: () => setPendingEvent(null),
      showToast,

      createPet: ({ name, income }) => {
        const now = new Date();
        setData((d) => ({
          ...d,
          incomes: income > 0 ? { ...d.incomes, [monthKey(now.getFullYear(), now.getMonth())]: income } : d.incomes,
          pet: {
            name: name.trim() || defaultPetName(),
            createdAt: now.toISOString(),
            xp: 0,
            lastFedAt: now.toISOString(),
            lastActiveDay: null,
            evaluatedMonths: {},
          },
        }));
      },

      // repeat: true also creates a monthly rule; this expense is its first payment
      // No LayoutAnimation here: it is added from the page sheet, where the list isn't in view,
      // and a global layout animation would compete with the sheet closing
      addExpense: (e, { repeat = false } = {}) => {
        setData((d) => {
          const merchant = (e.merchant || '').trim();
          const expense = {
            id: newId(),
            note: '',
            source: 'manual',
            ...e,
            merchant,
            // When it was written down (the date can be in the past): the streak counts this day
            loggedAt: new Date().toISOString(),
          };
          let { recurring } = d;
          if (repeat) {
            const date = new Date(expense.date);
            const rule = {
              id: newId(),
              amount: expense.amount,
              categoryId: expense.categoryId,
              merchant,
              note: expense.note,
              day: date.getDate(),
              lastKey: monthKey(date.getFullYear(), date.getMonth()),
              paused: false,
            };
            expense.recurringId = rule.id;
            recurring = [...recurring, rule];
          }
          return {
            ...d,
            expenses: [expense, ...d.expenses],
            recurring,
            merchants: merchant && !e.goalId ? { ...d.merchants, [normalizeMerchant(merchant)]: e.categoryId } : d.merchants,
            // Money the user already had isn't new activity: Charlie isn't fed for it
            pet: expense.offBudget ? d.pet : feedPet(d.pet),
          };
        });
      },

      updateExpense: (id, patch) =>
        setData((d) => {
          const merchant = patch.merchant != null ? patch.merchant.trim() : undefined;
          // A category picked for an automatic payment also goes to the other ones from that shop still
          // waiting to be looked at: the user decided it once for this merchant
          const others = merchant && patch.categoryId
            ? new Set(d.expenses.filter((e) => e.id !== id && e.unreviewed && sameMerchant(merchant, e.merchant)).map((e) => e.id))
            : null;
          return {
            ...d,
            // Saving an edit (it always carries the category) counts as having checked an automatic payment
            expenses: d.expenses.map((e) =>
              e.id === id
                ? { ...e, ...patch, ...(merchant != null && { merchant }), ...(patch.categoryId && { unreviewed: undefined }) }
                : others?.has(e.id)
                  ? { ...e, categoryId: patch.categoryId, unreviewed: undefined }
                  : e
            ),
            merchants: merchant && patch.categoryId ? { ...d.merchants, [normalizeMerchant(merchant)]: patch.categoryId } : d.merchants,
          };
        }),

      // "Дубликат?" answered with "Запази": both expenses are real
      keepDuplicate: (id) =>
        setData((d) => ({ ...d, expenses: d.expenses.map((e) => (e.id === id ? { ...e, possibleDuplicate: undefined } : e)) })),

      // An automatic Apple Pay payment the user has looked at: no longer highlighted
      markReviewed: (id) =>
        setData((d) =>
          d.expenses.some((e) => e.id === id && e.unreviewed)
            ? { ...d, expenses: d.expenses.map((e) => (e.id === id ? { ...e, unreviewed: undefined } : e)) }
            : d
        ),

      // Deletes right away; the toast offers "Undo" for a few seconds
      removeExpense: (id) => {
        const index = dataRef.current.expenses.findIndex((e) => e.id === id);
        const item = dataRef.current.expenses[index];
        if (!item) return;
        animateNextLayout();
        setData((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) }));
        showToast({
          text: t('Разходът е изтрит'),
          icon: 'trash-outline',
          actionLabel: t('Отмени'),
          onAction: () => {
            animateNextLayout();
            setData((d) => {
              const expenses = [...d.expenses];
              expenses.splice(Math.min(index, expenses.length), 0, item);
              return { ...d, expenses };
            });
          },
        });
      },

      // Income: { amount, kind, note, date }. The entry also feeds the dog.
      addIncome: (e) =>
        setData((d) => ({
          ...d,
          incomeEntries: [{ id: newId(), note: '', kind: 'other', ...e, loggedAt: new Date().toISOString() }, ...d.incomeEntries],
          pet: feedPet(d.pet),
        })),

      updateIncome: (id, patch) =>
        setData((d) => ({ ...d, incomeEntries: d.incomeEntries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),

      removeIncome: (id) => {
        const item = dataRef.current.incomeEntries.find((e) => e.id === id);
        if (!item) return;
        animateNextLayout();
        setData((d) => ({ ...d, incomeEntries: d.incomeEntries.filter((e) => e.id !== id) }));
        showToast({
          text: t('Доходът е изтрит'),
          icon: 'trash-outline',
          actionLabel: t('Отмени'),
          onAction: () => setData((d) => ({ ...d, incomeEntries: [item, ...d.incomeEntries] })),
        });
      },

      // Recurring payments
      // Resuming a paused rule skips the payments missed while it was paused
      updateRecurring: (id, patch) =>
        setData((d) => ({
          ...d,
          recurring: d.recurring.map((r) => {
            if (r.id !== id) return r;
            const resumed = r.paused && patch.paused === false;
            return { ...r, ...patch, ...(resumed && { lastKey: resumedLastKey(r) }) };
          }),
        })),
      // Past expenses of the rule stay; only future ones stop
      removeRecurring: (id) => setData((d) => ({ ...d, recurring: d.recurring.filter((r) => r.id !== id) })),

      // Savings goals
      addGoal: ({ name, icon, target, deadline, kind }) =>
        setData((d) => ({
          ...d,
          goals: [
            ...d.goals,
            { id: newId(), name: name.trim(), icon, target, deadline: deadline || null, kind: kind || null, createdAt: new Date().toISOString() },
          ],
        })),
      updateGoal: (id, patch) => setData((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
      // The money already put aside stays in "Savings"
      removeGoal: (id) => setData((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) })),
      // A deposit is an expense in "Savings", so it counts towards the 20%.
      // existing: money the user already had (another account, old savings) — it fills the goal
      // but stays out of this month's budget, and Charlie isn't fed for it (nothing new was saved).
      contributeGoal: (goal, amount, { existing = false } = {}) => {
        const before = goalProgress(goal, dataRef.current.expenses);
        setData((d) => ({
          ...d,
          expenses: [
            {
              id: newId(),
              amount,
              categoryId: 'saving',
              merchant: '',
              note: goal.name,
              goalId: goal.id,
              source: 'goal',
              date: new Date().toISOString(),
              loggedAt: new Date().toISOString(),
              ...(existing && { offBudget: true }),
            },
            ...d.expenses,
          ],
          pet: existing ? d.pet : feedPet(d.pet),
        }));
        if (!before.done && before.saved + amount >= goal.target) {
          showToast({ text: t('Целта „{0}“ е постигната! 🎉', { 0: goal.name }), icon: 'trophy', celebrate: true });
        }
      },

      // The 48-hour rule: a wish waits two days before it can be bought
      addWish: ({ name, amount, categoryId }) => {
        animateNextLayout();
        const wish = { id: newId(), name: name.trim(), amount, categoryId: categoryId || 'shopping', createdAt: new Date().toISOString() };
        setData((d) => ({ ...d, wishes: [wish, ...d.wishes] }));
        // The toast promises a reminder only when one could actually be scheduled
        scheduleWishReminder({ id: wish.id, name: wish.name, at: new Date(Date.now() + WISH_HOURS * 3600000) }).then((scheduled) =>
          showToast({
            text: scheduled ? t('„{0}“ чака 48 часа. Ще ти напомня 🐾', { 0: wish.name }) : t('„{0}“ чака 48 часа в „Планове“ 🐾', { 0: wish.name }),
            icon: 'hourglass-outline',
          })
        );
      },
      // Skipping a wish puts its money into a goal (when there is one)
      resolveWish: (id, decision, goal) => {
        const wish = dataRef.current.wishes.find((w) => w.id === id);
        if (!wish) return;
        cancelWishReminder(id);
        animateNextLayout();
        setData((d) => ({
          ...d,
          wishes: d.wishes.map((w) => (w.id === id ? { ...w, decision, decidedAt: new Date().toISOString() } : w)),
        }));
        if (decision === 'skipped' && goal) {
          const before = goalProgress(goal, dataRef.current.expenses);
          setData((d) => ({
            ...d,
            expenses: [
              { id: newId(), amount: wish.amount, categoryId: 'saving', merchant: '', note: t('{0} (вместо {1})', { 0: goal.name, 1: wish.name }), goalId: goal.id, source: 'goal', date: new Date().toISOString(), loggedAt: new Date().toISOString() },
              ...d.expenses,
            ],
          }));
          showToast({
            text: before.saved + wish.amount >= goal.target && !before.done ? t('Целта „{0}“ е постигната! 🎉', { 0: goal.name }) : t('+{0} към „{1}“ вместо „{2}“ 💪', { 0: money(wish.amount), 1: goal.name, 2: wish.name }),
            icon: 'trophy',
            celebrate: true,
          });
        } else if (decision === 'skipped') {
          showToast({ text: t('Спести {0} 💪', { 0: money(wish.amount) }), icon: 'trophy', celebrate: true });
        }
      },
      removeWish: (id) => {
        cancelWishReminder(id);
        animateNextLayout();
        setData((d) => ({ ...d, wishes: d.wishes.filter((w) => w.id !== id) }));
      },

      // Puts a reward on (or takes it off); one item on the head and one around the neck
      wearItem: (id) =>
        setData((d) => (d.pet ? { ...d, pet: { ...d.pet, outfit: toggleItem(outfitOf(d.pet), id), accessory: undefined } } : d)),

      setSettings: (patch) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } })),

      // Backup: the whole saved state as JSON, and restoring it
      exportData: () => {
        const at = new Date().toISOString();
        setData((d) => ({ ...d, lastBackupAt: at }));
        return { app: 'pawket', version: 2, exportedAt: at, data: { ...dataRef.current, lastBackupAt: at } };
      },
      restoreData: (backup) => {
        setPendingEvent(null);
        setData(withDefaults(backup.data));
      },

      // New category { name, icon, bucket } → returns the id
      addCategory: ({ name, icon, bucket }) => {
        const id = `c_${newId()}`;
        setData((d) => {
          const shades = CUSTOM_SHADES[bucket];
          const used = d.categories.filter((c) => c.bucket === bucket).length;
          const category = { id, name: name.trim(), icon, bucket, shade: shades[used % shades.length], custom: true };
          return { ...d, categories: [...d.categories, category] };
        });
        return id;
      },

      // A category without expenses is deleted entirely; otherwise it's hidden and old expenses keep it
      removeCategory: (id) =>
        setData((d) => {
          const used = d.expenses.some((e) => e.categoryId === id);
          return {
            ...d,
            categories: used
              ? d.categories.map((c) => (c.id === id ? { ...c, archived: true } : c))
              : d.categories.filter((c) => c.id !== id),
            merchants: Object.fromEntries(Object.entries(d.merchants).filter(([, cat]) => cat !== id)),
          };
        }),

      // One no-spend day at a time (the button is hidden while one runs)
      // Choosing a no-spend day is today's check-in, like "Без разходи днес": it feeds Charlie and keeps the streak
      startNoSpendDay: () => setData((d) => (d.session ? d : { ...d, session: startNoSpend(), pet: feedPet(d.pet) })),
      endSession: () => finishSession(true),

      checkInNoSpend: () => setData((d) => ({ ...d, pet: feedPet(d.pet) })),

      // The income applies from this month on (later values are removed)
      setIncomeFrom: (year, month, amount) =>
        setData((d) => {
          const key = monthKey(year, month);
          const incomes = Object.fromEntries(Object.entries(d.incomes).filter(([k]) => k < key));
          if (amount > 0) incomes[key] = amount;
          return { ...d, incomes };
        }),

      // Order and visibility of the Home sections
      setHomeLayout: (homeLayout) => setData((d) => ({ ...d, homeLayout })),

      setPetName: (name) => setData((d) => ({ ...d, pet: d.pet && { ...d.pet, name: name.trim() || defaultPetName() } })),

      resetAll: () => {
        setPendingEvent(null);
        setData(EMPTY);
      },
    }),
    [ready, data, pendingEvent, showToast, finishSession, lang]
  );
  const toastValue = useMemo(() => ({ toast, dismissToast: () => setToast(null) }), [toast]);

  return (
    <Ctx.Provider value={value}>
      <ToastCtx.Provider value={toastValue}>{children}</ToastCtx.Provider>
    </Ctx.Provider>
  );
}

export const useStore = () => useContext(Ctx);
export const useToast = () => useContext(ToastCtx);
