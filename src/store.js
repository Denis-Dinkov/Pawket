import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { monthKey } from './budget';
import { setCustomCategories, CUSTOM_SHADES } from './theme';
import { evaluateClosedMonths, feedPet, stageFor } from './pet/logic';

export const KEY = 'spendlite:v2';
const KEY_V1 = 'spendlite:v1';
const Ctx = createContext(null);

const EMPTY = { expenses: [], incomes: {}, incomeEntries: [], categories: [], merchants: {}, pet: null, homeLayout: null };
export const DEFAULT_PET_NAME = 'Чарли';
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
    const data = { ...EMPTY, ...JSON.parse(raw) };
    if (data.pet?.name === OLD_DEFAULT_NAME) data.pet = { ...data.pet, name: DEFAULT_PET_NAME };
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
  const stageRef = useRef(null);

  // Custom categories are needed by the pure modules too (theme.categoryById)
  setCustomCategories(data.categories);

  useEffect(() => {
    load()
      .then(setData)
      .catch(() => setData(EMPTY))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEY, JSON.stringify(data));
  }, [data, ready]);

  const dataRef = useRef(data);
  dataRef.current = data;

  // Closes past months on launch and when returning to the app
  const closeMonths = useCallback(() => {
    const { pet, reports } = evaluateClosedMonths({ ...dataRef.current, now: new Date() });
    if (!reports.length) return;
    setData((d) => ({ ...d, pet }));
    const shown = reports.filter((r) => r.score != null);
    if (shown.length) setPendingEvent((e) => ({ ...e, reports: shown }));
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    closeMonths();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && closeMonths());
    return () => sub.remove();
  }, [ready, closeMonths]);

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
      pendingEvent,
      dismissEvent: () => setPendingEvent(null),

      createPet: ({ name, income }) => {
        const now = new Date();
        setData((d) => ({
          ...d,
          incomes: income > 0 ? { ...d.incomes, [monthKey(now.getFullYear(), now.getMonth())]: income } : d.incomes,
          pet: {
            name: name.trim() || DEFAULT_PET_NAME,
            createdAt: now.toISOString(),
            xp: 0,
            lastFedAt: now.toISOString(),
            lastActiveDay: null,
            evaluatedMonths: {},
          },
        }));
      },

      addExpense: (e) =>
        setData((d) => {
          const merchant = (e.merchant || '').trim();
          const expense = {
            id: newId(),
            note: '',
            source: 'manual',
            ...e,
            merchant,
          };
          return {
            ...d,
            expenses: [expense, ...d.expenses],
            merchants: merchant ? { ...d.merchants, [normalizeMerchant(merchant)]: e.categoryId } : d.merchants,
            pet: feedPet(d.pet),
          };
        }),

      removeExpense: (id) => setData((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) })),

      // Income: { amount, kind, note, date }. The entry also feeds the dog.
      addIncome: (e) =>
        setData((d) => ({
          ...d,
          incomeEntries: [{ id: newId(), note: '', kind: 'other', ...e }, ...d.incomeEntries],
          pet: feedPet(d.pet),
        })),

      removeIncome: (id) => setData((d) => ({ ...d, incomeEntries: d.incomeEntries.filter((e) => e.id !== id) })),

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

      setPetName: (name) => setData((d) => ({ ...d, pet: d.pet && { ...d.pet, name: name.trim() || DEFAULT_PET_NAME } })),

      resetAll: () => {
        setPendingEvent(null);
        setData(EMPTY);
      },
    }),
    [ready, data, pendingEvent]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
