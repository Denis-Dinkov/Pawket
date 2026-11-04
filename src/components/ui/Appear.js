import React from 'react';
import { Animated } from 'react-native';
import { useAppear, DURATION } from '../../motion';

// Fades and slides its children up on mount; index staggers siblings by 40 ms
export default function Appear({ index = 0, style, children }) {
  const anim = useAppear(Math.min(index, 8) * DURATION.stagger);
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}
