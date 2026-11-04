import React, { forwardRef, useRef, useState } from 'react';
import { Animated, Pressable } from 'react-native';
import { feedback } from '../../haptics';
import { DURATION, motionReduced } from '../../motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Pressable with haptic feedback and a small press animation (scales to 0.97 and springs back).
 * haptic: 'light' (default) | 'select' | 'medium' | 'success' | 'warning' | false
 * pressScale: how far it shrinks; 1 turns the animation off (e.g. for big full-width areas)
 */
const Touch = forwardRef(function Touch({ haptic = 'light', onPress, onLongPress, onPressIn, onPressOut, style, pressScale = 0.97, ...rest }, ref) {
  const scale = useRef(new Animated.Value(1)).current;
  // Tracked here, so a style function can be resolved before Animated reads the style
  const [pressed, setPressed] = useState(false);
  const interactive = !!(onPress || onLongPress) && !rest.disabled;
  const to = (v) => {
    if (motionReduced() || pressScale === 1) return;
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: v === 1 ? 6 : 0 }).start();
  };
  return (
    <AnimatedPressable
      ref={ref}
      accessibilityRole={onPress || onLongPress ? 'button' : undefined}
      onPressIn={(e) => {
        if (interactive) to(pressScale);
        if (typeof style === 'function') setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        if (typeof style === 'function') setPressed(false);
        onPressOut?.(e);
      }}
      onPress={
        onPress &&
        ((e) => {
          if (haptic) feedback(haptic);
          onPress(e);
        })
      }
      onLongPress={
        onLongPress &&
        ((e) => {
          feedback('medium');
          onLongPress(e);
        })
      }
      style={[typeof style === 'function' ? style({ pressed }) : style, interactive && { transform: [{ scale }] }]}
      {...rest}
    />
  );
});

export default Touch;
