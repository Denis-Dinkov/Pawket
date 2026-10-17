import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { pushToNativeWidget } from './nativeWidget';

/**
 * Updates the widgets (with a short delay) when data changes and when going to the background.
 * Returns a function for a manual refresh — e.g. after the dog snapshots are ready.
 */
export default function useWidgetSync({ ready, expenses, incomes, incomeEntries, categories, pet }) {
  const latest = useRef(null);
  latest.current = { expenses, incomes, incomeEntries, pet };

  const push = useCallback(() => pushToNativeWidget(latest.current), []);

  useEffect(() => {
    if (!ready) return undefined;
    const t = setTimeout(push, 800);
    return () => clearTimeout(t);
  }, [ready, expenses, incomes, incomeEntries, categories, pet, push]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st === 'background' && push());
    return () => sub.remove();
  }, [push]);

  return push;
}
