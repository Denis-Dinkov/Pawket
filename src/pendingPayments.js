// Payments recorded by the "Запиши плащане" Shortcuts action (plugins/withRecordPaymentIntent.js) while
// Pawket was closed or the phone was locked. Each one is a JSON file in the App Group container:
// { id, amount: "8,83 €", merchant, date }. They are read when the app comes to the front and deleted once
// the saved data holds them. react-native is required lazily, so the pure parts below load in Node tests.
import { parseAmount } from './deeplink';
import { RULES, LEGAL_WORDS, PROCESSOR_PREFIXES, GENERIC_WORDS } from './categoryGuess';
import { categoryById } from './theme';
import { FIXED_CATEGORIES } from './budget';

// Keep in sync with the Swift side
const APP_GROUP = 'group.com.denis.pawket';
const FOLDER = 'PendingPayments';

// The App Group container, or null (Expo Go and web have no native file system / no App Group)
function sharedContainer() {
  try {
    if (require('react-native').Platform.OS !== 'ios') return null;
    const { Paths } = require('expo-file-system');
    return Paths.appleSharedContainers?.[APP_GROUP] || null;
  } catch {
    return null;
  }
}

function pendingFolder() {
  const container = sharedContainer();
  if (!container) return null;
  try {
    const { Directory } = require('expo-file-system');
    const dir = new Directory(container, FOLDER);
    return dir.exists ? dir : null;
  } catch {
    return null;
  }
}

/**
 * Hands the action what it needs to tell whether a payment has a category while the app is closed:
 * the categories the user picked per merchant, the name rules of categoryGuess.js and the category names.
 * Written to categorizer.json in the App Group whenever the merchant memory changes.
 */
export function writeCategorizer(merchants = {}) {
  const container = sharedContainer();
  if (!container) return;
  try {
    const { File } = require('expo-file-system');
    const ids = new Set([...RULES.map(([id]) => id), ...Object.values(merchants)]);
    const names = Object.fromEntries([...ids].map((id) => [id, categoryById(id)?.name]).filter(([, n]) => n));
    const file = new File(container, 'categorizer.json');
    if (!file.exists) file.create();
    // buckets and fixed: how a payment counts in today's limit (dailyLimit in budget.js), so the widget and the
    // notification show the same number as Home
    const buckets = Object.fromEntries([...ids].map((id) => [id, categoryById(id)?.bucket]).filter(([, b]) => b));
    file.write(JSON.stringify({ merchants, rules: RULES, legal: LEGAL_WORDS, processors: PROCESSOR_PREFIXES, generic: GENERIC_WORDS, names, buckets, fixed: [...FIXED_CATEGORIES] }));
  } catch {
    // without it the action simply can't tell, and treats new shops as unknown
  }
}

// Files read in this run and not deleted yet, so they aren't read twice while their payments wait for a save
const taken = new Set();

/**
 * Reads the waiting payments: { payments: [{ id, amount, merchant, date }] oldest first, done }. The files stay
 * until done() is called, once the saved data holds the payments; done is null when there was nothing new.
 * Unreadable files and zero amounts are dropped (and deleted with the rest).
 */
export async function takePendingPayments() {
  const none = { payments: [], done: null };
  const dir = pendingFolder();
  if (!dir) return none;
  const files = dir.list().filter((item) => item.uri.endsWith('.json') && typeof item.text === 'function' && !taken.has(item.uri));
  if (!files.length) return none;
  const out = [];
  for (const item of files) {
    taken.add(item.uri);
    try {
      const payment = toPayment(JSON.parse(await item.text()));
      if (payment) out.push(payment);
    } catch {
      // a half-written or broken file: dropped rather than retried forever
    }
  }
  const done = () =>
    files.forEach((item) => {
      try {
        item.delete();
      } catch {
        // already gone
      }
    });
  return { payments: out.sort((a, b) => a.date.localeCompare(b.date)), done };
}

// Raw file content → payment, or null. Pure, so it can be tested without a phone.
export function toPayment(raw) {
  const amount = parseAmount(raw?.amount);
  if (!(amount > 0)) return null;
  const date = raw.date && !Number.isNaN(Date.parse(raw.date)) ? new Date(raw.date).toISOString() : new Date().toISOString();
  return { id: String(raw.id || date), amount, merchant: String(raw.merchant || '').trim(), date, maybeDuplicate: !!raw.maybeDuplicate };
}

const DAY = 24 * 3600000;

/**
 * Checks an incoming payment against the expenses entered by hand in the 24 hours around it (the automations
 * check each other in the action itself). Returns { skip: id } when a hand-entered expense of the same amount
 * names the same shop — the payment is already there, and that expense is matched to it — or { flag: true }
 * when one of the same amount can't be compared (no shop, another name), so the payment comes in marked as a
 * possible duplicate. A hand-entered expense is matched to one payment at most.
 */
export function matchManual(payment, expenses, sameMerchant) {
  const t = new Date(payment.date).getTime();
  const near = expenses.filter(
    (e) =>
      e.source !== 'applepay' &&
      e.source !== 'gpay' &&
      !e.goalId &&
      !e.matchedPayment &&
      Math.abs(e.amount - payment.amount) < 0.005 &&
      Math.abs(new Date(e.date).getTime() - t) < DAY
  );
  const same = near.find((e) => e.merchant && payment.merchant && sameMerchant(e.merchant, payment.merchant));
  if (same) return { skip: same.id };
  return { flag: near.length > 0 };
}
