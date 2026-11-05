import { t } from './i18n';
// The Home sections below the money card: order and visibility are kept in the store (homeLayout).
// The dog's room and the money card are always on top.
export const HOME_SECTIONS = [
  { key: 'plans', get name() { return t('Предстои и цел'); }, icon: 'flag-outline' },
  { key: 'missions', get name() { return t('Мисии'); }, icon: 'trophy-outline' },
  { key: 'expenses', get name() { return t('Разходи'); }, icon: 'list' },
  { key: 'today', get name() { return t('Днес'); }, icon: 'today-outline' },
  { key: 'rule', get name() { return t('Правило 50/30/20'); }, icon: 'pie-chart' },
  { key: 'topCats', get name() { return t('Топ категории'); }, icon: 'podium-outline' },
];

// v2 = the redesigned Home; v3 = the slimmer Home (missions moved to Charlie's tab).
// v2 layouts keep their order and only get missions hidden; anything older is replaced by the default.
const VERSION = 3;

export const DEFAULT_LAYOUT = {
  v: VERSION,
  order: HOME_SECTIONS.map((x) => x.key),
  hidden: ['missions', 'today', 'rule', 'topCats'],
};

// Adds new sections (after an update) and drops unknown ones
export function normalizeLayout(layout) {
  if (layout?.v === 2) layout = { ...layout, v: VERSION, hidden: [...new Set([...(layout.hidden || []), 'missions'])] };
  if (!layout || layout.v !== VERSION) return DEFAULT_LAYOUT;
  const known = HOME_SECTIONS.map((x) => x.key);
  const order = layout.order.filter((k) => known.includes(k));
  known.forEach((k) => !order.includes(k) && order.push(k));
  return { v: VERSION, order, hidden: (layout.hidden || []).filter((k) => known.includes(k)) };
}

export function moveSection(layout, key, delta) {
  const order = [...layout.order];
  const i = order.indexOf(key);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= order.length) return layout;
  [order[i], order[j]] = [order[j], order[i]];
  return { ...layout, order };
}

export function toggleSection(layout, key) {
  const hidden = layout.hidden.includes(key) ? layout.hidden.filter((k) => k !== key) : [...layout.hidden, key];
  return { ...layout, hidden };
}
