import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

// Current time, refreshed every minute and when returning to the app
export default function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    const sub = AppState.addEventListener('change', (st) => st === 'active' && setNow(new Date()));
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [intervalMs]);
  return now;
}
