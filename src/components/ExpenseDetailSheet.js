import React, { useState } from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { Text } from './ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import Sheet from './ui/Sheet';
import IconBadge from './ui/IconBadge';
import Money from './ui/Money';
import Pill from './ui/Pill';
import Touch from './ui/Touch';
import { colors, categoryById, BUCKETS, money } from '../theme';
import { dayLabel, timeLabel, SOURCES } from '../format';
import { feedback } from '../haptics';
import { useStore } from '../store';
import { themed } from '../themed';

// Deletes right away: the store shows an "Undo" toast instead of asking first
export function confirmDelete(expense, onDelete) {
  feedback('warning');
  onDelete();
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
export function ExpenseDetail({ expense, onDelete, onEdit, onBack }) {
  const { updateExpense } = useStore();
  const cat = categoryById(expense.categoryId);
  const bucket = cat && BUCKETS[cat.bucket];
  const source = SOURCES[expense.source] || SOURCES.manual;
  // The sheet holds a snapshot of the expense, so the switch keeps its own state
  const [counts, setCounts] = useState(!expense.offBudget);
  const toggleCounts = (v) => {
    feedback('select');
    setCounts(v);
    updateExpense(expense.id, { offBudget: !v || undefined });
  };
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
      {/* A payment out of a goal is never counted in the month, so there's nothing to switch */}
      {expense.fromGoalId ? (
        <Text style={s.note}>Платено от цел — не се брои в разходите за месеца.</Text>
      ) : (
        <>
          {/* The whole row toggles: a bigger target than the switch alone */}
          <Touch
            haptic={false}
            onPress={() => toggleCounts(!counts)}
            style={[s.card, s.switchCard]}
            accessibilityRole="switch"
            accessibilityState={{ checked: counts }}
            accessibilityLabel="Брои се в бюджета за месеца"
          >
            <Ionicons name="calculator-outline" size={18} color={colors.muted} />
            <Text style={s.switchLabel}>Брои се в месеца</Text>
            <View pointerEvents="none">
              <Switch value={counts} trackColor={{ true: colors.primary }} />
            </View>
          </Touch>
          <Text style={s.note}>
            {counts
              ? 'Изключи го, ако е платено с пари, които вече си имал — от друга сметка или стари спестявания.'
              : expense.goalId
                ? 'Пари, които вече си имал: пълнят целта, но не намаляват бюджета за месеца.'
                : 'Остава в историята, но не намалява бюджета и не влиза в отчетите.'}
          </Text>
        </>
      )}
      <View style={s.actions}>
        {onEdit && <Pill icon="create-outline" label="Редактирай" variant="ink" onPress={() => onEdit(expense)} />}
        <Pill
          icon="trash-outline"
          label="Изтрий"
          variant="outline"
          textStyle={{ color: colors.danger }}
          style={{ borderColor: colors.faint }}
          onPress={() => confirmDelete(expense, onDelete)}
        />
      </View>
    </View>
  );
}

export default function ExpenseDetailSheet({ expense, onClose, onDelete, onEdit }) {
  return (
    <Sheet visible={!!expense} onClose={onClose}>
      {expense && <ExpenseDetail expense={expense} onDelete={onDelete} onEdit={onEdit} />}
    </Sheet>
  );
}

const s = themed((colors) => ({
  head: { alignItems: 'center', gap: 6, marginBottom: 18 },
  cat: { color: colors.muted, fontSize: 14, fontWeight: '600', marginTop: 6 },
  card: { backgroundColor: colors.card, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  label: { color: colors.muted, fontSize: 14, width: 78 },
  value: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600', textAlign: 'right' },
  switchCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, marginTop: 10 },
  switchLabel: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
  note: { color: colors.muted, fontSize: 12.5, lineHeight: 17, marginTop: 8, paddingHorizontal: 6 },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 18 },
}));
