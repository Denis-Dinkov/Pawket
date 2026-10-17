import React, { forwardRef } from 'react';
import { Pressable } from 'react-native';
import { feedback } from '../../haptics';

/**
 * Pressable with haptic feedback.
 * haptic: 'light' (default) | 'select' | 'medium' | 'success' | 'warning' | false
 */
const Touch = forwardRef(function Touch({ haptic = 'light', onPress, onLongPress, ...rest }, ref) {
  return (
    <Pressable
      ref={ref}
      accessibilityRole={onPress || onLongPress ? 'button' : undefined}
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
      {...rest}
    />
  );
});

export default Touch;
