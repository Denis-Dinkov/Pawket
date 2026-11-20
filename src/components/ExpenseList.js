import React, { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from './ui/AppText';
import ExpenseRow from './ExpenseRow';
import Pill from './ui/Pill';
import { colors, BUCKETS, getCategories, categoryById, money, radius } from '../theme';
import { sortByDateDesc, countsInBudget } from '../budget';
import { dayLabel, plural } from '../format';
import { themed } from '../themed';
import { t } from '../i18n';

const matches = (filter, e) => {
  if (filter === 'all') return true;
  const [kind, id] = filter.split(':');
  return kind === 'cat' ? e.categoryId === id : categoryById(e.categoryId)?.bucket === id;
};

// The month's expenses grouped by day, with filters by bucket/category. limit: show only the newest that many
// (Home's "Последни"); a day's heading still counts and adds up the whole day.
export default function ExpenseList({ expenses, onSelect, onLongPress, initialFilter = 'all', showFilters = true, limit = Infinity }) {
  const [filter, setFilter] = useState(initialFilter);

  const usedCats = useMemo(
    () => getCategories(true).filter((c) => expenses.some((e) => e.categoryId === c.id)),
    [expenses]
  );

  const groups = useMemo(() => {
    const map = new Map();
    for (const e of sortByDateDesc(expenses.filter((x) => matches(filter, x)))) {
      const key = new Date(e.date).toDateString();
      if (!map.has(key)) map.set(key, { title: dayLabel(e.date), total: 0, items: [] });
      const g = map.get(key);
      g.items.push(e);
      if (countsInBudget(e)) g.total += e.amount;
    }
    let left = limit;
    const out = [];
    for (const g of map.values()) {
      if (left <= 0) break;
      out.push({ ...g, shown: g.items.slice(0, left) });
      left -= g.items.length;
    }
    return out;
  }, [expenses, filter, limit]);

  const chips = [
    { key: 'all', label: t('Всички') },
    ...Object.entries(BUCKETS).map(([k, b]) => ({ key: `bucket:${k}`, label: b.label })),
    ...usedCats.map((c) => ({ key: `cat:${c.id}`, label: c.name })),
  ];

  return (
    <View>
      {showFilters && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={s.chipsWrap}>
          {chips.map((c) => (
            <Pill
              haptic="select"
              key={c.key}
              small
              label={c.label}
              variant={filter === c.key ? 'active' : 'outline'}
              onPress={() => setFilter(c.key)}
            />
          ))}
        </ScrollView>
      )}

      {groups.length === 0 && <Text style={s.empty}>{t('Няма разходи за този избор.')}</Text>}

      {groups.map((g) => (
        <View key={g.title} style={s.group}>
          <View style={s.groupHead}>
            <Text style={s.groupTitle}>
              {g.title} <Text style={s.groupCount}>· {plural(g.items.length, t('плащане'), t('плащания'))}</Text>
            </Text>
            <Text style={s.groupTotal}>−{money(g.total)}</Text>
          </View>
          <View style={s.card}>
            {g.shown.map((e, i) => (
              <View key={e.id} style={i > 0 && s.sep}>
                <ExpenseRow expense={e} detailed onPress={() => onSelect?.(e)} onLongPress={() => onLongPress?.(e)} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const s = themed((colors) => ({
  chipsWrap: { marginHorizontal: -16, marginBottom: 4 },
  chips: { gap: 8, paddingHorizontal: 16, paddingVertical: 4 },
  empty: { color: colors.muted, textAlign: 'center', marginVertical: 28 },
  group: { marginTop: 16 },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, paddingHorizontal: 4 },
  groupTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  groupCount: { color: colors.muted, fontWeight: '500' },
  groupTotal: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 4, borderWidth: 1, borderColor: colors.faint },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.faint },
}));
