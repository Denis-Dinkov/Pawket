// Design tokens and category data. No RN imports — also used by the widget.

export const colors = {
  bg: '#F8F3EE',
  card: '#FFFFFF',
  text: '#1E1510',
  muted: '#958779',
  faint: '#F0E6DC',
  // The chestnut of a "Blenheim" Cavalier; primary is a bit darker so it reads as text on white
  primary: '#B8622A',
  primarySoft: '#FBEADB',
  heroFrom: '#C46D2D',
  heroTo: '#EBA15E',
  // The strip under the clock when scrolling: darker, otherwise iOS turns the clock black
  heroDeep: '#A24B1B',
  ink: '#1E1510',
  needs: '#3D7BFF',
  wants: '#D6479A',
  savings: '#1FBF87',
  danger: '#E5484D',
  warning: '#F5A524',
  white: '#FFFFFF',
};

export const radius = { card: 24, sheet: 32, pill: 999, badge: 16 };

export const shadow = {
  shadowColor: '#4A2A14',
  shadowOpacity: 0.08,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

// Translucent variant of a #RRGGBB color
export const tint = (hex, alpha = 0.12) =>
  hex + Math.round(alpha * 255).toString(16).padStart(2, '0');

export const BUCKETS = {
  needs: { label: 'Нужди', target: 0.5, color: colors.needs, icon: 'home' },
  wants: { label: 'Желания', target: 0.3, color: colors.wants, icon: 'sparkles' },
  savings: { label: 'Спестявания', target: 0.2, color: colors.savings, icon: 'wallet' },
};

// Every category belongs to a bucket of the 50/30/20 rule
// shade is a tint of the bucket color — for the donut segments
export const CATEGORIES = [
  { id: 'rent', name: 'Наем', icon: 'home', bucket: 'needs', shade: '#2F6BFF' },
  { id: 'groceries', name: 'Храна', icon: 'cart', bucket: 'needs', shade: '#4C8DFF' },
  { id: 'bills', name: 'Сметки', icon: 'flash', bucket: 'needs', shade: '#6FA6FF' },
  { id: 'transport', name: 'Транспорт', icon: 'car', bucket: 'needs', shade: '#93BEFF' },
  { id: 'health', name: 'Здраве', icon: 'medkit', bucket: 'needs', shade: '#B3D1FF' },
  { id: 'dining', name: 'Заведения', icon: 'restaurant', bucket: 'wants', shade: '#C9307F' },
  { id: 'shopping', name: 'Пазаруване', icon: 'bag-handle', bucket: 'wants', shade: '#D6479A' },
  { id: 'fun', name: 'Забавления', icon: 'film', bucket: 'wants', shade: '#E26CB0' },
  { id: 'travel', name: 'Пътувания', icon: 'airplane', bucket: 'wants', shade: '#EC93C6' },
  { id: 'subscriptions', name: 'Абонаменти', icon: 'repeat', bucket: 'wants', shade: '#F4BBDC' },
  { id: 'saving', name: 'Спестявания', icon: 'wallet', bucket: 'savings', shade: '#14A877' },
  { id: 'invest', name: 'Инвестиции', icon: 'trending-up', bucket: 'savings', shade: '#5ED3A4' },
];

// The user's custom categories. store.js passes them in here on every change,
// so the pure modules (budget, advice, widgets) can see them too.
let customCategories = [];
export const setCustomCategories = (list) => {
  customCategories = list || [];
};

// Deleted custom categories remain for old expenses but aren't offered for new ones
export const getCategories = (includeArchived = false) => [
  ...CATEGORIES,
  ...customCategories.filter((c) => includeArchived || !c.archived),
];

export const categoryById = (id) =>
  CATEGORIES.find((c) => c.id === id) || customCategories.find((c) => c.id === id);

// The icons to choose from for a new category
export const CATEGORY_ICONS = [
  'cart', 'basket', 'restaurant', 'cafe', 'beer', 'pizza', 'fast-food', 'car', 'bus', 'bicycle',
  'airplane', 'train', 'home', 'flash', 'water', 'wifi', 'phone-portrait', 'tv', 'game-controller', 'musical-notes',
  'film', 'ticket', 'book', 'school', 'fitness', 'barbell', 'medkit', 'paw', 'heart', 'gift',
  'shirt', 'cut', 'construct', 'briefcase', 'card', 'wallet', 'trending-up', 'people', 'umbrella', 'leaf',
];

// Shades for custom categories, per bucket
export const CUSTOM_SHADES = {
  needs: ['#1D4ED8', '#60A5FA', '#2563EB', '#3B82F6', '#1E40AF'],
  wants: ['#B8286F', '#E57CB8', '#A81E63', '#F09ACB', '#CC3D8C'],
  savings: ['#0E9F6E', '#34D399', '#047857', '#6EE7B7', '#059669'],
};

// Income kinds. Salary replaces the monthly income setting; the rest are added on top.
export const INCOME_KINDS = [
  { id: 'salary', name: 'Заплата', icon: 'briefcase' },
  { id: 'bonus', name: 'Бонус', icon: 'sparkles' },
  { id: 'freelance', name: 'Хонорар', icon: 'laptop' },
  { id: 'gift', name: 'Подарък', icon: 'gift' },
  { id: 'refund', name: 'Връщане', icon: 'arrow-undo' },
  { id: 'other', name: 'Друго', icon: 'cash' },
];
export const incomeKindById = (id) => INCOME_KINDS.find((k) => k.id === id) || INCOME_KINDS[INCOME_KINDS.length - 1];
export const categoryColor = (id) => BUCKETS[categoryById(id)?.bucket]?.color || colors.muted;

// 1240.5 → { sign: '', int: '1240', dec: '50' }; dec is '' for whole amounts (2200 → '2200')
export function splitMoney(n) {
  const v = Number(n) || 0;
  const [int, dec] = Math.abs(v).toFixed(2).split('.');
  return {
    sign: v < 0 && Math.abs(v) >= 0.005 ? '−' : '',
    int,
    dec: dec === '00' ? '' : dec,
  };
}

export const money = (n) => {
  const { sign, int, dec } = splitMoney(n);
  return `${sign}${int}${dec ? `,${dec}` : ''}\u00A0€`;
};

export const moneyShort = (n) => {
  const { sign, int } = splitMoney(Math.round(Number(n) || 0));
  return `${sign}${int}\u00A0€`;
};

export const pct = (x) => `${Math.round((Number(x) || 0) * 100)}%`;


export const MONTHS = [
  'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
  'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември',
];
