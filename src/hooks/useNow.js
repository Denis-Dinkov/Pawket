import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

// Which slot of the day a time falls into; screens only re-render when this changes
const slotOf = (d, stepMinutes) => `${d.toDateString()}-${Math.floor((d.getHours() * 60 + d.getMinutes()) / stepMinutes)}`;

/**
 * Current time for the screens, refreshed every `stepMinutes` (15 by default) and when returning to the app.
 * Every new value invalidates the screens' memoized budget and pet calculations, so it doesn't tick every minute:
 * it checks once a minute but only publishes a new Date when the slot (or the day) changes.
 */
export default function useNow(stepMinutes = 15) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const check = () => {
      const next = new Date();
      setNow((prev) => (slotOf(prev, stepMinutes) === slotOf(next, stepMinutes) ? prev : next));
    };
    // Also on (re)mount: a hidden tab coming back into view may hold an old time
    check();
    const id = setInterval(check, 60000);
    // Coming back to the app always refreshes: the dog's fullness and "today" should be exact then
    const sub = AppState.addEventListener('change', (st) => st === 'active' && setNow(new Date()));
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [stepMinutes]);
  return now;
}
