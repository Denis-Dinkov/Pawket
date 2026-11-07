import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as QuickActions from 'expo-quick-actions';
import { parseAddUrl, parseSessionUrl, parseReviewUrl } from '../deeplink';
import { t } from '../i18n';


/**
 * Opens "New expense" from:
 * - deep link pawket:// - the deep link pawket://add?... (Apple Pay automation, widget)
 * - the quick action on long-pressing the app icon
 * and ends the running session from the Live Activity (pawket://session?action=end)
 * and opens a payment waiting for a category (pawket://review?id=…)
 */
export default function useIncomingAdd(onAdd, onSessionEnd, onReview) {
  const cb = useRef(onAdd);
  cb.current = onAdd;
  const endCb = useRef(onSessionEnd);
  endCb.current = onSessionEnd;
  const reviewCb = useRef(onReview);
  reviewCb.current = onReview;

  useEffect(() => {
    const handle = (url) => {
      const prefill = parseAddUrl(url);
      if (prefill) cb.current(prefill);
      // The Live Activity's "End" button
      else if (parseSessionUrl(url) === 'end') endCb.current?.();
      // The "pick a category" Live Activity: open that payment for editing
      else if (parseReviewUrl(url)) reviewCb.current?.(parseReviewUrl(url));
    };
    Linking.getInitialURL().then(handle).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // Without the native module (Expo Go, web) the functions are no-ops
    QuickActions.setItems([
      { id: 'add', title: t('Нов разход'), icon: Platform.OS === 'ios' ? 'symbol:plus.circle.fill' : undefined },
    ]).catch(() => {});
    if (QuickActions.initial?.id === 'add') cb.current({ source: 'manual' });
    const sub = QuickActions.addListener((action) => action.id === 'add' && cb.current({ source: 'manual' }));
    return () => sub.remove();
  }, []);
}
