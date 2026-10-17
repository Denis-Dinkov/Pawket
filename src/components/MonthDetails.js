import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './ui/AppText';
import Card from './ui/Card';
import IconBadge from './ui/IconBadge';
import Touch from './ui/Touch';
import { colors, BUCKETS, categoryById, money, moneyShort, pct, MONTHS } from '../theme';
import { dayLabel, plural } from '../format';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

// Calculations for the month details
export function useMonthStats(ov, prevTotal, year, month) {
  return useMemo(() => {
    const { daysInMonth, daysLeft, isCurrent, isPast } = ov.progress;
    const elapsed = isPast ? daysInMonth : isCurrent ? daysInMonth - daysLeft + 1 : 0;
    const byDay = Array.from({ length: daysInMonth }, () => ({ total: 0, count: 0 }));
    const byWeekday = Array.from({ length: 7 }, () => 0);
    const merchants = {};
    let biggest = null;
    for (const e of ov.list) {
      const d = new Date(e.date);
      const day = byDay[d.getDate() - 1];
      day.total += e.amount;
      day.count += 1;
      byWeekday[(d.getDay() + 6) % 7] += e.amount; // Monday = 0
      if (!biggest || e.amount > biggest.amount) biggest = e;
      const m = (e.merchant || '').trim();
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
      avgPerDay: elapsed ? ov.total / elapsed : 0,
      merchants: Object.values(merchants).sort((a, b) => b.total - a.total).slice(0, 5),
      vsPrev: prevTotal ? ov.total / prevTotal - 1 : null,
    };
  }, [ov, prevTotal, year, month]);
}

function Tile({ icon, color, label, value, sub }) {
  return (
    <View style={s.tile}>
      <IconBadge icon={icon} color={color} size={34} />
      <Text style={s.tileLabel}>{label}</Text>
      <Text style={s.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {!!sub && (
        <Text style={s.tileSub} numberOfLines={1}>
          {sub}
        </Text>
      )}
    </View>
  );
}

// "Month at a glance": tiles with the key numbers
export function MonthSummary({ ov, stats, month }) {
  const saved = ov.income - ov.total;
  const prevName = MONTHS[(month + 11) % 12].toLowerCase();
  const big = stats.biggest;
  return (
    <View style={s.tiles}>
      <Tile icon="receipt-outline" color={colors.primary} label="Плащания" value={String(ov.list.length)} sub={`за ${plural(stats.elapsed, 'ден', 'дни')}`} />
      <Tile icon="pulse-outline" color={colors.needs} label="Средно на ден" value={money(stats.avgPerDay)} sub="всички разходи" />
      <Tile
        icon="flame-outline"
        color={colors.wants}
        label="Най-скъп ден"
        value={stats.topDay ? money(stats.topDay.total) : '—'}
        sub={stats.topDay ? `${dayLabel(stats.topDay.date)} · ${plural(stats.topDay.count, 'плащане', 'плащания')}` : ''}
      />
      <Tile
        icon={big ? categoryById(big.categoryId)?.icon || 'card' : 'card'}
        color={colors.danger}
        label="Най-голямо плащане"
        value={big ? money(big.amount) : '—'}
        sub={big ? big.merchant || categoryById(big.categoryId)?.name : ''}
      />
      <Tile
        icon="wallet"
        color={colors.savings}
        label={saved >= 0 ? (ov.progress.isCurrent ? 'Остават' : 'Спестено') : 'Над дохода'}
        value={ov.income ? money(Math.abs(saved)) : '—'}
        sub={ov.income ? `${pct(Math.abs(saved) / ov.income)} от дохода` : 'няма доход'}
      />
      <Tile
        icon={stats.vsPrev != null && stats.vsPrev > 0 ? 'trending-up' : 'trending-down'}
        color={stats.vsPrev != null && stats.vsPrev > 0 ? colors.danger : colors.savings}
        label={`Спрямо ${prevName}`}
        value={stats.vsPrev == null ? '—' : `${stats.vsPrev > 0 ? '+' : '−'}${pct(Math.abs(stats.vsPrev))}`}
        sub={ov.progress.isCurrent ? 'до момента' : 'за целия месец'}
      />
      <Tile icon="leaf" color={colors.savings} label="Дни без разходи" value={String(stats.noSpendDays)} sub={`от ${stats.elapsed}`} />
      <Tile
        icon="cash-outline"
        color={colors.needs}
        label="Доходи"
        value={money(ov.income)}
        sub={ov.incomeInfo.list.length ? `+ ${plural(ov.incomeInfo.list.length, 'запис', 'записа')}` : 'месечен доход'}
      />
    </View>
  );
}

// Spending per day — tap a bar for details
export function DailyChart({ ov, stats, year, month }) {
  const [sel, setSel] = useState(null);
  const max = Math.max(...stats.byDay.map((d) => d.total), 1);
  // Average daily budget for needs and wants under 50/30/20
  const dailyBudget = ov.income ? (0.8 * ov.income) / ov.progress.daysInMonth : 0;
  const lineAt = dailyBudget && dailyBudget < max ? dailyBudget / max : null;
  const today = ov.progress.isCurrent ? ov.progress.daysInMonth - ov.progress.daysLeft : -1;
  const picked = sel != null ? stats.byDay[sel] : null;
  return (
    <Card>
      <Text style={s.caption}>
        {picked
          ? `${dayLabel(new Date(year, month, sel + 1))}: ${money(picked.total)} · ${plural(picked.count, 'плащане', 'плащания')}`
          : 'Натисни ден за детайли'}
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
      {lineAt != null && <Text style={s.legend}>— — дневен бюджет по 50/30/20 ≈ {money(dailyBudget)}</Text>}
    </Card>
  );
}

// Spending by day of the week
export function WeekdayChart({ stats }) {
  const max = Math.max(...stats.byWeekday, 1);
  const top = stats.byWeekday.indexOf(Math.max(...stats.byWeekday));
  return (
    <Card>
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
        <Text style={s.legend}>Най-много харчиш в {['понеделник', 'вторник', 'сряда', 'четвъртък', 'петък', 'събота', 'неделя'][top]}.</Text>
      )}
    </Card>
  );
}

// Where the money goes: the most expensive merchants
export function TopMerchants({ stats, total }) {
  if (!stats.merchants.length) {
    return (
      <Card>
        <Text style={s.legend}>Добавяй „Къде?“ при разходите, за да видиш най-скъпите си магазини.</Text>
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
                {plural(m.count, 'плащане', 'плащания')} · средно {money(m.total / m.count)}
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

const s = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48.4%', flexGrow: 1, backgroundColor: colors.card, borderRadius: 20, padding: 14, gap: 3 },
  tileLabel: { color: colors.muted, fontSize: 12, marginTop: 6 },
  tileValue: { color: colors.text, fontSize: 18, fontWeight: '800' },
  tileSub: { color: colors.muted, fontSize: 11.5 },
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
  weekValue: { color: colors.muted, fontSize: 9.5, height: 12 },
  weekTrack: { flex: 1, width: '70%', justifyContent: 'flex-end', backgroundColor: colors.bg, borderRadius: 6, overflow: 'hidden' },
  weekBar: { width: '100%', borderRadius: 6 },
  weekDay: { color: colors.text, fontSize: 12, fontWeight: '700' },
  merchant: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.faint },
  rank: { color: colors.muted, fontSize: 13, fontWeight: '800', width: 14, textAlign: 'center' },
  mName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  mSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  mTotal: { color: colors.text, fontSize: 15, fontWeight: '700' },
});
