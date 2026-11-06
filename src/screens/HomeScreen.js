import React, { forwardRef, memo, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/ui/AppText';
import { useStore } from '../store';
import { colors, BUCKETS, MONTHS, money, moneyShort, pct, radius, categoryById, currentColorScheme, monthLower } from '../theme';
import { monthOverview, sortByDateDesc, dailyLimit, freeToSpend } from '../budget';
import { petStatus, EXPRESSIONS, expressionFor, dayKey } from '../pet/logic';
import { getAdvice } from '../pet/advice';
import { weekMissions, streak, activityDays } from '../pet/missions';
import { upcomingPayments, pendingSpend, goalProgress, monthForecast } from '../plans';
import { sameDay, plural, dayLabel } from '../format';
import { tapFeedback } from '../haptics';
import useNow from '../hooks/useNow';
import Money from '../components/ui/Money';
import Pill from '../components/ui/Pill';
import { afterSheetsClose } from '../components/ui/Sheet';
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
import SessionCard from '../components/SessionCard';
import LimitSheet from '../components/LimitSheet';
import { normalizeLayout } from '../homeLayout';
import { themed } from '../themed';
import { outfitOf } from '../pet/outfit';
import { t } from '../i18n';

const RECENT = 3;
// A small limit shows its cents ("от 6,08 €"): rounded to "6 €" it didn't add up to the month
const limitText = (n) => (n < 100 ? money(Math.round(n * 100) / 100) : moneyShort(n));
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
      accessibilityLabel={t('Разпределение: {0} от дохода', { 0: parts.map((p) => `${BUCKETS[p.k].label} ${pct(ov.income ? ov.byBucket[p.k] / ov.income : 0)}`).join(', ') })}
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
              {over ? t('{0} над {1}', { 0: moneyShort(ov.byBucket[k] - target), 1: moneyShort(target) }) : t('{0} от {1}', { 0: moneyShort(ov.byBucket[k]), 1: moneyShort(target) })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * The room shrunk into a header bar once it scrolls away. It owns its "docked" flag (it only decides
 * whether the bar takes touches), so crossing the threshold mid-scroll re-renders just this bar.
 */
const DockHeader = memo(
  forwardRef(function DockHeader({ opacity, onPress, topInset, pet, expression, stageKey, bubble, remaining, todayLeft }, ref) {
    const [docked, setDocked] = useState(false);
    useImperativeHandle(ref, () => ({ setDocked }), []);
    return (
      <Animated.View pointerEvents={docked ? 'auto' : 'none'} style={[s.dockWrap, { opacity }]}>
        {/* The shadow sits on a solid view: iOS draws it from the shape alone, not from the gradient's pixels on every frame */}
        <Touch haptic={false} onPress={onPress} accessibilityLabel={t('Нагоре')} style={s.dockShadow}>
          <LinearGradient colors={[colors.roomFrom, colors.roomTo]} style={[s.dock, { paddingTop: topInset + 6 }]}>
            <View style={s.dockPet}>
              <Pet expression={expression} stage={stageKey} {...outfitOf(pet)} size={52} animate={false} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.dockName} numberOfLines={1}>
                {pet.name} · {EXPRESSIONS[expression].label.toLowerCase()}
              </Text>
              <Text style={s.dockSub} numberOfLines={1}>{bubble}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.dockAmount}>{money(Math.round(remaining))}</Text>
              {todayLeft != null &&
                (todayLeft < 0 ? (
                  <Text style={[s.dockSub, { color: colors.danger, fontWeight: '700' }]}>{t('днес {0} над лимита', { 0: money(Math.round(-todayLeft)) })}</Text>
                ) : (
                  <Text style={s.dockSub}>{t('днес {0}', { 0: money(Math.round(todayLeft)) })}</Text>
                ))}
            </View>
          </LinearGradient>
        </Touch>
      </Animated.View>
    );
  })
);

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
  const [limitOpen, setLimitOpen] = useState(false);

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
  // Everything below is memoized: Home re-renders on every store change (and right when an entry is saved,
  // while the sheet is closing), so nothing here should re-scan all expenses unless its inputs changed
  const pending = useMemo(() => pendingSpend(recurring, now), [recurring, now]);
  const daily = useMemo(() => dailyLimit(current, now, pending), [current, now, pending]);
  const recent = useMemo(() => sortByDateDesc(ov.list).slice(0, RECENT), [ov.list]);
  const upcoming = useMemo(() => upcomingPayments(recurring, now)[0], [recurring, now]);
  const goal = useMemo(
    () => goals.map((g) => ({ g, p: goalProgress(g, expenses) })).sort((a, b) => Number(a.p.done) - Number(b.p.done))[0],
    [goals, expenses]
  );
  // Home shows only what's real: a payment due within a week and an unfinished goal (empty prompts live in Plans)
  const upcomingSoon = upcoming && upcoming.date - now <= 7 * 86400000;
  const activeGoal = goal && !goal.p.done;
  const missions = useMemo(
    () => weekMissions({ expenses, incomeEntries, pet, income: current.income, now }),
    [expenses, incomeEntries, pet, current.income, now]
  );
  const currentStreak = useMemo(() => streak(activityDays({ expenses, incomeEntries, pet }), now), [expenses, incomeEntries, pet, now]);

  const { isCurrent } = ov.progress;
  const hasExpenseToday = useMemo(() => expenses.some((e) => e.source !== 'recurring' && sameDay(e.date, now)), [expenses, now]);
  const canFeed = !hasExpenseToday && pet.lastActiveDay !== dayKey(now) && (now.getHours() >= 18 || status.fullness < 60);
  const feed = () => {
    tapFeedback();
    checkInNoSpend();
  };

  // The dog lives in the present; for a past month it comments on that month's result
  const forecast = useMemo(() => monthForecast(current, now, pending), [current, now, pending]);
  // The main number: free to spend this month (current month), or what was left of a past one
  const free = isCurrent ? freeToSpend(ov, pending) : null;
  const heroValue = free ? free.free : ov.remaining;
  // Past the savings too: the hero says how far over the whole income
  const overIncome = !!free && free.free + free.reserve < 0;
  const bubble = isCurrent
    ? petLine({ status, daily, advice, activeToday: hasExpenseToday || pet.lastActiveDay === dayKey(now), goal: goal && { name: goal.g.name, done: goal.p.done }, now }).text
    : ov.score == null
      ? t('За {0} няма доход — не мога да го оценя.', { 0: monthLower(month) })
      : t('{0} завърши с {1}/100 {2}', { 0: MONTHS[month], 1: ov.score, 2: MONTH_EMOJI[expressionFor(ov.score)] });

  // Opens Add once the sheet it comes from has really gone (iOS can't present two at once)
  const openAdd = (prefill) => afterSheetsClose(() => onAdd(prefill));
  const edit = (e) => {
    setSelected(null);
    openAdd({ edit: e });
  };

  // The room shrinks into a header bar once it scrolls away; the dog stays on screen
  const dockAt = ROOM - 80;
  const dockOpacity = scrollY.interpolate({ inputRange: [dockAt - 30, dockAt], outputRange: [0, 1], extrapolate: 'clamp' });
  const dock = useRef(null);
  const docked = useRef(false);
  const scrollTop = useRef(() => scroll.current?.scrollTo({ y: 0, animated: true })).current;

  const sections = {
    plans: () => (
      <View style={s.duo}>
        {upcomingSoon && (
          <Touch style={s.mini} onPress={() => onTab('plans')} accessibilityHint={t('Отваря Планове')}>
            <Text style={s.miniHead}>{t('Предстои')}</Text>
            <Text style={s.miniValue} numberOfLines={1}>
              {upcoming.rule.merchant || upcoming.rule.note || categoryById(upcoming.rule.categoryId)?.name} · {money(upcoming.rule.amount)}
            </Text>
            <Text style={s.miniSub}>{dayLabel(upcoming.date.toISOString(), now)}</Text>
          </Touch>
        )}
        {activeGoal && (
          <Touch style={s.mini} onPress={() => onTab('plans')} accessibilityHint={t('Отваря Планове')}>
            <Text style={s.miniHead}>{t('Цел')}</Text>
            <Text style={s.miniValue} numberOfLines={1}>
              {goal.g.name} · {pct(goal.p.progress)}
            </Text>
            <Bar value={goal.p.progress} color={colors.savings} height={5} label={t('{0}: {1} от {2}', { 0: goal.g.name, 1: money(goal.p.saved), 2: money(goal.g.target) })} />
            <Text style={s.miniSub}>
              {t('{0} от {1}', { 0: money(goal.p.saved), 1: money(goal.g.target) })}
            </Text>
          </Touch>
        )}
      </View>
    ),
    missions: () => (
      <Touch onPress={() => onTab('pet')} accessibilityHint={t('Отваря {0}', { 0: pet.name })}>
        <Card style={{ gap: 10 }}>
          <View style={s.cardHead}>
            <Text style={s.h2}>{t('Мисии тази седмица')}</Text>
            <View style={s.streak}>
              <Ionicons name="flame" size={15} color={colors.orange} />
              <Text style={s.streakText}>{plural(currentStreak, t('ден'), t('дни'))}</Text>
            </View>
          </View>
          {missions.map((m) => (
            <View key={m.id} style={s.mission} accessible accessibilityLabel={`${m.title}: ${m.done ? t('изпълнена') : t('{0} от {1}', { 0: m.n, 1: m.of })}`}>
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
          <Text style={s.h2}>{t('Правило 50/30/20')}</Text>
          {ov.score != null && ov.list.length > 0 && <Text style={s.score}>{ov.score}/100</Text>}
        </View>
        {Object.entries(BUCKETS).map(([k, b]) => {
          const target = ov.income * b.target;
          return (
            <View key={k} style={{ gap: 8 }}>
              <View style={s.cardHead}>
                <Text style={s.bucketName}>{b.label}</Text>
                <Text style={s.miniSub}>
                  {t('{0} от {1}', { 0: money(ov.byBucket[k]), 1: money(target) })}
                </Text>
              </View>
              <Bar
                value={target ? ov.byBucket[k] / target : 0}
                color={k !== 'savings' && ov.byBucket[k] > target ? colors.danger : b.color}
                height={6}
                label={t('{0}: {1} от {2}', { 0: b.label, 1: money(ov.byBucket[k]), 2: money(target) })}
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
          <Text style={s.section}>{t('Разходи')}</Text>
          <Text style={s.miniSub}>{plural(ov.list.length, t('плащане'), t('плащания'))}</Text>
        </View>
        {view === 'all' && (
          <Segmented
            options={[
              { key: 'recent', label: t('Последни') },
              { key: 'all', label: t('Всички ({0})', { 0: ov.list.length }) },
            ]}
            value={view}
            onChange={setView}
            style={{ marginBottom: 6 }}
          />
        )}
        {ov.list.length === 0 ? (
          <Card style={{ alignItems: 'center', gap: 10 }}>
            <Text style={s.empty}>{t('Няма разходи за {0}.', { 0: monthLower(month) })}</Text>
            <Pill icon="add" label={t('Добави първия')} variant="ink" onPress={() => onAdd({})} />
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
                <Text style={s.seeAllText}>{t('Всички {0}', { 0: ov.list.length })}</Text>
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
            if (next !== docked.current) {
              docked.current = next;
              dock.current?.setDocked(next);
            }
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
          bubbleAction={canFeed && isCurrent ? { label: t('Без разходи днес 🦴'), onPress: feed } : null}
          onBubble={() => setAdviceOpen(true)}
          onStat={setStatOpen}
          bounceKey={pet.lastFedAt}
          badges={<PetChips compact status={status} onStat={setStatOpen} streak={currentStreak} onStreak={() => onTab('pet')} />}
          top={
            <>
              <MonthPill tone="room" compact year={year} month={month} onChange={onMonthChange} onOpenPicker={() => setPicker(true)} />
              <Touch style={s.gear} onPress={onOpenSettings} hitSlop={8} accessibilityLabel={t('Настройки')}>
                <Ionicons name="settings-outline" size={20} color={colors.text} />
              </Touch>
            </>
          }
        />

        <View style={s.sheet}>
          {/* Everything that matters, without scrolling: what's left, today's limit and the 50/30/20 split */}
          <Card elevated style={{ gap: 12 }}>
            <View style={s.moneyRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>
                  {free
                    ? free.free < 0
                      ? overIncome
                        ? t('Над дохода с')
                        : t('Изхарчени от спестяванията')
                      : t('Свободни до {0} {1}', { 0: ov.progress.daysInMonth, 1: monthLower(month) })
                    : ov.remaining < 0
                      ? t('Над дохода с')
                      : t('Остана от {0}', { 0: monthLower(month) })}
                </Text>
                <Money whole value={overIncome ? -(free.free + free.reserve) : Math.abs(heroValue)} size={32} color={heroValue < 0 ? colors.danger : colors.text} />
                {ov.income > 0 && (
                  <Touch
                    style={s.incomeLine}
                    hitSlop={8}
                    onPress={() => setIncomeOpen(true)}
                    accessibilityLabel={t('Доход {0}', { 0: moneyShort(ov.income) })}
                    accessibilityHint={t('Показва доходите за месеца')}
                  >
                    {/* With payments still due, say so: otherwise the number looks smaller than income − spent */}
                    <Text style={s.miniSub} numberOfLines={2}>
                      {[
                        t('от {0} доход', { 0: moneyShort(ov.income) }),
                        free && pending > 0 && t('{0} предстоящи', { 0: moneyShort(pending) }),
                        free && free.reserve > 0 && t('{0} за спестяване', { 0: moneyShort(free.reserve) }),
                      ].filter(Boolean).join(', ')}
                    </Text>
                    <Ionicons name="chevron-forward" size={12} color={colors.muted} />
                  </Touch>
                )}
              </View>
              {isCurrent && daily ? (
                // Over the limit: "Днес 43 €" and "7 € над лимита 36 €"; otherwise "Днес остават 29 € от 36 €"
                // Tapping it opens how the limit is calculated, with the user's own numbers
                <Touch
                  style={s.today}
                  onPress={() => setLimitOpen(true)}
                  hitSlop={8}
                  accessibilityHint={t('Показва как се смята дневният лимит')}
                  accessibilityLabel={
                    daily.over
                      ? t('Днес похарчени {0} от {1}, над лимита с {2}', { 0: moneyShort(daily.spentToday), 1: moneyShort(daily.limit), 2: moneyShort(-daily.left) })
                      : t('Днес остават {0} от {1}', { 0: moneyShort(daily.left), 1: moneyShort(daily.limit) })
                  }
                >
                  <View style={s.todayHead}>
                    <Text style={s.label}>{daily.over ? t('Днес') : t('Днес остават')}</Text>
                    <Ionicons name="information-circle-outline" size={14} color={colors.muted} />
                  </View>
                  <Money whole={Math.abs(daily.over ? daily.spentToday : daily.left) >= 100} value={daily.over ? daily.spentToday : daily.left} size={22} color={daily.over ? colors.danger : colors.savings} />
                  <Text style={[s.miniSub, daily.over && { color: colors.danger, fontWeight: '700' }]}>
                    {daily.eatenToday > 0
                      ? t('{0} от спестяванията', { 0: moneyShort(daily.eatenToday) })
                      : daily.over
                        ? t('{0} над лимита {1}', { 0: moneyShort(-daily.left), 1: limitText(daily.limit) })
                        : t('от {0}', { 0: limitText(daily.limit) })}
                  </Text>
                </Touch>
              ) : !isCurrent && ov.score != null ? (
                <View style={s.today}>
                  <Text style={s.label}>{t('Оценка')}</Text>
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
              <Pill icon="settings-outline" label={t('Задай месечния си доход')} variant="soft" onPress={onOpenSettings} />
            )}
            {/* Early warning only: the spending budget runs out before the month does at today's pace */}
            {isCurrent && forecast && free && free.free >= 0 && forecast.end < 0 && current.list.length >= 3 && (
              <View
                style={[s.forecast, { backgroundColor: colors.dangerSoft }]}
                accessible
                accessibilityLabel={t('При това темпо бюджетът свършва с {0} преди края на месеца', { 0: moneyShort(-forecast.end) })}
              >
                <Ionicons name="trending-down" size={16} color={colors.danger} />
                <Text style={s.forecastText}>
                  {t('При това темпо ще надхвърлиш бюджета с')} 
                  <Text style={{ fontWeight: '800', color: colors.danger }}>{moneyShort(-forecast.end)}</Text>
                  {forecast.daysLeft > 1 ? t('. Свали харченето с {0}/ден.', { 0: moneyShort(Math.ceil(-forecast.end / forecast.daysLeft)) }) : '.'}
                </Text>
              </View>
            )}
          </Card>

          {/* A no-spend day: started here, followed here and in the Dynamic Island */}
          {isCurrent && <SessionCard now={now} />}

          {!isCurrent && (
            <Pill
              icon="arrow-undo-outline"
              label={t('Към текущия месец')}
              variant="soft"
              style={{ alignSelf: 'center' }}
              onPress={() => onMonthChange(now.getFullYear(), now.getMonth())}
            />
          )}

          {visible.filter((key) => key !== 'plans' || upcomingSoon || activeGoal).map((key, i) => (
            <Appear key={key} index={i + 1}>
              {sections[key]()}
            </Appear>
          ))}

          <Pill icon="options-outline" label={t('Подреди началото')} variant="outline" style={s.layoutBtn} onPress={() => setLayoutOpen(true)} />
        </View>
      </Animated.ScrollView>

      {/* Docked header: the dog stays visible while scrolling */}
      <DockHeader
        ref={dock}
        opacity={dockOpacity}
        onPress={scrollTop}
        topInset={insets.top}
        pet={pet}
        expression={status.expression}
        stageKey={status.stage.key}
        bubble={bubble}
        remaining={heroValue}
        todayLeft={isCurrent && daily ? daily.left : null}
      />

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
        onEdit={(e) => {
          setIncomeOpen(false);
          openAdd({ editIncome: e });
        }}
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
      <LimitSheet visible={limitOpen} onClose={() => setLimitOpen(false)} daily={daily} now={now} />
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
  todayHead: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  todayValue: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  split: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2, backgroundColor: c.faint },
  legend: { flexDirection: 'row', gap: 8 },
  legendItem: { flex: 1, gap: 2 },
  legendHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 3 },
  legendName: { color: c.text, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  legendValue: { color: c.muted, fontSize: 12 },
  incomeLine: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', marginTop: 2 },
  forecast: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  forecastText: { flex: 1, color: c.text, fontSize: 13, lineHeight: 18 },
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
  dockShadow: {
    backgroundColor: c.roomTo, borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    shadowColor: '#4A2A14', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  dock: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 10,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden',
  },
  dockPet: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  dockName: { color: c.text, fontSize: 14, fontWeight: '800' },
  dockSub: { color: c.muted, fontSize: 12 },
  dockAmount: { color: c.text, fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
}));
