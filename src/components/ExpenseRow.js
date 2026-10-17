import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import IconBadge from './ui/IconBadge';
import { colors, categoryById, BUCKETS, money } from '../theme';
import { dayLabel, timeLabel, SOURCES } from '../format';
import Touch from './ui/Touch';

// Expense row: compact (latest 10) or detailed (all, with time and source)
export default function ExpenseRow({ expense, onPress, onLongPress, detailed = false }) {
  const cat = categoryById(expense.categoryId);
  const color = BUCKETS[cat?.bucket]?.color || colors.muted;
  const where = expense.merchant || '';
  const what = expense.note || '';
  const subtitle = detailed
    ? [where, what].filter(Boolean).join(' · ') || BUCKETS[cat?.bucket]?.label
    : where || what || dayLabel(expense.date);
  const source = SOURCES[expense.source] || SOURCES.manual;

  return (
    <Touch
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [s.row, pressed && { opacity: 0.6 }]}
    >
      <IconBadge icon={cat?.icon || 'help'} color={color} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={s.name} numberOfLines={1}>{cat?.name || 'Без категория'}</Text>
        <Text style={s.sub} numberOfLines={1}>{subtitle}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={s.amount}>−{money(expense.amount)}</Text>
        <View style={s.meta}>
          {expense.source !== 'manual' && <Ionicons name={source.icon} size={11} color={colors.muted} />}
          <Text style={s.metaText}>{detailed ? timeLabel(expense.date) : where || what ? dayLabel(expense.date) : ''}</Text>
        </View>
      </View>
    </Touch>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  name: { color: colors.text, fontSize: 15, fontWeight: '600' },
  sub: { color: colors.muted, fontSize: 12.5, marginTop: 2 },
  amount: { color: colors.text, fontSize: 15, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  metaText: { color: colors.muted, fontSize: 11.5 },
});
