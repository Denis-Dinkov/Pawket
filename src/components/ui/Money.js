import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from './AppText';
import { colors, splitMoney } from '../../theme';
import { themed } from '../../themed';
import { useRollingNumber } from '../../motion';

// Large amount: the integer part is bold, decimals and currency are faded.
// It rolls to a new value instead of jumping; whole shows whole euros (for summaries).
export default function Money({ value, size = 44, color = colors.text, prefix = '', style, maxFontSizeMultiplier = 1.3, whole = false }) {
  const target = whole ? Math.round(Number(value) || 0) : Number(value) || 0;
  const rolled = useRollingNumber(target);
  const shown = rolled === target ? target : whole ? Math.round(rolled) : Math.round(rolled * 100) / 100;
  const { sign, int, dec } = splitMoney(shown);
  const final = splitMoney(target);
  return (
    <Text
      style={[s.base, { fontSize: size, color, letterSpacing: -size * 0.03 }, style]}
      numberOfLines={1}
      adjustsFontSizeToFit
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      accessibilityLabel={`${prefix}${final.sign ? 'минус ' : ''}${final.int}${final.dec ? `,${final.dec}` : ''} евро`}
    >
      {prefix}
      {sign}
      {int}
      {!!dec && <Text style={s.faded}>,{dec}</Text>}
      <Text style={[s.faded, { fontSize: size * 0.6 }]}>{' €'}</Text>
    </Text>
  );
}

const s = themed((colors) => ({
  base: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  faded: { opacity: 0.55, fontWeight: '700' },
}));
