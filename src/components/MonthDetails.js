import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './ui/AppText';
import Card from './ui/Card';
import IconBadge from './ui/IconBadge';
import Touch from './ui/Touch';
import Segmented from './ui/Segmented';
import { colors, BUCKETS, categoryById, money, moneyShort, pct } from '../theme';
import { dayLabel, plural } from '../format';
import { countsInBudget } from '../budget';
import { themed } from '../themed';
import { t, tList } from '../i18n';

const WEEKDAYS = tList(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']);
// Fixed monthly costs: left out of the day-to-day average, or one rent payment makes it meaningless
const FIXED = new Set(['rent', 'bills', 'subscriptions']);
const isDayToDay = (e) =>
  countsInBudget(e) && !e.goalId && e.source !== 'recurring' && !FIXED.has(e.categoryId) && categoryById(e.categoryId)?.bucket !== 'savings';

// Calculations for the month details
export function useMonthStats(ov, prevTotal, year, month) {
  return useMemo(() => {
    const { daysInMonth, daysLeft, isCurrent, isPast } = ov.progress;
    const elapsed = isPast ? daysInMonth : isCurrent ? daysInMonth - daysLeft + 1 : 0;
    const byDay = Array.from({ length: daysInMonth }, () => ({ total: 0, count: 0 }));
    const byWeekday = Array.from({ length: 7 }, () => 0);
    const merchants = {};
    let biggest = null;
    let dayToDay = 0;
    for (const e of ov.list) {
      if (!countsInBudget(e)) continue;
      if (isDayToDay(e)) dayToDay += e.amount;
      const d = new Date(e.date);
      const day = byDay[d.getDate() - 1];
      day.total += e.amount;
      day.count += 1;
      byWeekday[(d.getDay() + 6) % 7] += e.amount; // Monday = 0
      if (!biggest || e.amount > biggest.amount) biggest = e;
      // Shops only: rent, bills and savings aren't "where you shop"
      const m = isDayToDay(e) ? (e.merchant || '').trim() : '';
      if (m) {
        const k = m.toLowerCase();
        (merchants[k] ||= { name: m, total: 0, count: 0, categoryId: e.categoryId });
        merchants[k].total += e.amount;
        merchants[k].count += 1;
      }
    }
    const topDayIndex = byDay.reduce((best, d, i) => (d.total > (byDay[best]?.total || 0) ? i : best), -1);
    return {
      elapsed,
      byDay,
      byWeekday,
      biggest,
      topDay: topDayIndex >= 0 && byDay[topDayIndex].total > 0 ? { date: new Date(year, month, topDayIndex + 1), ...byDay[topDayIndex] } : null,
      noSpendDays: byDay.slice(0, elapsed).filter((d) => d.count === 0).length,
      avgPerDay: elapsed ? dayToDay / elapsed : 0,
      merchants: Object.values(merchants).sort((a, b) => b.total - a.total).slice(0, 3),
      vsPrev: prevTotal ? ov.total / prevTotal - 1 : null,
    };
  }, [ov, prevTotal, year, month]);
}

// One card for how the month is spent: a Days / Week toggle over the bars, then the two numbers that matter
export function SpendingChart({ ov, stats, year, month }) {
  const [mode, setMode] = useState('days');
  return (
    <Card style={{ gap: 12 }}>
      <Segmented
        options={[
          { key: 'days', label: t('По дни') },
          { key: 'week', label: t('По седмица') },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === 'days' ? <DailyBars ov={ov} stats={stats} year={year} month={month} /> : <WeekdayBars stats={stats} />}
      <View style={s.pair}>
        <View style={s.stat} accessible accessibilityLabel={t('Средно на ден {0}, без наем, сметки и спестявания', { 0: money(stats.avgPerDay) })}>
          <Text style={s.statLabel}>{t('Средно на ден')}</Text>
          <Text style={s.statValue}>{money(stats.avgPerDay)}</Text>
          <Text style={s.statSub}>{t('без наем, сметки и спестявания')}</Text>
        </View>
        <View style={s.stat} accessible accessibilityLabel={t('Дни без разходи: {0} от {1}', { 0: stats.noSpendDays, 1: stats.elapsed })}>
          <Text style={s.statLabel}>{t('Дни без разходи')}</Text>
          <Text style={s.statValue}>
            {stats.noSpendDays} <Text style={s.statOf}>{t('от {0}', { 0: stats.elapsed })}</Text>
          </Text>
        </View>
      </View>
    </Card>
  );
}

// Spending per day — tap a bar for details
function DailyBars({ ov, stats, year, month }) {
  const [sel, setSel] = useState(null);
  const max = Math.max(...stats.byDay.map((d) => d.total), 1);
  // Average daily budget for needs and wants under 50/30/20
  const dailyBudget = ov.income ? (0.8 * ov.income) / ov.progress.daysInMonth : 0;
  const lineAt = dailyBudget && dailyBudget < max ? dailyBudget / max : null;
  const today = ov.progress.isCurrent ? ov.progress.daysInMonth - ov.progress.daysLeft : -1;
  const picked = sel != null ? stats.byDay[sel] : null;
  return (
    <View>
      <Text style={s.caption}>
        {picked
          ? `${dayLabel(new Date(year, month, sel + 1))}: ${money(picked.total)} · ${plural(picked.count, t('плащане'), t('плащания'))}`
          : t('Натисни ден за детайли')}
      </Text>
      <View style={s.chart}>
        {lineAt != null && <View style={[s.line, { bottom: `${lineAt * 100}%` }]} />}
        {stats.byDay.map((d, i) => (
          <Touch key={i} haptic="select" style={s.barSlot} onPress={() => setSel(sel === i ? null : i)}>
            <View
              style={[
                s.bar,
                {
                  height: `${Math.max(d.total ? 4 : 1.5, (d.total / max) * 100)}%`,
                  backgroundColor: sel === i ? colors.ink : i === today ? colors.wants : d.total ? colors.primary : colors.faint,
                },
              ]}
            />
          </Touch>
        ))}
      </View>
      <View style={s.axis}>
        <Text style={s.axisText}>1</Text>
        <Text style={s.axisText}>15</Text>
        <Text style={s.axisText}>{ov.progress.daysInMonth}</Text>
      </View>
      {lineAt != null && <Text style={s.legend}>{t('— — дневен бюджет по 50/30/20 ≈ {0}', { 0: money(dailyBudget) })}</Text>}
    </View>
  );
}

// Spending by day of the week
function WeekdayBars({ stats }) {
  const max = Math.max(...stats.byWeekday, 1);
  const top = stats.byWeekday.indexOf(Math.max(...stats.byWeekday));
  return (
    <View>
      <View style={s.week}>
        {stats.byWeekday.map((v, i) => (
          <View key={i} style={s.weekCol}>
            <Text style={s.weekValue} numberOfLines={1}>
              {v ? moneyShort(v) : ''}
            </Text>
            <View style={s.weekTrack}>
              <View style={[s.weekBar, { height: `${(v / max) * 100}%`, backgroundColor: i === top && v ? colors.wants : colors.primary }]} />
            </View>
            <Text style={[s.weekDay, i >= 5 && { color: colors.wants }]}>{WEEKDAYS[i]}</Text>
          </View>
        ))}
      </View>
      {Math.max(...stats.byWeekday) > 0 && (
        <Text style={s.legend}>{t('Най-много харчиш в {0}.', { 0: [t('понеделник'), t('вторник'), t('сряда'), t('четвъртък'), t('петък'), t('събота'), t('неделя')][top] })}</Text>
      )}
    </View>
  );
}

// Where the money goes: the most expensive merchants
export function TopMerchants({ stats, total }) {
  if (!stats.merchants.length) {
    return (
      <Card>
        <Text style={s.legend}>{t('Добавяй „Къде?“ при разходите, за да видиш най-скъпите си магазини.')}</Text>
      </Card>
    );
  }
  return (
    <Card style={{ paddingVertical: 6 }}>
      {stats.merchants.map((m, i) => {
        const cat = categoryById(m.categoryId);
        return (
          <View key={m.name} style={[s.merchant, i > 0 && s.sep]}>
            <Text style={s.rank}>{i + 1}</Text>
            <IconBadge icon={cat?.icon || 'storefront'} color={BUCKETS[cat?.bucket]?.color || colors.muted} size={38} />
            <View style={{ flex: 1 }}>
              <Text style={s.mName} numberOfLines={1}>
                {m.name}
              </Text>
              <Text style={s.mSub}>
                {t('{0} · средно {1}', { 0: plural(m.count, t('плащане'), t('плащания')), 1: money(m.total / m.count) })}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.mTotal}>{money(m.total)}</Text>
              <Text style={s.mSub}>{pct(m.total / (total || 1))}</Text>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const s = themed((colors) => ({
  pair: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: colors.bg, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  statLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statSub: { color: colors.muted, fontSize: 11 },
  statOf: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  caption: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 10 },
  chart: { height: 120, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3 },
  line: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.savings },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  axisText: { color: colors.muted, fontSize: 11 },
  legend: { color: colors.muted, fontSize: 12, marginTop: 8 },
  week: { flexDirection: 'row', gap: 8, height: 140 },
  weekCol: { flex: 1, alignItems: 'center', gap: 4 },
  weekValue: { color: colors.muted, fontSize: 11, height: 12 },
  weekTrack: { flex: 1, width: '70%', justifyContent: 'flex-end', backgroundColor: colors.bg, borderRadius: 6, overflow: 'hidden' },
  weekBar: { width: '100%', borderRadius: 6 },
  weekDay: { color: colors.text, fontSize: 12, fontWeight: '700' },
  merchant: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.faint },
  rank: { color: colors.muted, fontSize: 13, fontWeight: '800', width: 14, textAlign: 'center' },
  mName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  mSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  mTotal: { color: colors.text, fontSize: 15, fontWeight: '700' },
}));
