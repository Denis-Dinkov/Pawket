// The evening reminder: a local notification on the days without any entry.
// A repeating notification can't skip a day, so the next 7 evenings are scheduled one by one
// and rescheduled whenever the app opens or something is recorded.
import { Platform } from 'react-native';
import { t, getLang } from './i18n';

let Notifications = null;
try {
  // Missing on web; errors in Expo Go are tolerated too
  if (Platform.OS !== 'web') Notifications = require('expo-notifications');
} catch {
  Notifications = null;
}

const PREFIX = 'pawket-evening-';
const CATEGORY = 'pawket-daily';
export const ACTION_NO_SPEND = 'no-spend';
export const ACTION_ADD = 'add';

export const remindersAvailable = () => !!Notifications;

let setUp = false;
// The action buttons are registered in the current language, again after the language changes
let categoryLang = null;
async function setUpOnce() {
  if (!Notifications) return;
  if (setUp && categoryLang === getLang()) return;
  categoryLang = getLang();
  setUp = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  await Notifications.setNotificationCategoryAsync(CATEGORY, [
    { identifier: ACTION_NO_SPEND, buttonTitle: t('Без разходи днес'), options: { opensAppToForeground: true } },
    { identifier: ACTION_ADD, buttonTitle: t('Запиши разход'), options: { opensAppToForeground: true } },
  ]).catch(() => {});
}

// Asked only when the user turns the reminder on (with the reason shown next to the switch)
export async function requestReminderPermission() {
  if (!Notifications) return false;
  await setUpOnce();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true } });
  return !!next.granted;
}

/**
 * Schedules the next 7 evenings at `hour`, skipping today if there's already an entry.
 * Turning the reminder off (enabled: false) just removes them.
 */
export async function syncReminders({ enabled, hour = 20, petName = t('Чарли'), activeToday = false, now = new Date() }) {
  if (!Notifications) return;
  try {
    await setUpOnce();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled.filter((n) => n.identifier.startsWith(PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
    if (!enabled) return;
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return;
    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hour, 0, 0);
      if (date <= now || (i === 0 && activeToday)) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX}${i}`,
        content: {
          title: t('{0} е гладен 🦴', { 0: petName }),
          body: t('Похарчи ли нещо днес? Запиши го или натисни „Без разходи днес“.'),
          categoryIdentifier: CATEGORY,
          data: { kind: 'evening' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      });
    }
  } catch {
    // Notifications aren't critical — the app works without them
  }
}

const WISH_PREFIX = 'pawket-wish-';

/**
 * A one-off notification when a wish's 48 hours are up. It needs the notification permission already given
 * (it isn't asked for here); returns true when the reminder was scheduled.
 */
export async function scheduleWishReminder({ id, name, at }) {
  if (!Notifications) return false;
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted || at <= new Date()) return false;
    await Notifications.scheduleNotificationAsync({
      identifier: `${WISH_PREFIX}${id}`,
      content: {
        title: t('48 часа минаха ⏳'),
        body: t('Още ли искаш „{0}“? Реши в „Планове“.', { 0: name }),
        data: { kind: 'wish' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
    return true;
  } catch {
    return false;
  }
}

export function cancelWishReminder(id) {
  if (!Notifications) return;
  Notifications.cancelScheduledNotificationAsync(`${WISH_PREFIX}${id}`).catch(() => {});
}

// Calls onAction('no-spend' | 'add') when a reminder (or one of its buttons) is tapped
export function listenToReminders(onAction) {
  if (!Notifications) return () => {};
  const handle = (response) => {
    if (response?.notification?.request?.content?.data?.kind !== 'evening') return;
    onAction(response.actionIdentifier === ACTION_NO_SPEND ? ACTION_NO_SPEND : ACTION_ADD);
  };
  Notifications.getLastNotificationResponseAsync?.().then((r) => {
    if (r) {
      handle(r);
      Notifications.clearLastNotificationResponseAsync?.().catch(() => {});
    }
  }).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
