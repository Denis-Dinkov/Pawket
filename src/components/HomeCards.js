import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './ui/AppText';
import Card from './ui/Card';
import IconBadge from './ui/IconBadge';
import Money from './ui/Money';
import Bar from './Bar';
import { colors, BUCKETS, categoryById, getCategories, money, pct } from '../theme';
import { sameDay, plural } from '../format';

const isSpend = (e) => ['needs', 'wants'].includes(categoryById(e.categoryId)?.bucket);

// "Today": how much was spent today against the 50/30/20 daily limit
export function TodayCard({ ov, now }) {
  if (!ov.progress.isCurrent) {
    return (
      <Card>
        <Text style={s.h2}>Днес</Text>
        <Text style={s.muted}>Показва се само за текущия месец.</Text>
      </Card>
    );
  }
  const today = ov.list.filter((e) => sameDay(e.date, now));
  const spent = today.reduce((a, e) => a + e.amount, 0);
  const spentNW = today.filter(isSpend).reduce((a, e) => a + e.amount, 0);
  // The limit is computed as of the start of the day, so it doesn't change with every expense
  const startSpendable = 0.8 * ov.income - ov.byBucket.needs - ov.byBucket.wants + spentNW;
  const limit = ov.income && ov.progress.daysLeft ? Math.max(0, startSpendable) / ov.progress.daysLeft : 0;
  const over = limit > 0 && spentNW > limit;
  return (
    <Card style={{ gap: 10 }}>
      <View style={s.head}>
        <Text style={s.h2}>Днес</Text>
        <Text style={s.muted}>{plural(today.length, 'плащане', 'плащания')}</Text>
      </View>
      <View style={s.head}>
        <Money value={spent} size={28} />
        {limit > 0 && (
          <Text style={[s.limit, { color: over ? colors.danger : colors.savings }]}>
            {over ? `над лимита с ${money(spentNW - limit)}` : `остават ${money(limit - spentNW)}`}
          </Text>
        )}
      </View>
      {limit > 0 ? (
        <>
          <Bar value={spentNW / limit} color={over ? colors.danger : colors.primary} height={8} />
          <Text style={s.muted}>Дневен лимит ≈ {money(limit)} за нужди и желания</Text>
        </>
      ) : (
        <Text style={s.muted}>Задай доход, за да видиш дневния си лимит.</Text>
      )}
    </Card>
  );
}

// "Top categories": the three categories with the most spending this month
export function TopCategoriesCard({ ov }) {
  const top = getCategories(true)
    .filter((c) => ov.byCategory[c.id])
    .map((c) => ({ ...c, value: ov.byCategory[c.id] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
  return (
    <Card style={{ gap: 12 }}>
      <Text style={s.h2}>Топ категории</Text>
      {top.length === 0 && <Text style={s.muted}>Още няма разходи този месец.</Text>}
      {top.map((c) => (
        <View key={c.id} style={s.cat}>
          <IconBadge icon={c.icon} color={BUCKETS[c.bucket].color} size={36} />
          <View style={{ flex: 1, gap: 5 }}>
            <View style={s.head}>
              <Text style={s.catName}>{c.name}</Text>
              <Text style={s.catValue}>{money(c.value)}</Text>
            </View>
            <Bar value={c.value / (top[0].value || 1)} color={c.shade} height={5} />
            <Text style={s.muted}>{pct(c.value / (ov.total || 1))} от разходите</Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h2: { color: colors.text, fontSize: 16, fontWeight: '700' },
  muted: { color: colors.muted, fontSize: 12.5 },
  limit: { fontSize: 13, fontWeight: '700' },
  cat: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catName: { color: colors.text, fontSize: 14.5, fontWeight: '600' },
  catValue: { color: colors.text, fontSize: 14.5, fontWeight: '700' },
});
