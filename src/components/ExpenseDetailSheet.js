import React, { useEffect, useState } from 'react';
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
import { t } from '../i18n';

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
  const { updateExpense, markReviewed } = useStore();
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
  // Booked automatically after Apple Pay: opening it is the check, unless it still needs a category
  const auto = !!expense.unreviewed;
  useEffect(() => {
    if (auto && cat) markReviewed(expense.id);
  }, [auto, !!cat, expense.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View>
      {onBack && <Pill small icon="chevron-back" label={t('Назад')} variant="outline" onPress={onBack} />}
      <View style={s.head}>
        <IconBadge icon={cat?.icon || 'help'} color={bucket?.color || colors.muted} size={64} />
        <Text style={s.cat}>{cat?.name || t('Без категория')}</Text>
        <Money value={expense.goalId ? expense.amount : -expense.amount} size={38} color={expense.goalId ? colors.savings : colors.text} />
        {bucket && <Pill small variant="soft" label={bucket.label} style={{ alignSelf: 'center', marginTop: 8 }} />}
      </View>
      <View style={s.card}>
        <Row icon="storefront-outline" label={t('Къде')} value={expense.merchant || '—'} />
        <Row icon="document-text-outline" label={t('За какво')} value={expense.note || cat?.name} />
        <Row icon="calendar-outline" label={t('Кога')} value={`${dayLabel(expense.date)}, ${timeLabel(expense.date)}`} />
        <Row icon={source.icon} label={t('Плащане')} value={source.label} />
      </View>
      {auto && (
        <Text style={[s.note, { marginBottom: 2 }]}>
          {cat
            ? t('Записано автоматично след Apple Pay. Категорията е по магазина — смени я с „Редактирай“, ако не е вярна.')
            : t('Записано автоматично след Apple Pay. Не познавам този магазин — избери категория с „Редактирай“ и ще я помня.')}
        </Text>
      )}
      {/* A payment out of a goal is never counted in the month, so there's nothing to switch */}
      {expense.fromGoalId ? (
        <Text style={s.note}>{t('Платено от цел — не се брои в разходите за месеца.')}</Text>
      ) : (
        <>
          {/* The whole row toggles: a bigger target than the switch alone */}
          <Touch
            haptic={false}
            onPress={() => toggleCounts(!counts)}
            style={[s.card, s.switchCard]}
            accessibilityRole="switch"
            accessibilityState={{ checked: counts }}
            accessibilityLabel={t('Брои се в бюджета за месеца')}
          >
            <Ionicons name="calculator-outline" size={18} color={colors.muted} />
            <Text style={s.switchLabel}>{t('Брои се в месеца')}</Text>
            <View pointerEvents="none">
              <Switch value={counts} trackColor={{ true: colors.primary }} />
            </View>
          </Touch>
          <Text style={s.note}>
            {counts
              ? t('Изключи го, ако е платено с пари, които вече имаш настрана — от друга сметка или стари спестявания.')
              : expense.goalId
                ? t('Пари, които вече имаш настрана: пълнят целта, но не намаляват бюджета за месеца.')
                : t('Остава в историята, но не намалява бюджета и не влиза в отчетите.')}
          </Text>
        </>
      )}
      <View style={s.actions}>
        {onEdit && <Pill icon="create-outline" label={t('Редактирай')} variant="ink" onPress={() => onEdit(expense)} />}
        <Pill
          icon="trash-outline"
          label={t('Изтрий')}
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
