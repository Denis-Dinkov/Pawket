import React, { useMemo, useRef, useState } from 'react';
import { View, ScrollView, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/ui/AppText';
import { useStore } from '../store';
import { colors, BUCKETS, MONTHS, money, moneyShort, pct, radius, categoryById, currentColorScheme } from '../theme';
import { monthOverview, sortByDateDesc, dailyLimit } from '../budget';
import { petStatus, EXPRESSIONS, expressionFor, dayKey } from '../pet/logic';
import { getAdvice } from '../pet/advice';
import { weekMissions, streak, activityDays } from '../pet/missions';
import { upcomingPayments, pendingSpend, goalProgress, monthForecast } from '../plans';
import { sameDay, plural, dayLabel } from '../format';
import { tapFeedback } from '../haptics';
import useNow from '../hooks/useNow';
import Money from '../components/ui/Money';
import Pill from '../components/ui/Pill';
import Card from '../components/ui/Card';
import IconBadge from '../components/ui/IconBadge';
import Segmented from '../components/ui/Segmented';
import Touch from '../components/ui/Touch';
import Bar from '../components/Bar';
import Pet from '../pet/Pet';
import PetRoom, { PetChips } from '../components/PetRoom';
import Appear from '../components/ui/Appear';
import { petLine } from '../pet/lines';
import MonthPill from '../components/MonthPill';
import MonthPickerSheet from '../components/MonthPickerSheet';
import ExpenseRow from '../components/ExpenseRow';
import ExpenseList from '../components/ExpenseList';
import ExpenseDetailSheet, { confirmDelete } from '../components/ExpenseDetailSheet';
import AdviceSheet from '../components/AdviceSheet';
import IncomeSheet from '../components/IncomeSheet';
import PetStatSheet from '../components/PetStatSheet';
import LayoutSheet from '../components/LayoutSheet';
import { TodayCard, TopCategoriesCard } from '../components/HomeCards';
import { normalizeLayout } from '../homeLayout';
import { themed } from '../themed';

const RECENT = 3;
const ROOM = 268;
const MONTH_EMOJI = { ecstatic: '🤩', happy: '🐶', worried: '😟', sad: '😢', crying: '😭' };

// One bar for the whole 50/30/20 split; the grey rest is the unspent income
function SplitBar({ ov }) {
  const base = Math.max(ov.income, ov.total) || 1;
  const parts = ['needs', 'wants', 'savings'].map((k) => ({ k, v: ov.byBucket[k] / base }));
  const free = Math.max(0, ov.income - ov.total) / base;
  return (
    <View
      style={s.split}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Разпределение: ${parts.map((p) => `${BUCKETS[p.k].label} ${pct(ov.income ? ov.byBucket[p.k] / ov.income : 0)}`).join(', ')} от дохода`}
    >
      {parts.map((p) => p.v > 0 && <View key={p.k} style={{ flex: p.v, backgroundColor: BUCKETS[p.k].color }} />)}
      {free > 0 && <View style={{ flex: free, backgroundColor: colors.faint }} />}
    </View>
  );
}

function Legend({ ov }) {
  return (
    <View style={s.legend}>
      {Object.entries(BUCKETS).map(([k, b]) => {
        const target = ov.income * b.target;
        const over = k !== 'savings' && ov.byBucket[k] > target;
        return (
          <View key={k} style={s.legendItem}>
            <View style={s.legendHead}>
              <View style={[s.legendDot, { backgroundColor: b.color }]} />
              <Text style={s.legendName} numberOfLines={1}>{b.label}</Text>
            </View>
            <Text style={[s.legendValue, over && { color: colors.danger, fontWeight: '700' }]} numberOfLines={2}>
              {over ? `над с ${moneyShort(ov.byBucket[k] - target)}` : `${moneyShort(ov.byBucket[k])} от ${moneyShort(target)}`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function HomeScreen({ year, month, onMonthChange, onOpenSettings, onAdd, onTab }) {
  const store = useStore();
  const { expenses, incomes, incomeEntries, pet, recurring, goals, homeLayout, setHomeLayout, removeExpense, removeIncome, checkInNoSpend } = store;
  const insets = useSafeAreaInsets();
  const layout = normalizeLayout(homeLayout);
  const visible = layout.order.filter((k) => !layout.hidden.includes(k));
  const now = useNow();
  const scroll = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [view, setView] = useState('recent');
  const [picker, setPicker] = useState(false);
  const [selected, setSelected] = useState(null);
  const [adviceOpen, setAdviceOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [statOpen, setStatOpen] = useState(null); // 'mood' | 'fullness' | 'growth'
  const [layoutOpen, setLayoutOpen] = useState(false);

  const ov = useMemo(() => monthOverview({ expenses, incomes, incomeEntries, year, month, now }), [expenses, incomes, incomeEntries, year, month, now]);
  const current = useMemo(
    () => monthOverview({ expenses, incomes, incomeEntries, year: now.getFullYear(), month: now.getMonth(), now }),
    [expenses, incomes, incomeEntries, now]
  );
  const status = useMemo(() => petStatus({ expenses, incomes, incomeEntries, pet, now }), [expenses, incomes, incomeEntries, pet, now]);
  const advice = useMemo(
    () => getAdvice({ expenses, incomes, incomeEntries, recurring, year, month, now, lastFedAt: pet?.lastFedAt }),
    [expenses, incomes, incomeEntries, recurring, year, month, now, pet?.lastFedAt]
  );
  // The dog always explains its mood for the current month
  const currentAdvice = useMemo(
    () =>
      ov.progress.isCurrent
        ? advice
        : getAdvice({ expenses, incomes, incomeEntries, recurring, year: now.getFullYear(), month: now.getMonth(), now, lastFedAt: pet?.lastFedAt }),
    [ov.progress.isCurrent, advice, expenses, incomes, incomeEntries, recurring, now, pet?.lastFedAt]
  );
  const pending = pendingSpend(recurring, now);
  const daily = dailyLimit(current, now, pending);
  const recent = useMemo(() => sortByDateDesc(ov.list).slice(0, RECENT), [ov.list]);
  const upcoming = upcomingPayments(recurring, now)[0];
  const goal = goals
    .map((g) => ({ g, p: goalProgress(g, expenses) }))
    .sort((a, b) => Number(a.p.done) - Number(b.p.done))[0];
  const missions = useMemo(
    () => weekMissions({ expenses, incomeEntries, pet, income: current.income, now }),
    [expenses, incomeEntries, pet, current.income, now]
  );
  const currentStreak = streak(activityDays({ expenses, incomeEntries, pet }), now);

  const { isCurrent } = ov.progress;
  const hasExpenseToday = expenses.some((e) => e.source !== 'recurring' && sameDay(e.date, now));
  const canFeed = !hasExpenseToday && pet.lastActiveDay !== dayKey(now) && (now.getHours() >= 18 || status.fullness < 60);
  const feed = () => {
    tapFeedback();
    checkInNoSpend();
  };

  // The dog lives in the present; for a past month it comments on that month's result
  const forecast = monthForecast(current, now, pending);
  const bubble = isCurrent
    ? petLine({ status, daily, advice, activeToday: hasExpenseToday || pet.lastActiveDay === dayKey(now), goal: goal && { name: goal.g.name, done: goal.p.done }, now }).text
    : ov.score == null
      ? `За ${MONTHS[month].toLowerCase()} няма доход — не мога да го оценя.`
      : `${MONTHS[month]} завърши с ${ov.score}/100 ${MONTH_EMOJI[expressionFor(ov.score)]}`;

  const openAdd = (prefill) => setTimeout(() => onAdd(prefill), 450);
  const edit = (e) => {
    setSelected(null);
    // iOS won't present a new modal while this sheet is still closing
    openAdd({ edit: e });
  };

  // The room shrinks into a header bar once it scrolls away; the dog stays on screen
  const dockAt = ROOM - 80;
  const dockOpacity = scrollY.interpolate({ inputRange: [dockAt - 30, dockAt], outputRange: [0, 1], extrapolate: 'clamp' });
  const [docked, setDocked] = useState(false);

  const sections = {
    plans: () => (
      <View style={s.duo}>
        <Touch style={s.mini} onPress={() => onTab('plans')} accessibilityHint="Отваря Планове">
          <Text style={s.miniHead}>Предстои</Text>
          {upcoming ? (
            <>
              <Text style={s.miniValue} numberOfLines={1}>
                {upcoming.rule.merchant || upcoming.rule.note || categoryById(upcoming.rule.categoryId)?.name} · {money(upcoming.rule.amount)}
              </Text>
              <Text style={s.miniSub}>{dayLabel(upcoming.date.toISOString(), now)}</Text>
            </>
          ) : (
            <>
              <Text style={s.miniValue}>Няма плащания</Text>
              <Text style={s.miniSub}>Добави наем, сметки ›</Text>
            </>
          )}
        </Touch>
        <Touch style={s.mini} onPress={() => onTab('plans')} accessibilityHint="Отваря Планове">
          <Text style={s.miniHead}>Цел</Text>
          {goal ? (
            <>
              <Text style={s.miniValue} numberOfLines={1}>
                {goal.g.name} · {pct(goal.p.progress)}
              </Text>
              <Bar value={goal.p.progress} color={colors.savings} height={5} label={`${goal.g.name}: ${money(goal.p.saved)} от ${money(goal.g.target)}`} />
              <Text style={s.miniSub}>
                {money(goal.p.saved)} от {money(goal.g.target)}
              </Text>
            </>
          ) : (
            <>
              <Text style={s.miniValue}>Спестявай за нещо</Text>
              <Text style={s.miniSub}>Създай цел ›</Text>
            </>
          )}
        </Touch>
      </View>
    ),
    missions: () => (
      <Touch onPress={() => onTab('pet')} accessibilityHint={`Отваря ${pet.name}`}>
        <Card style={{ gap: 10 }}>
          <View style={s.cardHead}>
            <Text style={s.h2}>Мисии тази седмица</Text>
            <View style={s.streak}>
              <Ionicons name="flame" size={15} color={colors.orange} />
              <Text style={s.streakText}>{plural(currentStreak, 'ден', 'дни')}</Text>
            </View>
          </View>
          {missions.map((m) => (
            <View key={m.id} style={s.mission} accessible accessibilityLabel={`${m.title}: ${m.done ? 'изпълнена' : `${m.n} от ${m.of}`}`}>
              <Ionicons name={m.done ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={m.done ? colors.savings : colors.muted} />
              <Text style={[s.missionText, m.done && s.missionDone]} numberOfLines={2}>{m.title}</Text>
              <Text style={s.missionCount}>{m.done ? '+25 XP' : `${m.n}/${m.of}`}</Text>
            </View>
          ))}
        </Card>
      </Touch>
    ),
    today: () => <TodayCard ov={ov} now={now} pending={pending} />,
    rule: () => (
      <Card style={{ gap: 14 }}>
        <View style={s.cardHead}>
          <Text style={s.h2}>Правило 50/30/20</Text>
          {ov.score != null && ov.list.length > 0 && <Text style={s.score}>{ov.score}/100</Text>}
        </View>
        {Object.entries(BUCKETS).map(([k, b]) => {
          const target = ov.income * b.target;
          return (
            <View key={k} style={{ gap: 8 }}>
              <View style={s.cardHead}>
                <Text style={s.bucketName}>{b.label}</Text>
                <Text style={s.miniSub}>
                  {money(ov.byBucket[k])} от {money(target)}
                </Text>
              </View>
              <Bar
                value={target ? ov.byBucket[k] / target : 0}
                color={k !== 'savings' && ov.byBucket[k] > target ? colors.danger : b.color}
                height={6}
                label={`${b.label}: ${money(ov.byBucket[k])} от ${money(target)}`}
              />
            </View>
          );
        })}
      </Card>
    ),
    topCats: () => <TopCategoriesCard ov={ov} />,
    expenses: () => (
      <View>
        <View style={s.listHead}>
          <Text style={s.section}>Разходи</Text>
          <Text style={s.miniSub}>{plural(ov.list.length, 'плащане', 'плащания')}</Text>
        </View>
        {view === 'all' && (
          <Segmented
            options={[
              { key: 'recent', label: 'Последни' },
              { key: 'all', label: `Всички (${ov.list.length})` },
            ]}
            value={view}
            onChange={setView}
            style={{ marginBottom: 6 }}
          />
        )}
        {ov.list.length === 0 ? (
          <Card style={{ alignItems: 'center', gap: 10 }}>
            <Text style={s.empty}>Няма разходи за {MONTHS[month].toLowerCase()}.</Text>
            <Pill icon="add" label="Добави първия" variant="ink" onPress={() => onAdd({})} />
          </Card>
        ) : view === 'recent' ? (
          <Card style={{ paddingVertical: 6 }}>
            {recent.map((e, i) => (
              <View key={e.id} style={i > 0 && s.sep}>
                <ExpenseRow expense={e} onPress={() => setSelected(e)} onLongPress={() => confirmDelete(e, () => removeExpense(e.id))} />
              </View>
            ))}
            {ov.list.length > RECENT && (
              <Touch style={s.seeAll} onPress={() => setView('all')}>
                <Text style={s.seeAllText}>Всички {ov.list.length}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </Touch>
            )}
          </Card>
        ) : (
          <ExpenseList
            key={`${year}-${month}`}
            expenses={ov.list}
            onSelect={setSelected}
            onLongPress={(e) => confirmDelete(e, () => removeExpense(e.id))}
          />
        )}
      </View>
    ),
  };

  const dark = currentColorScheme() === 'dark';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Animated.ScrollView
        ref={scroll}
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
          listener: (e) => {
            const next = e.nativeEvent.contentOffset.y > dockAt - 30;
            if (next !== docked) setDocked(next);
          },
        })}
      >
        {/* The room color also behind the iOS top "bounce" */}
        <View style={s.overscroll} />
        <PetRoom
          pet={pet}
          status={status}
          now={now}
          insetTop={insets.top}
          height={ROOM}
          bubble={bubble}
          bubbleAction={canFeed && isCurrent ? { label: 'Без разходи днес 🦴', onPress: feed } : null}
          onBubble={() => setAdviceOpen(true)}
          onStat={setStatOpen}
          bounceKey={pet.lastFedAt}
          top={
            <>
              <MonthPill tone="room" compact year={year} month={month} onChange={onMonthChange} onOpenPicker={() => setPicker(true)} />
              <Touch style={s.gear} onPress={onOpenSettings} hitSlop={8} accessibilityLabel="Настройки">
                <Ionicons name="settings-outline" size={20} color={colors.text} />
              </Touch>
            </>
          }
        />

        <View style={s.sheet}>
          {/* Everything that matters, without scrolling: what's left, today's limit and the 50/30/20 split */}
          <Card elevated style={{ gap: 12 }}>
            <PetChips status={status} onStat={setStatOpen} style={{ justifyContent: 'flex-start' }} />
            <View style={s.moneyRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>
                  {ov.remaining < 0 ? 'Над дохода с' : isCurrent ? `Остават до ${ov.progress.daysInMonth} ${MONTHS[month].toLowerCase()}` : `Остана от ${MONTHS[month].toLowerCase()}`}
                </Text>
                <Money whole value={Math.abs(ov.remaining)} size={32} color={ov.remaining < 0 ? colors.danger : colors.text} />
              </View>
              {isCurrent && daily ? (
                // Over the limit: "Днес 43 € от 36 €" and "над с 7 €"; otherwise "Остават 29 € от 36 € за днес"
                <View
                  style={s.today}
                  accessible
                  accessibilityLabel={
                    daily.over
                      ? `Днес похарчени ${moneyShort(daily.spentToday)} от ${moneyShort(daily.limit)}, над лимита с ${moneyShort(-daily.left)}`
                      : `Днес остават ${moneyShort(daily.left)} от ${moneyShort(daily.limit)}`
                  }
                >
                  <Text style={s.label}>{daily.over ? 'Днес' : 'Днес остават'}</Text>
                  <Money whole value={daily.over ? daily.spentToday : daily.left} size={22} color={daily.over ? colors.danger : colors.savings} />
                  <Text style={[s.miniSub, daily.over && { color: colors.danger, fontWeight: '700' }]}>
                    {daily.over ? `над ${moneyShort(daily.limit)} с ${moneyShort(-daily.left)}` : `от ${moneyShort(daily.limit)}`}
                  </Text>
                </View>
              ) : !isCurrent && ov.score != null ? (
                <View style={s.today}>
                  <Text style={s.label}>Оценка</Text>
                  <Text style={[s.todayValue, { color: colors.primary }]}>{ov.score}/100</Text>
                </View>
              ) : null}
            </View>
            {ov.income > 0 ? (
              <>
                <SplitBar ov={ov} />
                <Legend ov={ov} />
              </>
            ) : (
              <Pill icon="settings-outline" label="Задай месечния си доход" variant="soft" onPress={onOpenSettings} />
            )}
            <View style={s.moneyFoot}>
              <Touch style={s.footItem} onPress={() => setIncomeOpen(true)} accessibilityHint="Показва доходите за месеца">
                <Ionicons name="arrow-down-circle" size={16} color={colors.savings} />
                <Text style={s.footText}>
                  Доход <Text style={s.footStrong}>{moneyShort(ov.income)}</Text>
                </Text>
                <Ionicons name="chevron-forward" size={13} color={colors.muted} />
              </Touch>
              <View style={s.footItem}>
                <Ionicons name="arrow-up-circle" size={16} color={colors.wants} />
                <Text style={s.footText}>
                  Похарчено <Text style={s.footStrong}>{moneyShort(ov.total)}</Text>
                </Text>
              </View>
            </View>
            {/* Forecast: where the month ends at today's pace, the recurring payments included */}
            {isCurrent && forecast && current.list.length >= 3 && (
              <View
                style={[s.forecast, { backgroundColor: forecast.end < 0 ? colors.dangerSoft : colors.savingsSoft }]}
                accessible
                accessibilityLabel={`Прогноза за края на месеца: ${forecast.end < 0 ? 'минус ' : ''}${moneyShort(Math.abs(forecast.end))}`}
              >
                <Ionicons name={forecast.end < 0 ? 'trending-down' : 'trending-up'} size={16} color={forecast.end < 0 ? colors.danger : colors.savings} />
                <Text style={s.forecastText}>
                  При това темпо месецът свършва с{' '}
                  <Text style={{ fontWeight: '800', color: forecast.end < 0 ? colors.danger : colors.savings }}>
                    {forecast.end < 0 ? '−' : '+'}
                    {moneyShort(Math.abs(forecast.end))}
                  </Text>
                  {forecast.end < 0 && forecast.daysLeft > 1
                    ? `. Свали харченето с ${moneyShort(Math.ceil(-forecast.end / forecast.daysLeft))}/ден.`
                    : ''}
                </Text>
              </View>
            )}
          </Card>

          {!isCurrent && (
            <Pill
              icon="arrow-undo-outline"
              label="Към текущия месец"
              variant="soft"
              style={{ alignSelf: 'center' }}
              onPress={() => onMonthChange(now.getFullYear(), now.getMonth())}
            />
          )}

          {visible.map((key, i) => (
            <Appear key={key} index={i + 1}>
              {sections[key]()}
            </Appear>
          ))}

          <Pill icon="options-outline" label="Подреди началото" variant="outline" style={s.layoutBtn} onPress={() => setLayoutOpen(true)} />
        </View>
      </Animated.ScrollView>

      {/* Docked header: the dog stays visible while scrolling */}
      <Animated.View pointerEvents={docked ? 'auto' : 'none'} style={[s.dockWrap, { opacity: dockOpacity }]}>
        <Touch haptic={false} onPress={() => scroll.current?.scrollTo({ y: 0, animated: true })} accessibilityLabel="Нагоре">
          <LinearGradient colors={[colors.roomFrom, colors.roomTo]} style={[s.dock, { paddingTop: insets.top + 6 }]}>
            <View style={s.dockPet}>
              <Pet expression={status.expression} stage={status.stage.key} accessory={pet.accessory} size={52} animate={false} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.dockName} numberOfLines={1}>
                {pet.name} · {EXPRESSIONS[status.expression].label.toLowerCase()}
              </Text>
              <Text style={s.dockSub} numberOfLines={1}>{bubble}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.dockAmount}>{money(Math.round(ov.remaining))}</Text>
              {isCurrent && daily && <Text style={s.dockSub}>днес {money(Math.max(0, Math.round(daily.left)))}</Text>}
            </View>
          </LinearGradient>
        </Touch>
      </Animated.View>

      <MonthPickerSheet visible={picker} onClose={() => setPicker(false)} expenses={expenses} year={year} month={month} onSelect={onMonthChange} />
      <ExpenseDetailSheet
        expense={selected}
        onClose={() => setSelected(null)}
        onEdit={edit}
        onDelete={() => {
          removeExpense(selected.id);
          setSelected(null);
        }}
      />
      <IncomeSheet
        visible={incomeOpen}
        onClose={() => setIncomeOpen(false)}
        info={ov.incomeInfo}
        year={year}
        month={month}
        onDelete={removeIncome}
        onAdd={() => {
          setIncomeOpen(false);
          openAdd({ mode: 'income' });
        }}
      />
      <PetStatSheet
        stat={statOpen}
        onClose={() => setStatOpen(null)}
        status={status}
        pet={pet}
        advice={currentAdvice}
        canFeed={canFeed}
        onFeed={feed}
        now={now}
      />
      <LayoutSheet visible={layoutOpen} onClose={() => setLayoutOpen(false)} layout={layout} onChange={setHomeLayout} />
      <AdviceSheet
        visible={adviceOpen}
        onClose={() => setAdviceOpen(false)}
        advice={advice}
        petName={pet.name}
        expression={status.expression}
        stage={status.stage.key}
      />
    </View>
  );
}

const s = themed((c) => ({
  overscroll: { position: 'absolute', top: -1000, left: 0, right: 0, height: 1000, backgroundColor: c.roomFrom },
  gear: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.card, opacity: 0.92, alignItems: 'center', justifyContent: 'center' },
  sheet: {
    backgroundColor: c.bg, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet,
    marginTop: -30, paddingHorizontal: 16, paddingTop: 16, gap: 16, minHeight: 600,
  },
  label: { color: c.muted, fontSize: 12.5, fontWeight: '600' },
  moneyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  today: { alignItems: 'flex-end' },
  todayValue: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  split: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2, backgroundColor: c.faint },
  legend: { flexDirection: 'row', gap: 8 },
  legendItem: { flex: 1, gap: 2 },
  legendHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 3 },
  legendName: { color: c.text, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  legendValue: { color: c.muted, fontSize: 12 },
  moneyFoot: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: c.faint, paddingTop: 10, gap: 8, flexWrap: 'wrap' },
  forecast: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  forecastText: { flex: 1, color: c.text, fontSize: 13, lineHeight: 18 },
  footItem: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32 },
  footText: { color: c.muted, fontSize: 13 },
  footStrong: { color: c.text, fontWeight: '700' },
  duo: { flexDirection: 'row', gap: 10 },
  mini: { flex: 1, backgroundColor: c.card, borderRadius: 20, padding: 12, gap: 4 },
  miniHead: { color: c.muted, fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  miniValue: { color: c.text, fontSize: 15, fontWeight: '800' },
  miniSub: { color: c.muted, fontSize: 12.5 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  h2: { color: c.text, fontSize: 16, fontWeight: '700' },
  score: { color: c.primary, fontSize: 15, fontWeight: '800' },
  bucketName: { color: c.text, fontSize: 14.5, fontWeight: '700' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.warningSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  streakText: { color: c.text, fontSize: 12.5, fontWeight: '700' },
  mission: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  missionText: { flex: 1, color: c.text, fontSize: 14, fontWeight: '600' },
  missionDone: { color: c.muted, textDecorationLine: 'line-through' },
  missionCount: { color: c.muted, fontSize: 12.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
  section: { color: c.text, fontSize: 18, fontWeight: '800' },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  empty: { color: c.muted, textAlign: 'center', fontSize: 14 },
  sep: { borderTopWidth: 1, borderColor: c.faint },
  seeAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 44, borderTopWidth: 1, borderColor: c.faint },
  seeAllText: { color: c.primary, fontSize: 14, fontWeight: '700' },
  layoutBtn: { alignSelf: 'center', marginTop: 6, borderColor: c.faint },
  dockWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  dock: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 10,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    shadowColor: '#4A2A14', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  dockPet: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  dockName: { color: c.text, fontSize: 14, fontWeight: '800' },
  dockSub: { color: c.muted, fontSize: 12 },
  dockAmount: { color: c.text, fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
}));
