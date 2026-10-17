import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as QuickActions from 'expo-quick-actions';
import { parseAddUrl } from '../deeplink';


/**
 * Opens "New expense" from:
 * - deep link pawket:// - the deep link pawket://add?... (Apple Pay automation, widget)
 * - the quick action on long-pressing the app icon
 */
export default function useIncomingAdd(onAdd) {
  const cb = useRef(onAdd);
  cb.current = onAdd;

  useEffect(() => {
    const handle = (url) => {
      const prefill = parseAddUrl(url);
      if (prefill) cb.current(prefill);
    };
    Linking.getInitialURL().then(handle).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // Without the native module (Expo Go, web) the functions are no-ops
    QuickActions.setItems([
      { id: 'add', title: 'Нов разход', icon: Platform.OS === 'ios' ? 'symbol:plus.circle.fill' : undefined },
    ]).catch(() => {});
    if (QuickActions.initial?.id === 'add') cb.current({ source: 'manual' });
    const sub = QuickActions.addListener((action) => action.id === 'add' && cb.current({ source: 'manual' }));
    return () => sub.remove();
  }, []);
}
