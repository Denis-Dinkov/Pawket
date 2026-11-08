import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import IconBadge from './ui/IconBadge';
import { colors, categoryById, BUCKETS, money } from '../theme';
import { dayLabel, timeLabel, SOURCES } from '../format';
import Touch from './ui/Touch';
import { themed } from '../themed';
import { t } from '../i18n';

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
  const deposit = !!expense.goalId;
  // Paid with money the user already had: listed, but not counted in the month
  const outside = !!expense.offBudget || !!expense.fromGoalId;
  // Booked by the Apple Pay automation while the app was closed, and not looked at yet
  const fresh = !!expense.unreviewed;
  const needsCategory = fresh && !cat;
  // Same amount as another expense in the same day: the user decides whether it's the same payment
  const dupe = !!expense.possibleDuplicate;

  return (
    <Touch
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [s.row, fresh && s.fresh, dupe && s.dupe, pressed && { opacity: 0.6 }]}
      accessibilityLabel={`${dupe ? t('Може би дубликат, ') : fresh ? t('Ново от Apple Pay, ') : ''}${cat?.name || t('Без категория')}, ${money(expense.amount)}${deposit ? t(' заделени') : ''}${outside ? t(', не се брои в месеца') : ''}${where ? `, ${where}` : ''}${what ? `, ${what}` : ''}, ${dayLabel(expense.date)}`}
      accessibilityHint={t('Отваря подробности. Задръж, за да изтриеш.')}
    >
      <IconBadge icon={cat?.icon || 'help'} color={color} size={44} />
      <View style={{ flex: 1 }}>
        <View style={s.nameLine}>
          <Text style={[s.name, { flexShrink: 1 }]} numberOfLines={1}>{needsCategory ? t('Избери категория') : cat?.name || t('Без категория')}</Text>
          {dupe ? (
            <View style={[s.badge, s.dupeBadge]}>
              <Text style={s.badgeText}>{t('ДУБЛИКАТ?')}</Text>
            </View>
          ) : fresh ? (
            <View style={s.badge}>
              <Text style={s.badgeText}>{t('НОВО')}</Text>
            </View>
          ) : null}
        </View>
        <Text style={s.sub} numberOfLines={1}>{subtitle}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[s.amount, deposit && { color: colors.savings }, outside && { color: colors.muted }]}>{deposit ? '' : '−'}{money(expense.amount)}</Text>
        <View style={s.meta}>
          {expense.source !== 'manual' && <Ionicons name={source.icon} size={12} color={colors.muted} />}
          <Text style={s.metaText}>
            {outside ? t('извън месеца') : detailed ? timeLabel(expense.date) : where || what ? dayLabel(expense.date) : ''}
          </Text>
        </View>
      </View>
    </Touch>
  );
}

const s = themed((colors) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  // The same padding comes off the margin, so a highlighted row lines up with the others
  fresh: { backgroundColor: colors.primarySoft, borderRadius: 16, marginHorizontal: -10, paddingHorizontal: 10 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.text, fontSize: 15, fontWeight: '600' },
  badge: { backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  dupe: { backgroundColor: colors.dangerSoft, borderRadius: 16, marginHorizontal: -10, paddingHorizontal: 10 },
  dupeBadge: { backgroundColor: colors.danger },
  badgeText: { color: '#fff', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4 },
  sub: { color: colors.muted, fontSize: 12.5, marginTop: 2 },
  amount: { color: colors.text, fontSize: 15, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  metaText: { color: colors.muted, fontSize: 11.5 },
}));
