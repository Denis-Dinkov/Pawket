// Starts, updates and ends Charlie's Live Activity (Dynamic Island + Lock Screen).
// It exists only while something is happening (activityEvent): no event, no activity.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activityEvent } from './widgetData';
import { getPetImagePath } from './nativeWidget';

// Without the native module (Expo Go, builds without the widget extension) everything is a no-op
let Activity = null;
try {
  Activity = require('./PawketActivity').default;
} catch {
  Activity = null;
}

export const liveActivityAvailable = () => !!Activity;

// The last event shown: { key, startedAt }. Kept across launches, so an activity the user swiped away
// isn't brought back every time the app opens.
const SHOWN_KEY = 'pawket:activity';
// iOS ends an activity after 8 hours; past this, a missing one was ended by the system, not the user
const RESTART_AFTER = 7.5 * 3600000;
let shown;

async function loadShown() {
  if (shown === undefined) {
    try {
      shown = JSON.parse((await AsyncStorage.getItem(SHOWN_KEY)) || 'null');
    } catch {
      shown = null;
    }
  }
  return shown;
}
function saveShown(value) {
  shown = value;
  AsyncStorage.setItem(SHOWN_KEY, JSON.stringify(value)).catch(() => {});
}

const endAll = (running) => Promise.all(running.map((a) => a.end('immediate')));

export async function syncLiveActivity({ enabled, data, now = new Date() }) {
  if (!Activity) return;
  try {
    const running = Activity.getInstances();
    const event = enabled && data.pet ? activityEvent(data, now) : null;
    if (!event) {
      await endAll(running);
      return;
    }
    const props = { ...event.props, petImage: getPetImagePath(event.props.lookKey, event.props.expression, true) };
    const last = await loadShown();
    const same = last?.key === event.key;
    if (same && running.length) {
      await Promise.all(running.map((a) => a.update(props, event.staleDate)));
      return;
    }
    // Swiped away (or not allowed): leave it gone, unless the system ended it after its 8 hours
    if (same && now - new Date(last.startedAt) < RESTART_AFTER) return;
    await endAll(running);
    Activity.start(props, 'pawket://home', event.staleDate);
    saveShown({ key: event.key, startedAt: now.toISOString() });
  } catch {
    // Live Activities may be turned off in Settings → Pawket; the app works without them
  }
}
