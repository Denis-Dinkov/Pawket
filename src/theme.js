// Design tokens and category data. No RN imports — also used by the widget.

// Every text color here has at least 4.5:1 contrast against bg and card (WCAG AA).
// Accent colors double as text, so the light palette uses deeper shades than the dark one.
const LIGHT = {
  bg: '#F8F3EE',
  card: '#FFFFFF',
  text: '#1E1510',
  muted: '#6E6155',
  faint: '#F0E6DC',
  // The chestnut of a "Blenheim" Cavalier
  primary: '#A3531F',
  primarySoft: '#FBEADB',
  // White text sits on the whole gradient, so even its light end keeps 4.5:1
  heroFrom: '#9C4D1C',
  heroTo: '#B45E25',
  // The strip under the clock when scrolling: darker, otherwise iOS turns the clock black
  heroDeep: '#8E4519',
  ink: '#1E1510',
  // Text and icons on ink / accent fills
  onAccent: '#FFFFFF',
  needs: '#1F5AD8',
  wants: '#B8297F',
  savings: '#0A7550',
  danger: '#C8323A',
  warning: '#9A5B00',
  orange: '#B4470F',
  dangerSoft: '#FDE7EB',
  savingsSoft: '#E3F7EF',
  warningSoft: '#FFF1D6',
  // The room behind the dog on Home
  roomFrom: '#FFE6CC',
  roomTo: '#FFD4AC',
  floor: '#EAB27C',
  bowl: '#B4602A',
  window: '#BFE4FF',
  windowFrame: '#FFFFFF',
  // Selected segment and other surfaces raised above a card
  raised: '#FFFFFF',
  placeholder: '#CDBFB1',
  // Accent on the inverted toast (dark in light mode, light in dark mode)
  inverseAccent: '#F0A066',
  backdrop: 'rgba(17,16,24,0.45)',
  white: '#FFFFFF',
};

const DARK = {
  bg: '#17110D',
  card: '#221A14',
  text: '#F4ECE4',
  muted: '#B4A596',
  faint: '#3A2E25',
  primary: '#F0A066',
  primarySoft: '#3A2618',
  heroFrom: '#5E2D10',
  heroTo: '#8A4518',
  heroDeep: '#4E250C',
  ink: '#F0A066',
  onAccent: '#17110D',
  needs: '#7EA6FF',
  wants: '#F07BC0',
  savings: '#3FD9A2',
  danger: '#FF7A7E',
  warning: '#F5B94A',
  orange: '#FF9A62',
  dangerSoft: '#4A1E22',
  savingsSoft: '#123A2C',
  warningSoft: '#3D2C0E',
  roomFrom: '#2A1D15',
  roomTo: '#3A2719',
  floor: '#5A3A22',
  bowl: '#7A4A2A',
  window: '#22324A',
  windowFrame: '#4A3A2E',
  raised: '#4A3A2E',
  placeholder: '#5A4A3D',
  inverseAccent: '#A3531F',
  backdrop: 'rgba(0,0,0,0.6)',
  white: '#FFFFFF',
};

export const lightColors = LIGHT;
export const darkColors = DARK;

// The live palette. Components read it at render time; applyScheme swaps the values in place,
// and themed() style sheets rebuild themselves on the next access.
export const colors = { ...LIGHT };
let currentScheme = 'light';
let version = 0;
export const themeVersion = () => version;
export const currentColorScheme = () => currentScheme;
export function applyScheme(scheme) {
  const next = scheme === 'dark' ? 'dark' : 'light';
  if (next === currentScheme) return false;
  currentScheme = next;
  Object.assign(colors, next === 'dark' ? DARK : LIGHT);
  version += 1;
  return true;
}

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

// color is a getter so it follows the live palette (light / dark)
export const BUCKETS = {
  needs: { label: 'Нужди', target: 0.5, get color() { return colors.needs; }, icon: 'home' },
  wants: { label: 'Желания', target: 0.3, get color() { return colors.wants; }, icon: 'sparkles' },
  savings: { label: 'Спестявания', target: 0.2, get color() { return colors.savings; }, icon: 'wallet' },
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

// Thousands are grouped with a no-break space from 5 digits on, as in Bulgarian (CLDR bg):
// 1240 → '1240', 12400 → '12 400', 1234567 → '1 234 567'
const groupThousands = (int) => (int.length < 5 ? int : int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0'));

// 1240.5 → { sign: '', int: '1240', dec: '50' }; dec is '' for whole amounts (2200 → '2200')
export function splitMoney(n) {
  const v = Number(n) || 0;
  const [int, dec] = Math.abs(v).toFixed(2).split('.');
  return {
    sign: v < 0 && Math.abs(v) >= 0.005 ? '−' : '',
    int: groupThousands(int),
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
