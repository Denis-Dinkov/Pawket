// Starts, updates and ends Charlie's Live Activity (Dynamic Island + Lock Screen).
// One activity per day: it goes stale at midnight and the next app launch starts a fresh one.
import { activityProps } from './widgetData';
import { getPetImagePath } from './nativeWidget';

// Without the native module (Expo Go, builds without the widget extension) everything is a no-op
let Activity = null;
try {
  Activity = require('./PawketActivity').default;
} catch {
  Activity = null;
}

export const liveActivityAvailable = () => !!Activity;

let startedFor = null; // the day this launch started its activity for

const endOfDay = (now) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
const dayOf = (now) => now.toDateString();

export async function syncLiveActivity({ enabled, data, now = new Date() }) {
  if (!Activity) return;
  try {
    const running = Activity.getInstances();
    if (!enabled || !data.pet) {
      await Promise.all(running.map((a) => a.end('immediate')));
      startedFor = null;
      return;
    }
    const base = activityProps(data, now);
    const props = { ...base, petImage: getPetImagePath(base.stageKey, base.expression) };
    // A new day (or a fresh launch): replace yesterday's activity
    if (startedFor !== dayOf(now) || !running.length) {
      await Promise.all(running.map((a) => a.end('immediate')));
      Activity.start(props, 'pawket://home', endOfDay(now));
      startedFor = dayOf(now);
      return;
    }
    await Promise.all(running.map((a) => a.update(props, endOfDay(now))));
  } catch {
    // Live Activities may be turned off in Settings → Pawket; the app works without them
  }
}
