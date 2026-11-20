import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';

// Chestnut gradient header; the white sheet below overlaps its bottom
// tone="room": the light room gradient used on Home, so every tab speaks the same visual language
export default function GradientHero({ children, bottomSpace = 64, style, tone = 'hero' }) {
  const room = tone === 'room';
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={room ? [colors.roomFrom, colors.roomTo] : [colors.heroFrom, colors.heroTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ paddingTop: insets.top + 8, paddingBottom: bottomSpace, paddingHorizontal: 16 }, style]}
    >
      {children}
    </LinearGradient>
  );
}
