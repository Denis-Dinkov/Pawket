import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius, shadow } from '../../theme';

export default function Card({ style, children }) {
  return <View style={[s.card, style]}>{children}</View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 18, ...shadow },
});
