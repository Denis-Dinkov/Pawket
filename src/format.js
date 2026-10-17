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
};

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Amount field: digits only, one decimal point (a typed comma becomes a dot) and at most 2 digits after it
export function cleanAmountInput(text) {
  const s = text.replace(/[^0-9.,]/g, '').replace(/,/g, '.');
  const [int, ...rest] = s.split('.');
  return rest.length ? `${int}.${rest.join('').slice(0, 2)}` : int;
}
