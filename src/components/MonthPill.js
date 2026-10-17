import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Pill from './ui/Pill';
import { MONTHS } from '../theme';
import { shiftMonth } from '../budget';
import Touch from './ui/Touch';

// "‹ October 2026 ⌄ ›" on top of the gradient header
export default function MonthPill({ year, month, onChange, onOpenPicker }) {
  const now = new Date();
  const atCurrent = year === now.getFullYear() && month === now.getMonth();
  const go = (d) => {
    const next = shiftMonth(year, month, d);
    onChange(next.year, next.month);
  };
  return (
    <View style={s.row}>
      <Touch haptic="select" hitSlop={10} onPress={() => go(-1)} style={s.arrow} accessibilityLabel="Предишен месец">
        <Ionicons name="chevron-back" size={18} color="#fff" />
      </Touch>
      <Pill variant="glass" label={`${MONTHS[month]} ${year}`} iconRight="chevron-down" onPress={onOpenPicker} />
      <Touch haptic="select" hitSlop={10} onPress={() => go(1)} disabled={atCurrent} accessibilityLabel="Следващ месец" style={[s.arrow, atCurrent && { opacity: 0.3 }]}>
        <Ionicons name="chevron-forward" size={18} color="#fff" />
      </Touch>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  arrow: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
});
