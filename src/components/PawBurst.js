import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { motionReduced, DURATION, EASE } from '../motion';

const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

// Paws burst out from the middle of the screen when a goal or a mission is done. A new id plays it again.
export default function PawBurst({ id }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!id || motionReduced()) return;
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: DURATION.burst, easing: EASE, useNativeDriver: true }).start();
  }, [id, progress]);
  if (!id || motionReduced()) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: '42%', left: '50%' }}>
      {ANGLES.map((deg, i) => {
        const r = 90 + (i % 2) * 30;
        const rad = (deg * Math.PI) / 180;
        return (
          <Animated.Text
            key={deg}
            style={{
              position: 'absolute', fontSize: 20 + (i % 3) * 4, marginLeft: -12, marginTop: -12,
              opacity: progress.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(rad) * r] }) },
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(rad) * r] }) },
                { scale: progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1.2, 0.9] }) },
                { rotate: `${deg}deg` },
              ],
            }}
          >
            🐾
          </Animated.Text>
        );
      })}
    </View>
  );
}
