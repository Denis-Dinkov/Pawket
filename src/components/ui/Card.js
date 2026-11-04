import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius, shadow } from '../../theme';
import { themed } from '../../themed';

// Flat by default (a hairline border); `elevated` adds the shadow, for the one card that matters most on a screen
export default function Card({ style, children, elevated = false }) {
  return <View style={[s.card, elevated && s.elevated, style]}>{children}</View>;
}

const s = themed((colors) => ({
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 18, borderWidth: 1, borderColor: colors.faint },
  elevated: { borderWidth: 0, ...shadow },
}));
