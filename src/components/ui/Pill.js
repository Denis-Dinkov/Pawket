import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import Touch from './Touch';
import { themed } from '../../themed';

// A function, so the variants follow the live palette (light / dark)
const variant = (key) =>
  ({
    // Darkens the hero behind it, so the small white text keeps its contrast
    glass: { bg: 'rgba(40,14,0,0.22)', fg: '#fff' },
    soft: { bg: colors.primarySoft, fg: colors.primary },
    ink: { bg: colors.ink, fg: colors.onAccent },
    white: { bg: colors.card, fg: colors.text },
    outline: { bg: 'transparent', fg: colors.muted, border: colors.faint },
    active: { bg: colors.text, fg: colors.bg },
  })[key];

// Pill: chips, labels and buttons
export default function Pill({ label, icon, iconRight, onPress, variant: variantKey = 'soft', small, style, textStyle, children, haptic = 'light', accessibilityLabel }) {
  const v = variant(variantKey);
  const iconSize = small ? 13 : 16;
  return (
    <Touch
      haptic={haptic}
      onPress={onPress}
      disabled={!onPress}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        s.pill,
        small && s.small,
        { backgroundColor: v.bg, borderColor: v.border || 'transparent' },
        pressed && { opacity: 0.75 },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={iconSize} color={v.fg} />}
      {label != null && (
        <Text style={[s.text, small && s.smallText, { color: v.fg }, textStyle]} numberOfLines={1}>
          {label}
        </Text>
      )}
      {children}
      {iconRight && <Ionicons name={iconRight} size={iconSize} color={v.fg} />}
    </Touch>
  );
}

export function PillRow({ children, style }) {
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>{children}</View>;
}

const s = themed((colors) => ({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1,
  },
  small: { paddingHorizontal: 10, paddingVertical: 5, gap: 4 },
  text: { fontSize: 14, fontWeight: '600' },
  smallText: { fontSize: 12 },
}));
