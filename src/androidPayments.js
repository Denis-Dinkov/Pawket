// Android: the notification reader (modules/pawket-payments). Elsewhere, and in builds without the native
// module (Expo Go), everything here quietly does nothing.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo';
import { toReport, SOURCES } from './notificationPayments';

const native = Platform.OS === 'android' ? requireOptionalNativeModule('PawketPayments') : null;
// The last notifications of the payment apps that weren't a payment: shown in Settings, so a new wording can be told apart
const UNREAD_KEY = 'pawket:unreadNotifications';
const UNREAD_KEEP = 5;

export const notificationReaderAvailable = () => !!native;

export function notificationAccessEnabled() {
  try {
    return !!native?.isEnabled();
  } catch {
    return false;
  }
}

export function openNotificationAccess() {
  try {
    native?.openSettings();
  } catch {
    // the settings screen couldn't open; the Settings card says where to find it
  }
}

// Files read in this run and not deleted yet, so they aren't read twice while their payments wait for a save
const taken = new Set();

/**
 * The payments the reader saw while Pawket was in the background: { reports: [{ amount, merchant, source, date }],
 * done }. The kept notifications stay on disk until done() is called, once the saved data holds them; done is
 * null when there was nothing new. The ones that weren't payments go to the short list Settings shows.
 */
export async function takeNotificationReports() {
  const none = { reports: [], done: null };
  if (!native) return none;
  let files = [];
  try {
    files = (native.readPending() || []).filter((f) => !taken.has(f.name));
  } catch {
    return none;
  }
  if (!files.length) return none;
  const names = files.map((f) => f.name);
  names.forEach((n) => taken.add(n));
  const done = () => {
    try {
      native.deletePending(names);
    } catch {
      // left for the next launch, where the payments are recognized as already booked
    }
  };
  const reports = [];
  const unread = [];
  for (const { text } of files) {
    let raw;
    try {
      raw = JSON.parse(text);
    } catch {
      continue;
    }
    const report = toReport(raw);
    if (report) reports.push(report);
    else if (SOURCES[raw.app]) unread.push({ app: raw.app, title: raw.title || '', text: raw.text || '', time: raw.time || Date.now() });
  }
  if (unread.length) {
    try {
      const before = JSON.parse((await AsyncStorage.getItem(UNREAD_KEY)) || '[]');
      await AsyncStorage.setItem(UNREAD_KEY, JSON.stringify([...unread.reverse(), ...before].slice(0, UNREAD_KEEP)));
    } catch {
      // only a diagnostic list
    }
  }
  return { reports, done };
}

export async function unreadNotifications() {
  try {
    return JSON.parse((await AsyncStorage.getItem(UNREAD_KEY)) || '[]');
  } catch {
    return [];
  }
}
