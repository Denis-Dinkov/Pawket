import { MONTHS, monthLower, decimalSep } from './theme';
import { t, getLang } from './i18n';

export const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

export function dayLabel(iso, now = new Date()) {
  const d = new Date(iso);
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return t('Днес');
  if (sameDay(d, y)) return t('Вчера');
  const label = getLang() === 'en' ? `${MONTHS[d.getMonth()]} ${d.getDate()}` : `${d.getDate()} ${monthLower(d.getMonth())}`;
  return d.getFullYear() === now.getFullYear() ? label : `${label} ${d.getFullYear()}`;
}

export const timeLabel = (iso) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const SOURCES = {
  manual: { get label() { return t('Ръчно'); }, icon: 'create-outline' },
  applepay: { label: 'Apple Pay', icon: 'logo-apple' },
  widget: { get label() { return t('Уиджет'); }, icon: 'apps-outline' },
  recurring: { get label() { return t('Повтарящо се'); }, icon: 'repeat' },
  goal: { get label() { return t('Към цел'); }, icon: 'flag-outline' },
  fund: { get label() { return t('От спестявания'); }, icon: 'wallet-outline' },
};

// 1-во, 2-ро, 4-то, 7-мо, 11-то, 21-во число; in English 1st, 2nd, 3rd, 4th, 11th, 21st
export function dayOrdinal(n) {
  if (getLang() === 'en') {
    const teenEn = n % 100 >= 11 && n % 100 <= 13;
    const end = teenEn ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th';
    return `${n}${end}`;
  }
  const teen = n % 100 >= 11 && n % 100 <= 19;
  const last = n % 10;
  const suffix = teen ? 'то' : last === 1 ? 'во' : last === 2 ? 'ро' : last === 7 || last === 8 ? 'мо' : 'то';
  return `${n}-${suffix}`;
}

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Amount field: digits only, one decimal separator (the language's: comma or point) and at most 2 digits after it
export function cleanAmountInput(text) {
  const sep = decimalSep();
  const s = text.replace(/[^0-9.,]/g, '').replace(/[.,]/g, ',');
  const [int, ...rest] = s.split(',');
  return rest.length ? `${int}${sep}${rest.join('').slice(0, 2)}` : int;
}

// A number as the text of an amount field: 12.5 → "12,5" / "12.5"
export const amountText = (n) => (n ? String(n).replace('.', decimalSep()) : '');
