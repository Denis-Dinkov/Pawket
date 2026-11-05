import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from './AppText';
import { colors, splitMoney, decimalSep, euroFirst } from '../../theme';
import { themed } from '../../themed';
import { useRollingNumber } from '../../motion';
import { t } from '../../i18n';

// Large amount: the integer part is bold, decimals and currency are faded.
// It rolls to a new value instead of jumping; whole shows whole euros (for summaries).
export default function Money({ value, size = 44, color = colors.text, prefix = '', style, maxFontSizeMultiplier = 1.3, whole = false }) {
  const target = whole ? Math.round(Number(value) || 0) : Number(value) || 0;
  const rolled = useRollingNumber(target, whole ? 1 : 0.01);
  const shown = rolled === target ? target : whole ? Math.round(rolled) : Math.round(rolled * 100) / 100;
  const { sign, int, dec } = splitMoney(shown);
  const final = splitMoney(target);
  return (
    <Text
      style={[s.base, { fontSize: size, color, letterSpacing: -size * 0.03 }, style]}
      numberOfLines={1}
      adjustsFontSizeToFit
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      accessibilityLabel={t('{0}{1}{2}{3} евро', { 0: prefix, 1: final.sign ? t('минус ') : '', 2: final.int, 3: final.dec ? `${decimalSep()}${final.dec}` : '' })}
    >
      {prefix}
      {sign}
      {/* The euro sign: before the amount in English (€12.50), after it in Bulgarian (12,50 €) */}
      {euroFirst() && <Text style={[s.faded, { fontSize: size * 0.6 }]}>€</Text>}
      {int}
      {!!dec && <Text style={s.faded}>{decimalSep()}{dec}</Text>}
      {!euroFirst() && <Text style={[s.faded, { fontSize: size * 0.6 }]}>{' €'}</Text>}
    </Text>
  );
}

const s = themed((colors) => ({
  base: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  faded: { opacity: 0.55, fontWeight: '700' },
}));
