import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Pill from './ui/Pill';
import { colors, MONTHS } from '../theme';
import { shiftMonth } from '../budget';
import Touch from './ui/Touch';
import { themed } from '../themed';
import { t } from '../i18n';

// "‹ October 2026 ⌄ ›". tone="hero" sits on the dark gradient header, tone="room" on the dog's light room.
export default function MonthPill({ year, month, onChange, onOpenPicker, tone = 'hero', compact = false }) {
  const onRoom = tone === 'room';
  const fg = onRoom ? colors.text : '#fff';
  const now = new Date();
  const atCurrent = year === now.getFullYear() && month === now.getMonth();
  const go = (d) => {
    const next = shiftMonth(year, month, d);
    onChange(next.year, next.month);
  };
  return (
    <View style={s.row}>
      <Touch haptic="select" hitSlop={10} onPress={() => go(-1)} style={[s.arrow, onRoom && s.arrowRoom]} accessibilityLabel={t('Предишен месец')}>
        <Ionicons name="chevron-back" size={18} color={fg} />
      </Touch>
      <Pill
        variant={onRoom ? 'white' : 'glass'}
        small={compact}
        label={compact ? MONTHS[month] : `${MONTHS[month]} ${year}`}
        iconRight="chevron-down"
        onPress={onOpenPicker}
        accessibilityLabel={t('{0} {1}, избери месец', { 0: MONTHS[month], 1: year })}
      />
      <Touch
        haptic="select"
        hitSlop={10}
        onPress={() => go(1)}
        disabled={atCurrent}
        accessibilityLabel={t('Следващ месец')}
        style={[s.arrow, onRoom && s.arrowRoom, atCurrent && { opacity: 0.3 }]}
      >
        <Ionicons name="chevron-forward" size={18} color={fg} />
      </Touch>
    </View>
  );
}

const s = themed((colors) => ({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  arrow: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  arrowRoom: { backgroundColor: colors.card, opacity: 0.92 },
}));
