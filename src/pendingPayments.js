// Payments recorded by the "Запиши плащане" Shortcuts action (plugins/withRecordPaymentIntent.js) while
// Pawket was closed or the phone was locked. Each one is a JSON file in the App Group container:
// { id, amount: "8,83 €", merchant, date }. They are read and deleted when the app comes to the front.
import { Platform } from 'react-native';
import { parseAmount } from './deeplink';

// Keep in sync with the Swift side
const APP_GROUP = 'group.com.denis.pawket';
const FOLDER = 'PendingPayments';

function pendingFolder() {
  if (Platform.OS !== 'ios') return null;
  try {
    // Expo Go and web have no native file system / no App Group
    const { Directory, Paths } = require('expo-file-system');
    const container = Paths.appleSharedContainers?.[APP_GROUP];
    if (!container) return null;
    const dir = new Directory(container, FOLDER);
    return dir.exists ? dir : null;
  } catch {
    return null;
  }
}

/**
 * Reads the waiting payments and deletes their files. Returns [{ id, amount, merchant, date }],
 * oldest first; unreadable files and zero amounts are dropped.
 */
export async function takePendingPayments() {
  const dir = pendingFolder();
  if (!dir) return [];
  const out = [];
  for (const item of dir.list()) {
    if (!item.uri.endsWith('.json') || typeof item.text !== 'function') continue;
    try {
      const raw = JSON.parse(await item.text());
      const payment = toPayment(raw);
      if (payment) out.push(payment);
    } catch {
      // a half-written or broken file: drop it rather than retrying it forever
    }
    try {
      item.delete();
    } catch {
      // already gone
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// Raw file content → payment, or null. Pure, so it can be tested without a phone.
export function toPayment(raw) {
  const amount = parseAmount(raw?.amount);
  if (!(amount > 0)) return null;
  const date = raw.date && !Number.isNaN(Date.parse(raw.date)) ? new Date(raw.date).toISOString() : new Date().toISOString();
  return { id: String(raw.id || date), amount, merchant: String(raw.merchant || '').trim(), date };
}
