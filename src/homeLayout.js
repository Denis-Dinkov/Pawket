// The Home sections: order and visibility are kept in the store (homeLayout)
export const HOME_SECTIONS = [
  { key: 'pet', name: 'Кучето', icon: 'paw' },
  { key: 'advice', name: 'Съвети', icon: 'sparkles' },
  { key: 'money', name: 'Твоите пари', icon: 'cash-outline' },
  { key: 'today', name: 'Днес', icon: 'today-outline' },
  { key: 'rule', name: 'Правило 50/30/20', icon: 'pie-chart' },
  { key: 'topCats', name: 'Топ категории', icon: 'podium-outline' },
  { key: 'expenses', name: 'Разходи', icon: 'list' },
];

export const DEFAULT_LAYOUT = {
  order: HOME_SECTIONS.map((x) => x.key),
  hidden: ['topCats'],
};

// Adds new sections (after an update) and drops unknown ones
export function normalizeLayout(layout) {
  if (!layout) return DEFAULT_LAYOUT;
  const known = HOME_SECTIONS.map((x) => x.key);
  const order = layout.order.filter((k) => known.includes(k));
  known.forEach((k) => !order.includes(k) && order.push(k));
  return { order, hidden: (layout.hidden || []).filter((k) => known.includes(k)) };
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
