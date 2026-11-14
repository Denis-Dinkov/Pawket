// The budget split: how much of the income goes to needs, wants and savings. 50/30/20 unless the user set
// their own. Like the income, a split applies from the month it was set on, so closed months keep the split
// they were scored by. store.js passes the saved splits in here on every change (like the custom categories),
// so the pure modules can read them without having them passed through every call. No RN imports.

export const DEFAULT_SPLIT = Object.freeze({ needs: 0.5, wants: 0.3, savings: 0.2 });

// { 'YYYY-MM': { needs, wants, savings } } as fractions of income
let splits = {};
export const setSplits = (next) => {
  splits = next || {};
};

const key = (year, month) => `${year}-${String(month + 1).padStart(2, '0')}`;

// The split for a month: the last one set at or before it, or 50/30/20 before any was set
export function splitFor(year, month) {
  const k = key(year, month);
  const earlier = Object.keys(splits)
    .filter((x) => x <= k)
    .sort();
  return earlier.length ? splits[earlier[earlier.length - 1]] : DEFAULT_SPLIT;
}

export const currentSplit = (now = new Date()) => splitFor(now.getFullYear(), now.getMonth());

// Fractions → whole percents: { needs: 50, wants: 30, savings: 20 }
export const splitPercents = (s = currentSplit()) => ({
  needs: Math.round(s.needs * 100),
  wants: Math.round(s.wants * 100),
  savings: Math.round(s.savings * 100),
});

// "50/30/20", "60/25/15"
export const splitLabel = (s = currentSplit()) => {
  const p = splitPercents(s);
  return `${p.needs}/${p.wants}/${p.savings}`;
};

// Whole percents that make a valid split: each 0–100, together exactly 100
export const validPercents = (p) =>
  ['needs', 'wants', 'savings'].every((k) => Number.isInteger(p[k]) && p[k] >= 0 && p[k] <= 100) &&
  p.needs + p.wants + p.savings === 100;

export const PRESETS = [
  { needs: 50, wants: 30, savings: 20 },
  { needs: 60, wants: 20, savings: 20 },
  { needs: 70, wants: 20, savings: 10 },
  { needs: 40, wants: 30, savings: 30 },
];
