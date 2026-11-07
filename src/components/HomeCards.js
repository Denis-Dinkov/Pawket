import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './ui/AppText';
import Card from './ui/Card';
import IconBadge from './ui/IconBadge';
import Money from './ui/Money';
import Bar from './Bar';
import { colors, BUCKETS, categoryById, getCategories, money, pct } from '../theme';
import { sameDay, plural } from '../format';
import { dailyLimit, countsInBudget } from '../budget';
import { themed } from '../themed';
import { t } from '../i18n';


// "Today": how much was spent today against the 50/30/20 daily limit
export function TodayCard({ ov, now, pending = 0 }) {
  if (!ov.progress.isCurrent) {
    return (
      <Card>
        <Text style={s.h2}>{t('Днес')}</Text>
        <Text style={s.muted}>{t('Показва се само за текущия месец.')}</Text>
      </Card>
    );
  }
  // Needs and wants only, like the limit it's compared to (money put into savings isn't spending)
  const today = ov.list.filter(
    (e) => countsInBudget(e) && sameDay(e.date, now) && ['needs', 'wants'].includes(categoryById(e.categoryId)?.bucket)
  );
  const daily = dailyLimit(ov, now, pending);
  const limit = daily?.limit || 0;
  const over = !!daily?.over;
  return (
    <Card style={{ gap: 10 }}>
      <View style={s.head}>
        <Text style={s.h2}>{t('Днес')}</Text>
        <Text style={s.muted}>{plural(today.length, t('плащане'), t('плащания'))}</Text>
      </View>
      <View style={s.head}>
        <Money value={daily?.spentToday ?? today.reduce((a, e) => a + e.amount, 0)} size={28} />
        {daily && (
          <Text style={[s.limit, { color: over ? colors.danger : colors.savings }]}>
            {over ? t('лимитът падна на {0}', { 0: money(Math.round(limit * 100) / 100) }) : t('лимит {0} на ден', { 0: money(Math.round(limit * 100) / 100) })}
          </Text>
        )}
      </View>
      {daily ? (
        // Today's spending against this morning's limit (the limit itself moves with every expense)
        <Bar value={daily.morningLimit ? daily.spentToday / daily.morningLimit : 1} color={over ? colors.danger : colors.primary} height={8} label={t('Днес {0} от {1}', { 0: money(daily.spentToday), 1: money(daily.morningLimit) })} />
      ) : (
        <Text style={s.muted}>{t('Задай доход, за да видиш дневния си лимит.')}</Text>
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
      <Text style={s.h2}>{t('Топ категории')}</Text>
      {top.length === 0 && <Text style={s.muted}>{t('Още няма разходи този месец.')}</Text>}
      {top.map((c) => (
        <View key={c.id} style={s.cat}>
          <IconBadge icon={c.icon} color={BUCKETS[c.bucket].color} size={36} />
          <View style={{ flex: 1, gap: 5 }}>
            <View style={s.head}>
              <Text style={s.catName}>{c.name}</Text>
              <Text style={s.catValue}>{money(c.value)}</Text>
            </View>
            <Bar value={c.value / (top[0].value || 1)} color={c.shade} height={5} />
            <Text style={s.muted}>{t('{0} от разходите', { 0: pct(c.value / (ov.total || 1)) })}</Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

const s = themed((colors) => ({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h2: { color: colors.text, fontSize: 16, fontWeight: '700' },
  muted: { color: colors.muted, fontSize: 12.5 },
  limit: { fontSize: 13, fontWeight: '700' },
  cat: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catName: { color: colors.text, fontSize: 14.5, fontWeight: '600' },
  catValue: { color: colors.text, fontSize: 14.5, fontWeight: '700' },
}));
