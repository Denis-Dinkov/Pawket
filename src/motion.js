// Shared motion: short, calm timings for a money app; everything is skipped with Reduce Motion.
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, LayoutAnimation, Platform, UIManager } from 'react-native';

export const DURATION = { press: 120, appear: 250, stagger: 40, bar: 500, number: 400, tab: 200 };
export const EASE = Easing.out(Easing.cubic);

// Reduce Motion, readable outside components too (store, LayoutAnimation)
let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled?.().then((v) => {
  reduceMotion = !!v;
}).catch(() => {});
AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => {
  reduceMotion = !!v;
});
export const motionReduced = () => reduceMotion;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Rows slide into place when a list changes (add, delete, undo)
export function animateNextLayout() {
  if (reduceMotion) return;
  LayoutAnimation.configureNext({
    duration: 220,
    create: { type: 'easeOut', property: 'opacity' },
    update: { type: 'spring', springDamping: 0.85 },
    delete: { type: 'easeOut', property: 'opacity' },
  });
}

// Text can't run on the native driver, so every visible step is a JS render (and a text re-measure).
// Steps are capped at ~20 per second and skipped when the rounded value doesn't change.
const ROLL_FRAME_MS = 50;

/**
 * A number that rolls to its new value (400 ms) instead of jumping.
 * The first render shows the value right away; only later changes animate.
 * step: the smallest visible change (1 for whole euros, 0.01 for cents).
 */
export function useRollingNumber(value, step = 0.01) {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  const first = useRef(true);
  useEffect(() => {
    const set = (v) => {
      if (v === shownRef.current) return;
      shownRef.current = v;
      setShown(v);
    };
    if (first.current || reduceMotion) {
      first.current = false;
      set(value);
      return undefined;
    }
    const from = shownRef.current;
    const round = (v) => Math.round(v / step) * step;
    const start = Date.now();
    let last = 0;
    let raf;
    const tick = () => {
      const now = Date.now();
      const p = Math.min(1, (now - start) / DURATION.number);
      if (p >= 1) {
        set(value);
        return;
      }
      if (now - last >= ROLL_FRAME_MS) {
        last = now;
        set(round(from + (value - from) * EASE(p)));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, step]);
  return shown;
}

// 0 → 1 once on mount, after `delay` ms
export function useAppear(delay = 0) {
  const v = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) return;
    Animated.timing(v, { toValue: 1, duration: DURATION.appear, delay, easing: EASE, useNativeDriver: true }).start();
  }, [v, delay]);
  return {
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  };
}
