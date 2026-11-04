import { MONTHS } from './theme';

export const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

export function dayLabel(iso, now = new Date()) {
  const d = new Date(iso);
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return 'Днес';
  if (sameDay(d, y)) return 'Вчера';
  const label = `${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()}`;
  return d.getFullYear() === now.getFullYear() ? label : `${label} ${d.getFullYear()}`;
}

export const timeLabel = (iso) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const SOURCES = {
  manual: { label: 'Ръчно', icon: 'create-outline' },
  applepay: { label: 'Apple Pay', icon: 'logo-apple' },
  widget: { label: 'Уиджет', icon: 'apps-outline' },
  recurring: { label: 'Повтарящо се', icon: 'repeat' },
  goal: { label: 'Към цел', icon: 'flag-outline' },
  fund: { label: 'От спестявания', icon: 'wallet-outline' },
};

// 1-во, 2-ро, 4-то, 7-мо, 11-то, 21-во число
export function dayOrdinal(n) {
  const teen = n % 100 >= 11 && n % 100 <= 19;
  const last = n % 10;
  const suffix = teen ? 'то' : last === 1 ? 'во' : last === 2 ? 'ро' : last === 7 || last === 8 ? 'мо' : 'то';
  return `${n}-${suffix}`;
}

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Amount field: digits only, one decimal separator (comma) and at most 2 digits after it
export function cleanAmountInput(text) {
  const s = text.replace(/[^0-9.,]/g, '').replace(/\./g, ',');
  const [int, ...rest] = s.split(',');
  return rest.length ? `${int},${rest.join('').slice(0, 2)}` : int;
}
