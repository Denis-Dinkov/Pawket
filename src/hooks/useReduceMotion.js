import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// true when the system "Reduce Motion" setting is on — the dog then stays still
export default function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => alive && setReduce(!!v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => setReduce(!!v));
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
}
