import React, { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/ui/AppText';
import { useStore } from '../store';
import { colors, currentColorScheme, BUCKETS, getCategories, MONTHS, money, pct, radius } from '../theme';
import { monthOverview, filterMonth, summarize, shiftMonth } from '../budget';
import { getAdvice } from '../pet/advice';
import { stageFor, petStatus } from '../pet/logic';
import useNow from '../hooks/useNow';
import GradientHero from '../components/ui/GradientHero';
import Card from '../components/ui/Card';
import IconBadge from '../components/ui/IconBadge';
import Sheet from '../components/ui/Sheet';
import Bar from '../components/Bar';
import MonthPill from '../components/MonthPill';
import MonthPickerSheet from '../components/MonthPickerSheet';
import ExpenseList from '../components/ExpenseList';
import { ExpenseDetail, confirmDelete } from '../components/ExpenseDetailSheet';
import AdviceSheet, { AdviceCard } from '../components/AdviceSheet';
import { useMonthStats, SpendingChart, TopMerchants } from '../components/MonthDetails';
import StatsHero from '../components/StatsHero';
import ScoreSheet from '../components/ScoreSheet';
import useStatusScrim from '../hooks/useStatusScrim';
import Touch from '../components/ui/Touch';
import Pill from '../components/ui/Pill';
import YearReviewSheet from '../components/YearReviewSheet';
import { StatusBar } from 'expo-status-bar';

const TOP_CATS = 3;
import { themed } from '../themed';

export default function StatsScreen({ year, month, onMonthChange, onAdd, onOpenSettings }) {
  const store = useStore();
  const { expenses, incomes, incomeEntries, recurring, pet, removeExpense } = store;
  const [review, setReview] = useState(false);
  const now = useNow();
  const scrim = useStatusScrim();
  const [picker, setPicker] = useState(false);
  const [category, setCategory] = useState(null);
  const [selected, setSelected] = useState(null);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [allCats, setAllCats] = useState(false);
  const [adviceOpen, setAdviceOpen] = useState(false);

  const ov = useMemo(() => monthOverview({ expenses, incomes, incomeEntries, year, month, now }), [expenses, incomes, incomeEntries, year, month, now]);
  const prevYM = shiftMonth(year, month, -1);
  // For the current month compare like with like: the same days of last month, not all of it
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const cutDay = isCurrentMonth ? now.getDate() : 31;
  const prev = useMemo(
    () => summarize(filterMonth(expenses, prevYM.year, prevYM.month).filter((e) => new Date(e.date).getDate() <= cutDay)),
    [expenses, prevYM.year, prevYM.month, cutDay]
  );
  const advice = useMemo(
    () => getAdvice({ expenses, incomes, incomeEntries, recurring, year, month, now, lastFedAt: pet?.lastFedAt }),
    [expenses, incomes, incomeEntries, recurring, year, month, now, pet?.lastFedAt]
  );

  const stats = useMonthStats(ov, prev.total, year, month);

  const { total, byCategory } = ov;
  const status = useMemo(() => (pet ? petStatus({ expenses, incomes, incomeEntries, pet, now }) : null), [expenses, incomes, incomeEntries, pet, now]);

  const cats = getCategories(true).filter((c) => byCategory[c.id])
    .map((c) => ({ ...c, value: byCategory[c.id], before: prev.byCategory[c.id] || 0 }))
    .sort((a, b) => b.value - a.value);
  const maxCat = cats[0]?.value || 1;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={currentColorScheme() === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false} onScroll={scrim.onScroll} scrollEventThrottle={32}>
        <View style={s.overscroll} />
        <GradientHero tone="room" bottomSpace={56}>
          <View style={s.titleRow}>
            <Text style={s.title} accessibilityRole="header">Отчети</Text>
            <Pill small variant="white" icon="calendar-outline" label={`Твоята ${year}`} onPress={() => setReview(true)} />
          </View>
          <View style={{ marginTop: 14 }}>
            <MonthPill tone="room" year={year} month={month} onChange={onMonthChange} onOpenPicker={() => setPicker(true)} />
          </View>
          <StatsHero ov={ov} month={month} vsPrev={stats.vsPrev} onOpenScore={() => setScoreOpen(true)} onOpenSettings={onOpenSettings} />
        </GradientHero>

        <View style={s.sheet} onLayout={scrim.onSheetLayout}>
          {/* Where the money went: the top categories first, the rest one tap away */}
          <Text style={[s.section, { marginTop: 4 }]}>Къде отидоха парите</Text>
          {cats.length === 0 ? (
            <Card>
              <Text style={s.hint}>Няма разходи за {MONTHS[month].toLowerCase()}.</Text>
            </Card>
          ) : (
            <Card style={{ paddingVertical: 6 }}>
              {(allCats ? cats : cats.slice(0, TOP_CATS)).map((c, i) => {
                const delta = c.before ? c.value / c.before - 1 : null;
                const bucketColor = BUCKETS[c.bucket].color;
                return (
                  <Touch
                    key={c.id}
                    onPress={() => setCategory(c)}
                    style={[s.catRow, i > 0 && s.sep]}
                    accessibilityLabel={`${c.name}: ${money(c.value)}, ${pct(c.value / (total || 1))} от общо`}
                    accessibilityHint="Показва разходите в категорията"
                  >
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
                          <Text style={[s.delta, { color: delta > 0 ? colors.danger : colors.savings, backgroundColor: delta > 0 ? colors.dangerSoft : colors.savingsSoft }]}>
                            {delta > 0 ? '+' : '−'}
                            {pct(Math.abs(delta))} спрямо {MONTHS[prevYM.month].toLowerCase()}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                  </Touch>
                );
              })}
              {cats.length > TOP_CATS && (
                <Touch style={[s.more, s.sep]} onPress={() => setAllCats((v) => !v)}>
                  <Text style={s.moreText}>{allCats ? 'По-малко' : `Всички ${cats.length} категории`}</Text>
                  <Ionicons name={allCats ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
                </Touch>
              )}
            </Card>
          )}

          {ov.list.length > 0 && (
            <>
              <Text style={s.section}>Как харчиш</Text>
              <SpendingChart ov={ov} stats={stats} year={year} month={month} />

              <Text style={s.section}>Къде пазаруваш</Text>
              <TopMerchants stats={stats} total={total} />
            </>
          )}

          {/* One tip here; the dog's full list is the same sheet as on Home */}
          {advice.length > 0 && (
            <Touch style={{ marginTop: 24 }} onPress={() => setAdviceOpen(true)} accessibilityHint="Показва всички съвети">
              <AdviceCard tip={advice[0]} />
              <View style={s.allTips}>
                <Text style={s.moreText}>{advice.length > 1 ? `Всички съвети (${advice.length})` : `Съветите на ${pet.name}`}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </View>
            </Touch>
          )}
        </View>
      </ScrollView>
      {scrim.overlay}

      <YearReviewSheet visible={review} onClose={() => setReview(false)} year={year} data={store} pet={pet} stage={stageFor(pet?.xp || 0).stage.key} />
      {status && (
        <AdviceSheet
          visible={adviceOpen}
          onClose={() => setAdviceOpen(false)}
          advice={advice}
          petName={pet.name}
          expression={status.expression}
          stage={status.stage.key}
        />
      )}
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
            onEdit={(e) => {
              setCategory(null);
              setSelected(null);
              // iOS won't present a new modal while this sheet is still closing
              setTimeout(() => onAdd?.({ edit: e }), 450);
            }}
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

const s = themed((colors) => ({
  overscroll: { position: 'absolute', top: -1000, left: 0, right: 0, height: 1000, backgroundColor: colors.roomFrom },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800' },
  sheet: {
    backgroundColor: colors.bg, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet,
    marginTop: -32, paddingHorizontal: 20, paddingTop: 20, minHeight: 600,
  },
  section: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 24, marginBottom: 12 },
  hint: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', paddingVertical: 12 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.faint },
  catHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  catValue: { color: colors.text, fontSize: 15, fontWeight: '700' },
  small: { color: colors.muted, fontSize: 12 },
  delta: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, overflow: 'hidden' },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12 },
  moreText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  allTips: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 10 },
  catSheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  catSheetTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  catSheetTotal: { color: colors.text, fontSize: 18, fontWeight: '800' },
}));
