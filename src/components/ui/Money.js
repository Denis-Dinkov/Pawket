import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from './AppText';
import { colors, splitMoney } from '../../theme';

// Large amount: the integer part is bold, decimals and currency are faded
export default function Money({ value, size = 44, color = colors.text, prefix = '', style }) {
  const { sign, int, dec } = splitMoney(value);
  return (
    <Text style={[s.base, { fontSize: size, color, letterSpacing: -size * 0.03 }, style]} numberOfLines={1} adjustsFontSizeToFit>
      {prefix}
      {sign}
      {int}
      {!!dec && <Text style={s.faded}>,{dec}</Text>}
      <Text style={[s.faded, { fontSize: size * 0.6 }]}>{' €'}</Text>
    </Text>
  );
}

const s = StyleSheet.create({
  base: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  faded: { opacity: 0.55, fontWeight: '700' },
});
