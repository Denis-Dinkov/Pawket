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

/**
 * A number that rolls to its new value (400 ms) instead of jumping.
 * The first render shows the value right away; only later changes animate.
 */
export function useRollingNumber(value) {
  const [shown, setShown] = useState(value);
  const anim = useRef(new Animated.Value(value)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current || reduceMotion) {
      first.current = false;
      anim.setValue(value);
      setShown(value);
      return undefined;
    }
    const id = anim.addListener(({ value: v }) => setShown(v));
    Animated.timing(anim, { toValue: value, duration: DURATION.number, easing: EASE, useNativeDriver: false }).start(({ finished }) => {
      if (finished) setShown(value);
    });
    return () => anim.removeListener(id);
  }, [value, anim]);
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
