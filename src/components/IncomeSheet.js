import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import Sheet from './ui/Sheet';
import IconBadge from './ui/IconBadge';
import Money from './ui/Money';
import Touch from './ui/Touch';
import { confirmDelete } from './ExpenseDetailSheet';
import { colors, radius, MONTHS, money, incomeKindById } from '../theme';
import { sortByDateDesc } from '../budget';
import { dayLabel } from '../format';

// Income for the month: the monthly income setting + recorded income entries
export default function IncomeSheet({ visible, onClose, info, year, month, onAdd, onDelete }) {
  if (!info) return null;
  const replaced = info.salary > info.base;
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={s.title}>
        Доходи · {MONTHS[month]} {year}
      </Text>
      <Money value={info.total} size={36} color={colors.savings} prefix="+" style={{ textAlign: 'center', marginTop: 6 }} />

      <View style={s.card}>
        <View style={s.row}>
          <IconBadge icon="calendar-outline" color={colors.needs} size={42} />
          <View style={{ flex: 1 }}>
            <Text style={s.name}>Месечен доход</Text>
            <Text style={s.sub}>{replaced ? 'заменен от записаната заплата' : 'от настройките'}</Text>
          </View>
          <Text style={[s.amount, replaced && s.struck]}>+{money(info.base)}</Text>
        </View>
        {sortByDateDesc(info.list).map((e) => {
          const k = incomeKindById(e.kind);
          return (
            <Touch
              key={e.id}
              style={[s.row, s.sep]}
              onLongPress={() => confirmDelete(e, () => onDelete(e.id), 'дохода')}
              onPress={() => confirmDelete(e, () => onDelete(e.id), 'дохода')}
            >
              <IconBadge icon={k.icon} color={colors.savings} size={42} />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{k.name}</Text>
                <Text style={s.sub} numberOfLines={1}>
                  {[e.note, dayLabel(e.date)].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Text style={[s.amount, { color: colors.savings }]}>+{money(e.amount)}</Text>
            </Touch>
          );
        })}
      </View>
      {info.list.length > 0 && <Text style={s.hint}>Натисни доход, за да го изтриеш.</Text>}

      <Touch style={s.add} onPress={onAdd}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={s.addText}>Добави доход</Text>
      </Touch>
    </Sheet>
  );
}

const s = StyleSheet.create({
  title: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 4, marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.faint },
  name: { color: colors.text, fontSize: 15, fontWeight: '600' },
  sub: { color: colors.muted, fontSize: 12.5, marginTop: 2 },
  amount: { color: colors.text, fontSize: 15, fontWeight: '700' },
  struck: { textDecorationLine: 'line-through', color: colors.muted },
  hint: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 8 },
  add: {
    flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.savings, borderRadius: radius.pill, paddingVertical: 15, marginTop: 18,
  },
  addText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
