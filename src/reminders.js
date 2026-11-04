// The evening reminder: a local notification on the days without any entry.
// A repeating notification can't skip a day, so the next 7 evenings are scheduled one by one
// and rescheduled whenever the app opens or something is recorded.
import { Platform } from 'react-native';

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
async function setUpOnce() {
  if (setUp || !Notifications) return;
  setUp = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  await Notifications.setNotificationCategoryAsync(CATEGORY, [
    { identifier: ACTION_NO_SPEND, buttonTitle: 'Без разходи днес', options: { opensAppToForeground: true } },
    { identifier: ACTION_ADD, buttonTitle: 'Запиши разход', options: { opensAppToForeground: true } },
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
export async function syncReminders({ enabled, hour = 20, petName = 'Чарли', activeToday = false, now = new Date() }) {
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
          title: `${petName} е гладен 🦴`,
          body: 'Днес харчи ли нещо? Запиши го или натисни „Без разходи днес“.',
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
