// Shared motion, tuned to feel like iOS itself; everything is skipped with Reduce Motion.
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, LayoutAnimation, Platform, UIManager } from 'react-native';

// iOS-like durations: fades and slides around a third of a second, closing a bit quicker than opening
export const DURATION = { appear: 350, stagger: 50, exit: 300, number: 600, burst: 1000 };
export const EASE = Easing.out(Easing.cubic);
// Closing: iOS eases in and out rather than accelerating away
export const EASE_IN = Easing.inOut(Easing.cubic);

/**
 * A spring described the way iOS / SwiftUI does: response (seconds per oscillation) and damping ratio
 * (1 = settles without overshoot, below 1 = bounces), converted to Animated's stiffness and damping.
 */
const iosSpring = (response, dampingRatio) => ({
  stiffness: (2 * Math.PI / response) ** 2,
  damping: (4 * Math.PI * dampingRatio) / response,
  mass: 1,
});

/**
 * The three springs every animation uses, so the app moves at one rhythm:
 * - snappy: presses, tab icons (response 0.35 s, no bounce)
 * - standard: sheets, toasts, bars: the system default (response 0.5 s, no bounce)
 * - playful: only Charlie and his rewards (SwiftUI's "bouncy": response 0.5 s, a little bounce)
 */
export const SPRING = {
  snappy: iosSpring(0.35, 1),
  standard: iosSpring(0.5, 1),
  playful: iosSpring(0.5, 0.7),
};

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
    duration: 350,
    create: { type: 'easeOut', property: 'opacity' },
    update: { type: 'spring', springDamping: 0.85 },
    delete: { type: 'easeOut', property: 'opacity' },
  });
}

// Text can't run on the native driver, so every visible step is a JS render of that one Text.
// That's cheap, so it runs every frame (a lower cap looked like steps); unchanged rounded values are skipped.
const ROLL_FRAME_MS = 0;

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
    // Already showing it (e.g. a hidden tab coming back re-runs its effects): nothing to roll
    if (value === shownRef.current) return undefined;
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
