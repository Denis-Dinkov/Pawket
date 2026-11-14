// Android: payments from the notifications of Google Wallet and the bank (Revolut), the counterpart of the
// iPhone's "Запиши от известие" and "Запиши от Revolut" actions. The native side (modules/pawket-payments)
// only keeps the raw notifications; here they become payments, with the same rules as on the iPhone
// (plugins/RecordPaymentIntent.swift). Pure logic, no RN imports, so it is tested directly.
import { parseAmount } from './deeplink';

// Keep in sync with PAYMENT_APPS in PaymentListenerService.kt
export const SOURCES = {
  'com.google.android.apps.walletnfcrel': 'wallet',
  'com.revolut.revolut': 'bank',
};

// Refunds, declined and reversed payments, top-ups: money that didn't leave
const SKIP = ['refund', 'returned', 'declined', 'reversed', 'reverted', 'failed', 'top-up', 'topped up', 'received', 'върнат', 'възстанов', 'отказ', 'неуспеш', 'получ', 'захран', '+€', '+ €'];
const CURRENCY = '(?:€|eur|bgn|лв\\.?|\\$|£|usd|gbp)';
const NUMBER = '\\d{1,3}(?:[ \\u00A0.,]\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?';
// An amount with its currency on either side: "€8.83", "8,83 €", "EUR 8.83", "12,50 лв."
const MONEY = new RegExp(`${CURRENCY}\\s*(?:${NUMBER})|(?:${NUMBER})\\s*${CURRENCY}`, 'i');
// A line that is nothing but an amount
const ONLY_MONEY = new RegExp(`^[-−]?\\s*${CURRENCY}?\\s*(?:${NUMBER})\\s*${CURRENCY}?$`, 'i');
// "… at BILLA", "… в Lidl", "… при OMV": the shop after the last such word. Word edges are spaces, not \b,
// which doesn't see Cyrillic letters as part of a word.
const AT_SHOP = /^.*(?:^|\s)(?:at|в|при|от)\s+(.+?)(?:\s+(?:with|с|чрез|on)(?:\s.*)?|\s*[·•|].*)?$/i;
// Wording of a payment in a bank's notification, before the amount
const SPEND = ['spent', 'paid', 'payment of', 'похарч', 'плати', 'платихте', 'плащане'];
// Names that are the app or the card, not the shop
const NOT_A_SHOP = /^(?:google\s*(?:wallet|pay)?|revolut|visa|mastercard|maestro|debit|credit|card|карта)\b/i;

const lower = (s) => (s || '').toLowerCase();
const lines = (...parts) =>
  parts
    .filter(Boolean)
    .flatMap((p) => String(p).split(/\r?\n/))
    .map((l) => l.trim())
    .filter(Boolean);
// "Cbs Ood, Kazanlyk, Stara Zagora" → "Cbs Ood": the shop without the town
const shopName = (s) => (s || '').split(',')[0].replace(/[\s.·•]+$/, '').trim();

// The shop named after "at / в / при" somewhere in the lines, or ''
function shopAfterAt(list) {
  for (const l of list) {
    const after = l.replace(MONEY, '').trim();
    const m = after.match(AT_SHOP);
    if (m && m[1] && !MONEY.test(m[1])) return shopName(m[1]);
  }
  return '';
}

/**
 * Amount and shop from a Google Wallet notification. The amount is a line that is only an amount, or else
 * the first amount with a currency; the shop is the title when it isn't the card or an amount, otherwise the
 * name after "at" / "в", otherwise the line without the amount. Refunds and declined payments return null.
 */
export function walletPayment({ title, text, sub }) {
  const all = lines(title, sub, text);
  if (SKIP.some((w) => lower(all.join(' ')).includes(w))) return null;
  const only = all.find((l) => ONLY_MONEY.test(l) && MONEY.test(l));
  const withMoney = only || all.find((l) => MONEY.test(l));
  if (!withMoney) return null;
  const amount = parseAmount((only || withMoney).match(MONEY)?.[0] ?? only);
  if (!(amount > 0)) return null;
  const t = (title || '').trim();
  let merchant = '';
  if (t && !MONEY.test(t) && !NOT_A_SHOP.test(t)) merchant = shopName(t);
  if (!merchant) merchant = shopAfterAt(all);
  if (!merchant) {
    const rest = all.find((l) => l !== withMoney && !MONEY.test(l) && !NOT_A_SHOP.test(l));
    merchant = shopName(rest);
  }
  return { amount, merchant };
}

/**
 * Amount and shop from the bank's own notification. Revolut's title is the shop ("BILLA") and the text says
 * what was spent and the balance ("🛒 You spent €4.86 · EUR balance: €142.43"). Only spending counts, and the
 * amount is the first one after the spending word, so the balance after it is never taken.
 */
export function bankPayment({ title, text, sub }) {
  const body = lines(sub, text).join(' ');
  const l = lower(`${title || ''} ${body}`);
  if (SKIP.some((w) => l.includes(w))) return null;
  const all = `${title || ''} ${body}`;
  const starts = SPEND.map((w) => l.indexOf(w)).filter((i) => i >= 0);
  if (!starts.length) return null;
  const rest = all.slice(Math.min(...starts));
  const m = rest.match(new RegExp(NUMBER));
  const amount = m ? parseAmount(m[0]) : NaN;
  if (!(amount > 0)) return null;
  const t = (title || '').trim();
  let merchant = t && !MONEY.test(t) && !NOT_A_SHOP.test(t) && !SPEND.some((w) => lower(t).includes(w)) ? shopName(t) : '';
  if (!merchant) merchant = shopAfterAt(lines(title, sub, text));
  return { amount, merchant };
}

/** A kept notification ({ app, title, text, sub, time }) → a report { amount, merchant, source, date }, or null */
export function toReport(raw) {
  const source = SOURCES[raw?.app];
  if (!source) return null;
  const found = source === 'wallet' ? walletPayment(raw) : bankPayment(raw);
  if (!found) return null;
  const date = Number.isFinite(raw.time) && raw.time > 0 ? new Date(raw.time).toISOString() : new Date().toISOString();
  return { ...found, source, date };
}

const SAME_MOMENT = 2 * 60 * 1000;
const KEEP_FOR = 24 * 3600 * 1000;

/**
 * Turns reports into payments without counting one payment twice, like claim() on the iPhone. Each payment
 * takes at most one report per source (the Wallet notification, the bank's notification). A report of the same
 * amount from a source the payment doesn't have yet:
 * - within 2 minutes is the same payment whatever the shop is called (Revolut "M N Mazalat", Wallet "Магазин Мазалам");
 * - later is the same payment only when the shops match (sameMerchant);
 * - later with another shop name is a new payment, flagged as a possible duplicate for the user to check.
 * existing: the automatic expenses already booked ({ id, amount, merchant, date, autoSources }).
 * Returns { payments: [{ id, amount, merchant, date, maybeDuplicate, autoSources }], joined: { expenseId: [sources] } }.
 */
export function groupReports(reports, existing, sameMerchant) {
  const groups = existing
    .filter((e) => Array.isArray(e.autoSources))
    .map((e) => ({ expenseId: e.id, amount: e.amount, merchant: e.merchant, time: new Date(e.date).getTime(), sources: [...e.autoSources] }));
  const payments = [];
  const joined = {};
  const sorted = [...reports].sort((a, b) => a.date.localeCompare(b.date));
  for (const r of sorted) {
    const time = new Date(r.date).getTime();
    const candidates = groups.filter(
      (g) => Math.abs(g.amount - r.amount) < 0.005 && !g.sources.includes(r.source) && Math.abs(time - g.time) < KEEP_FOR
    );
    const match =
      candidates.find((g) => Math.abs(time - g.time) < SAME_MOMENT) ||
      candidates.find((g) => g.merchant && r.merchant && sameMerchant(g.merchant, r.merchant));
    if (match) {
      match.sources.push(r.source);
      if (match.expenseId) joined[match.expenseId] = match.sources;
      else if (!match.payment.merchant && r.merchant) match.payment.merchant = r.merchant;
      if (match.payment) match.payment.autoSources = match.sources;
      continue;
    }
    const payment = {
      id: `${r.source}-${time}-${Math.round(r.amount * 100)}`,
      amount: r.amount,
      merchant: r.merchant,
      date: r.date,
      maybeDuplicate: candidates.length > 0,
      autoSources: [r.source],
    };
    payments.push(payment);
    groups.push({ amount: r.amount, merchant: r.merchant, time, sources: payment.autoSources, payment });
  }
  return { payments, joined };
}
