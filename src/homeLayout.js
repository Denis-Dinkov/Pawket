// The Home sections below the money card: order and visibility are kept in the store (homeLayout).
// The dog's room and the money card are always on top.
export const HOME_SECTIONS = [
  { key: 'plans', name: 'Предстои и цел', icon: 'flag-outline' },
  { key: 'missions', name: 'Мисии', icon: 'trophy-outline' },
  { key: 'expenses', name: 'Разходи', icon: 'list' },
  { key: 'today', name: 'Днес', icon: 'today-outline' },
  { key: 'rule', name: 'Правило 50/30/20', icon: 'pie-chart' },
  { key: 'topCats', name: 'Топ категории', icon: 'podium-outline' },
];

// v2 = the redesigned Home; older saved layouts are replaced by the default
const VERSION = 2;

export const DEFAULT_LAYOUT = {
  v: VERSION,
  order: HOME_SECTIONS.map((x) => x.key),
  hidden: ['today', 'rule', 'topCats'],
};

// Adds new sections (after an update) and drops unknown ones
export function normalizeLayout(layout) {
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
