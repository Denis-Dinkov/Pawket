import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import Touch from './Touch';

const VARIANTS = {
  glass: { bg: 'rgba(255,255,255,0.22)', fg: '#fff' },
  soft: { bg: colors.primarySoft, fg: colors.primary },
  ink: { bg: colors.ink, fg: '#fff' },
  white: { bg: '#fff', fg: colors.text },
  outline: { bg: 'transparent', fg: colors.muted, border: colors.faint },
  active: { bg: colors.text, fg: '#fff' },
};

// Pill: chips, labels and buttons
export default function Pill({ label, icon, iconRight, onPress, variant = 'soft', small, style, textStyle, children, haptic = 'light' }) {
  const v = VARIANTS[variant];
  const iconSize = small ? 13 : 16;
  return (
    <Touch
      haptic={haptic}
      onPress={onPress}
      disabled={!onPress}
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

const s = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1,
  },
  small: { paddingHorizontal: 10, paddingVertical: 5, gap: 4 },
  text: { fontSize: 14, fontWeight: '600' },
  smallText: { fontSize: 12 },
});
