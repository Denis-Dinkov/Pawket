import React from 'react';
import { View, Alert, Platform, StyleSheet } from 'react-native';
import { Text } from './ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import Sheet from './ui/Sheet';
import IconBadge from './ui/IconBadge';
import Money from './ui/Money';
import Pill from './ui/Pill';
import { colors, categoryById, BUCKETS, money } from '../theme';
import { dayLabel, timeLabel, SOURCES } from '../format';
import { feedback } from '../haptics';

export function confirmDelete(expense, onDelete, what = 'разхода') {
  const msg = `Да изтрия ли ${what} от ${money(expense.amount)}?`;
  const run = () => {
    feedback('warning');
    onDelete();
  };
  if (Platform.OS === 'web') {
    if (window.confirm(msg)) run();
    return;
  }
  Alert.alert('Изтриване', msg, [
    { text: 'Отказ', style: 'cancel' },
    { text: 'Изтрий', style: 'destructive', onPress: run },
  ]);
}

function Row({ icon, label, value }) {
  return (
    <View style={s.row}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <Text style={s.label}>{label}</Text>
      <Text style={s.value} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// Everything about one expense: where, what for, when and how it was paid
export function ExpenseDetail({ expense, onDelete, onBack }) {
  const cat = categoryById(expense.categoryId);
  const bucket = cat && BUCKETS[cat.bucket];
  const source = SOURCES[expense.source] || SOURCES.manual;
  return (
    <View>
      {onBack && <Pill small icon="chevron-back" label="Назад" variant="outline" onPress={onBack} />}
      <View style={s.head}>
        <IconBadge icon={cat?.icon || 'help'} color={bucket?.color || colors.muted} size={64} />
        <Text style={s.cat}>{cat?.name}</Text>
        <Money value={-expense.amount} size={38} />
        <Pill small variant="soft" label={bucket?.label} style={{ alignSelf: 'center', marginTop: 8 }} />
      </View>
      <View style={s.card}>
        <Row icon="storefront-outline" label="Къде" value={expense.merchant || '—'} />
        <Row icon="document-text-outline" label="За какво" value={expense.note || cat?.name} />
        <Row icon="calendar-outline" label="Кога" value={`${dayLabel(expense.date)}, ${timeLabel(expense.date)}`} />
        <Row icon={source.icon} label="Плащане" value={source.label} />
      </View>
      <Pill
        icon="trash-outline"
        label="Изтрий разхода"
        variant="outline"
        textStyle={{ color: colors.danger }}
        style={s.delete}
        onPress={() => confirmDelete(expense, onDelete)}
      />
    </View>
  );
}

export default function ExpenseDetailSheet({ expense, onClose, onDelete }) {
  return (
    <Sheet visible={!!expense} onClose={onClose}>
      {expense && <ExpenseDetail expense={expense} onDelete={onDelete} />}
    </Sheet>
  );
}

const s = StyleSheet.create({
  head: { alignItems: 'center', gap: 6, marginBottom: 18 },
  cat: { color: colors.muted, fontSize: 14, fontWeight: '600', marginTop: 6 },
  card: { backgroundColor: colors.card, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  label: { color: colors.muted, fontSize: 14, width: 78 },
  value: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600', textAlign: 'right' },
  delete: { alignSelf: 'center', marginTop: 18, borderColor: colors.faint },
});
