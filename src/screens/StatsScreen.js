import React, { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from '../components/ui/AppText';
import { useStore } from '../store';
import { colors, BUCKETS, getCategories, MONTHS, money, pct, radius } from '../theme';
import { monthOverview, filterMonth, summarize, shiftMonth } from '../budget';
import { getAdvice } from '../pet/advice';
import useNow from '../hooks/useNow';
import GradientHero from '../components/ui/GradientHero';
import Card from '../components/ui/Card';
import IconBadge from '../components/ui/IconBadge';
import Sheet from '../components/ui/Sheet';
import Bar from '../components/Bar';
import DonutChart from '../components/DonutChart';
import MonthPill from '../components/MonthPill';
import MonthPickerSheet from '../components/MonthPickerSheet';
import ExpenseList from '../components/ExpenseList';
import { ExpenseDetail, confirmDelete } from '../components/ExpenseDetailSheet';
import { AdviceCard } from '../components/AdviceSheet';
import { useMonthStats, MonthSummary, DailyChart, WeekdayChart, TopMerchants } from '../components/MonthDetails';
import StatsHero from '../components/StatsHero';
import ScoreSheet from '../components/ScoreSheet';
import useStatusScrim from '../hooks/useStatusScrim';
import Touch from '../components/ui/Touch';

function verdict(bucket, actual, target) {
  if (bucket === 'savings') {
    if (actual >= target) return { text: 'Над целта — отлично', color: colors.savings };
    return { text: `Още ${money(target - actual)} до целта`, color: colors.warning };
  }
  if (actual <= target) return { text: `Свободни ${money(target - actual)}`, color: colors.savings };
  return { text: `Превишено с ${money(actual - target)}`, color: colors.danger };
}

const scoreColor = (score) => (score >= 85 ? colors.savings : score >= 60 ? colors.warning : colors.danger);

export default function StatsScreen({ year, month, onMonthChange }) {
  const { expenses, incomes, incomeEntries, pet, removeExpense } = useStore();
  const now = useNow();
  const scrim = useStatusScrim();
  const [picker, setPicker] = useState(false);
  const [category, setCategory] = useState(null);
  const [selected, setSelected] = useState(null);
  const [scoreOpen, setScoreOpen] = useState(false);

  const ov = useMemo(() => monthOverview({ expenses, incomes, incomeEntries, year, month, now }), [expenses, incomes, incomeEntries, year, month, now]);
  const prevYM = shiftMonth(year, month, -1);
  const prev = useMemo(
    () => summarize(filterMonth(expenses, prevYM.year, prevYM.month)),
    [expenses, prevYM.year, prevYM.month]
  );
  const advice = useMemo(
    () => getAdvice({ expenses, incomes, incomeEntries, year, month, now, lastFedAt: pet?.lastFedAt }),
    [expenses, incomes, incomeEntries, year, month, now, pet?.lastFedAt]
  );

  const stats = useMonthStats(ov, prev.total, year, month);

  const { income, total, byBucket, byCategory, progress } = ov;
  // At the end of the month the unspent income counts as savings
  const leftover = progress.isPast ? Math.max(0, income - total) : 0;
  const effective = { ...byBucket, savings: byBucket.savings + leftover };

  const cats = getCategories(true).filter((c) => byCategory[c.id])
    .map((c) => ({ ...c, value: byCategory[c.id], before: prev.byCategory[c.id] || 0 }))
    .sort((a, b) => b.value - a.value);
  const maxCat = cats[0]?.value || 1;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false} onScroll={scrim.onScroll} scrollEventThrottle={32}>
        <View style={s.overscroll} />
        <GradientHero bottomSpace={56}>
          <Text style={s.title}>Статистика</Text>
          <View style={{ marginTop: 14 }}>
            <MonthPill year={year} month={month} onChange={onMonthChange} onOpenPicker={() => setPicker(true)} />
          </View>
          <StatsHero ov={ov} month={month} onOpenScore={() => setScoreOpen(true)} />
        </GradientHero>

        <View style={s.sheet} onLayout={scrim.onSheetLayout}>
          {/* Donut: the whole ring is everything spent, each slice is a category; the rows below use the same colors */}
          <Text style={[s.section, { marginTop: 4 }]}>Къде отидоха парите</Text>
          <Card style={{ alignItems: 'center' }}>
            {cats.length === 0 ? (
              <Text style={s.hint}>Няма разходи за {MONTHS[month].toLowerCase()}.</Text>
            ) : (
              <>
                <DonutChart segments={cats.map((c) => ({ key: c.id, value: c.value, color: c.shade }))} total={total} label="похарчени" />
                <Text style={s.donutHint}>
                  {cats.length === 1
                    ? `Целият кръг е ${cats[0].name.toLowerCase()} — засега всички разходи за ${MONTHS[month].toLowerCase()} са в тази категория.`
                    : `Целият кръг са всички разходи за ${MONTHS[month].toLowerCase()}. Всяко цветно парче е категория — колкото е по-голямо, толкова повече пари са отишли там.`}
                </Text>
              </>
            )}
          </Card>
          {cats.length > 0 && (
            <>
              <Card style={{ paddingVertical: 6, marginTop: 10 }}>
                {cats.map((c, i) => {
                  const delta = c.before ? c.value / c.before - 1 : null;
                  const bucketColor = BUCKETS[c.bucket].color;
                  return (
                    <Touch key={c.id} onPress={() => setCategory(c)} style={[s.catRow, i > 0 && s.sep]}>
                      <IconBadge icon={c.icon} color={bucketColor} size={42} />
                      <View style={{ flex: 1, gap: 6 }}>
                        <View style={s.catHead}>
                          <Text style={s.catName}>{c.name}</Text>
                          <Text style={s.catValue}>{money(c.value)}</Text>
                        </View>
                        <Bar value={c.value / maxCat} color={c.shade} height={6} />
                        <View style={s.catHead}>
                          <Text style={s.small}>{pct(c.value / (total || 1))} от общо</Text>
                          {delta != null && Math.abs(delta) >= 0.01 && (
                            <Text style={[s.delta, { color: delta > 0 ? colors.danger : colors.savings, backgroundColor: delta > 0 ? '#FDE7EB' : '#E3F7EF' }]}>
                              {delta > 0 ? '+' : '−'}
                              {pct(Math.abs(delta))} спрямо {MONTHS[prevYM.month].toLowerCase()}
                            </Text>
                          )}
                        </View>
                      </View>
                    </Touch>
                  );
                })}
              </Card>
              <Text style={s.listHint}>Натисни категория, за да видиш разходите в нея.</Text>
            </>
          )}

          <Text style={s.section}>Месецът накратко</Text>
          <MonthSummary ov={ov} stats={stats} month={month} />


          {ov.list.length > 0 && (
            <>
              <Text style={s.section}>Разходи по дни</Text>
              <DailyChart ov={ov} stats={stats} year={year} month={month} />

              <Text style={s.section}>По дни от седмицата</Text>
              <WeekdayChart stats={stats} />

              <Text style={s.section}>Къде харчиш най-много</Text>
              <TopMerchants stats={stats} total={total} />
            </>
          )}

          <Text style={s.section}>Правило 50/30/20</Text>
          <Card>
            {!income ? (
              <Text style={s.hint}>Задай месечния си доход от настройките (⚙︎ в Начало), за да видиш как се справяш.</Text>
            ) : (
              Object.entries(BUCKETS).map(([key, b], i) => {
                const actual = effective[key];
                const target = income * b.target;
                const v = verdict(key, actual, target);
                return (
                  <View key={key} style={{ marginTop: i ? 18 : 0 }}>
                    <View style={s.bucketHead}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[s.dot, { backgroundColor: b.color }]} />
                        <Text style={s.bucketName}>{b.label}</Text>
                      </View>
                      <Text style={s.bucketPct}>
                        {pct(actual / income)} <Text style={{ color: colors.muted }}>/ {pct(b.target)}</Text>
                      </Text>
                    </View>
                    <Bar value={actual / income} marker={b.target} color={b.color} />
                    <View style={s.bucketFoot}>
                      <Text style={s.small}>
                        {money(actual)} от {money(target)}
                      </Text>
                      <Text style={[s.small, { color: v.color, fontWeight: '600' }]}>{v.text}</Text>
                    </View>
                    {key === 'savings' && leftover > 0 && <Text style={s.tiny}>вкл. {money(leftover)} неизхарчени</Text>}
                  </View>
                );
              })
            )}
          </Card>

          {advice.length > 0 && (
            <>
              <Text style={s.section}>Какво да подобря</Text>
              <View style={{ gap: 12 }}>
                {advice.map((t) => (
                  <AdviceCard key={t.id} tip={t} />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
      {scrim.overlay}

      <ScoreSheet visible={scoreOpen} onClose={() => setScoreOpen(false)} ov={ov} month={month} year={year} />
      <MonthPickerSheet visible={picker} onClose={() => setPicker(false)} expenses={expenses} year={year} month={month} onSelect={onMonthChange} />

      <Sheet
        visible={!!category}
        onClose={() => {
          setCategory(null);
          setSelected(null);
        }}
      >
        {category && selected ? (
          <ExpenseDetail
            expense={selected}
            onBack={() => setSelected(null)}
            onDelete={() => {
              removeExpense(selected.id);
              setSelected(null);
            }}
          />
        ) : category ? (
          <View>
            <View style={s.catSheetHead}>
              <IconBadge icon={category.icon} color={BUCKETS[category.bucket].color} size={52} />
              <View style={{ flex: 1 }}>
                <Text style={s.catSheetTitle}>{category.name}</Text>
                <Text style={s.small}>
                  {MONTHS[month]} {year}
                </Text>
              </View>
              <Text style={s.catSheetTotal}>{money(category.value)}</Text>
            </View>
            <ExpenseList
              expenses={ov.list.filter((e) => e.categoryId === category.id)}
              showFilters={false}
              onSelect={setSelected}
              onLongPress={(e) => confirmDelete(e, () => removeExpense(e.id))}
            />
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  overscroll: { position: 'absolute', top: -1000, left: 0, right: 0, height: 1000, backgroundColor: colors.heroFrom },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  sheet: {
    backgroundColor: colors.bg, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet,
    marginTop: -32, paddingHorizontal: 20, paddingTop: 20, minHeight: 600,
  },
  section: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 24, marginBottom: 12 },
  hint: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', paddingVertical: 12 },
  donutHint: { color: colors.muted, fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 14 },
  listHint: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 8 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.faint },
  catHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  catValue: { color: colors.text, fontSize: 15, fontWeight: '700' },
  small: { color: colors.muted, fontSize: 12 },
  tiny: { color: colors.muted, fontSize: 11, marginTop: 2 },
  delta: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, overflow: 'hidden' },
  bucketHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  bucketName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  bucketPct: { color: colors.text, fontSize: 14, fontWeight: '700' },
  bucketFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  catSheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  catSheetTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  catSheetTotal: { color: colors.text, fontSize: 18, fontWeight: '800' },
});
