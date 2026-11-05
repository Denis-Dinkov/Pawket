import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Animated } from 'react-native';
import { motionReduced, SPRING } from '../motion';
import Appear from '../components/ui/Appear';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/ui/AppText';
import { useStore } from '../store';
import { colors, radius, currentColorScheme } from '../theme';
import { petStatus, STAGES, STAGE_PERKS, dayKey } from '../pet/logic';
import { getAdvice } from '../pet/advice';
import { petLine } from '../pet/lines';
import { dailyLimit } from '../budget';
import { pendingSpend } from '../plans';
import Pet from '../pet/Pet';
import { ItemPreview } from '../pet/Accessories';
import { outfitOf } from '../pet/outfit';
import { weekMissions, streak, activityDays, rewardsState, missionsTotal, weekStart, MISSION_XP } from '../pet/missions';
import { goalProgress } from '../plans';
import { plural } from '../format';
import { tapFeedback } from '../haptics';
import useNow from '../hooks/useNow';
import Card from '../components/ui/Card';
import Pill from '../components/ui/Pill';
import Touch from '../components/ui/Touch';
import Bar from '../components/Bar';
import PetRoom, { PetChips } from '../components/PetRoom';
import PetStatSheet from '../components/PetStatSheet';
import YearReviewSheet from '../components/YearReviewSheet';
import { AdviceCard } from '../components/AdviceSheet';
import { themed } from '../themed';
import { t, tList } from '../i18n';

// The first letter of each short day name: П В С Ч П С Н / M T W T F S S
const WEEK_SHORT = tList(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']);

// Today, while nothing is recorded yet: the empty ring breathes, asking for an entry
function Pulse({ children, active }) {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active || motionReduced()) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1.12, duration: 600, useNativeDriver: true }),
        Animated.timing(v, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, v]);
  return <Animated.View style={{ transform: [{ scale: v }] }}>{children}</Animated.View>;
}

// The streak number pops when it grows
function StreakCount({ value, children }) {
  const v = useRef(new Animated.Value(1)).current;
  const prev = useRef(value);
  useEffect(() => {
    if (value > prev.current && !motionReduced()) {
      v.setValue(1.35);
      Animated.spring(v, { toValue: 1, useNativeDriver: true, ...SPRING.playful }).start();
    }
    prev.current = value;
  }, [value, v]);
  return <Animated.View style={{ transform: [{ scale: v }] }}>{children}</Animated.View>;
}


// Charlie's own tab: his room, the streak, this week's missions, rewards and the year in review
export default function PetScreen() {
  const data = useStore();
  const { pet, expenses, incomes, incomeEntries, recurring, goals, wearItem, checkInNoSpend } = data;
  const outfit = outfitOf(pet);
  const insets = useSafeAreaInsets();
  const now = useNow();
  const [statOpen, setStatOpen] = useState(null);
  const [review, setReview] = useState(false);

  const status = useMemo(() => petStatus({ expenses, incomes, incomeEntries, pet, now }), [expenses, incomes, incomeEntries, pet, now]);
  const advice = useMemo(
    () => getAdvice({ expenses, incomes, incomeEntries, recurring, year: now.getFullYear(), month: now.getMonth(), now, lastFedAt: pet?.lastFedAt }),
    [expenses, incomes, incomeEntries, recurring, now, pet?.lastFedAt]
  );
  const days = activityDays({ expenses, incomeEntries, pet });
  const current = streak(days, now);
  const missions = weekMissions({ expenses, incomeEntries, pet, income: status.overview.income, now });
  const goalsDone = goals.filter((g) => goalProgress(g, expenses).done).length;
  const rewards = rewardsState({ pet, goalsDone });
  const start = weekStart(now);
  const activeToday = days.has(dayKey(now));
  // The same speech line as on Home, so the dog says one thing in both places
  const daily = dailyLimit(status.overview, now, pendingSpend(recurring, now));
  const openGoal = goals.map((g) => ({ g, p: goalProgress(g, expenses) })).sort((a, b) => Number(a.p.done) - Number(b.p.done))[0];
  const bubble = petLine({ status, daily, advice, activeToday, goal: openGoal && { name: openGoal.g.name, done: openGoal.p.done }, now }).text;
  const feed = () => {
    tapFeedback();
    checkInNoSpend();
  };
  // In December and January the year in review is the main thing to show
  const reviewYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={currentColorScheme() === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <View style={s.overscroll} />
        <PetRoom
          pet={pet}
          status={status}
          now={now}
          insetTop={insets.top}
          height={300}
          bubble={bubble}
          bubbleAction={!activeToday ? { label: t('Без разходи днес 🦴'), onPress: feed } : null}
          onBubble={() => setStatOpen('mood')}
          onStat={setStatOpen}
          bounceKey={pet.lastFedAt}
          top={
            <Text style={s.roomTitle} accessibilityRole="header">
              {pet.name}
            </Text>
          }
        />

        <Appear index={1} style={s.sheet}>
          <PetChips status={status} onStat={setStatOpen} />
          {/* Streak: the days this week with at least one entry */}
          <Card style={{ gap: 12 }}>
            <View style={s.head}>
              <StreakCount value={current}>
                <View style={s.flame}>
                  <Ionicons name="flame" size={22} color={colors.orange} />
                </View>
              </StreakCount>
              <View style={{ flex: 1 }}>
                <Text style={s.h2}>{t('Серия: {0} 🔥', { 0: plural(current, t('ден'), t('дни')) })}</Text>
                <Text style={s.muted}>{t('Най-дълга: {0} · запиши нещо всеки ден', { 0: plural(pet.bestStreak || current, t('ден'), t('дни')) })}</Text>
              </View>
            </View>
            <View style={s.week} accessible accessibilityLabel={t('Тази седмица: {0}', { 0: [...WEEK_SHORT].map((d) => d.charAt(0)).map((d, i) => {
              const day = new Date(start);
              day.setDate(start.getDate() + i);
              return `${d} ${days.has(dayKey(day)) ? t('да') : t('не')}`;
            }).join(', ') })}>
              {[...WEEK_SHORT].map((d) => d.charAt(0)).map((d, i) => {
                const day = new Date(start);
                day.setDate(start.getDate() + i);
                const done = days.has(dayKey(day));
                const isToday = dayKey(day) === dayKey(now);
                return (
                  <View key={i} style={s.weekDay}>
                    <Pulse active={isToday && !done}>
                      <View style={[s.weekDot, done && s.weekDone, isToday && !done && s.weekToday]}>
                        {done && <Ionicons name="flame" size={16} color={colors.onAccent} />}
                      </View>
                    </Pulse>
                    <Text style={[s.weekLabel, isToday && { color: colors.text, fontWeight: '800' }]}>{d}</Text>
                  </View>
                );
              })}
            </View>
          </Card>

          <Text style={s.section} accessibilityRole="header">{t('Мисии тази седмица')}</Text>
          <Card style={{ gap: 14 }}>
            {missions.map((m) => (
              <View key={m.id} style={{ gap: 6 }} accessible accessibilityLabel={`${m.title}: ${m.done ? t('изпълнена') : t('{0} от {1}', { 0: m.n, 1: m.of })}`}>
                <View style={s.head}>
                  <Ionicons name={m.done ? 'checkmark-circle' : m.icon} size={22} color={m.done ? colors.savings : colors.primary} />
                  <Text style={[s.mission, m.done && { color: colors.muted }]}>{m.title}</Text>
                  <Text style={[s.xp, m.done && { color: colors.savings }]}>{m.done ? '✓' : `${m.n}/${m.of}`} · +{MISSION_XP} XP</Text>
                </View>
                {!m.done && <Bar value={m.n / m.of} color={colors.primary} height={5} />}
              </View>
            ))}
            <Text style={s.muted}>{t('Нови мисии всеки понеделник. Изпълнени досега: {0}.', { 0: missionsTotal(pet) })}</Text>
          </Card>

          <Text style={s.section} accessibilityRole="header">{t('Награди за {0}', { 0: pet.name })}</Text>
          <Text style={s.muted}>{t('Отключват се с навици, не с пари. Докосни отключена награда, за да я сложиш.')}</Text>
          <View style={s.rewards}>
            {rewards.map((r) => {
              const on = outfit[r.slot] === r.id;
              return (
                <Touch
                  key={r.id}
                  haptic={r.unlocked ? 'success' : false}
                  disabled={!r.unlocked}
                  style={[s.reward, on && s.rewardOn, !r.unlocked && { opacity: 0.55 }]}
                  onPress={() => wearItem(r.id)}
                  accessibilityLabel={`${r.name}, ${r.slot === 'head' ? t('на главата') : t('на врата')}, ${r.unlocked ? (on ? t('сложена') : t('отключена')) : t('заключена: {0}', { 0: r.need })}`}
                  accessibilityState={{ selected: on, disabled: !r.unlocked }}
                >
                  {r.unlocked ? <ItemPreview id={r.id} size={44} /> : (
                    <View style={s.lock}>
                      <Ionicons name="lock-closed" size={20} color={colors.muted} />
                    </View>
                  )}
                  <Text style={s.rewardName} numberOfLines={2}>{r.name}</Text>
                  <Text style={[s.rewardNeed, on && { color: colors.primary, fontWeight: '700' }]} numberOfLines={2}>
                    {r.unlocked ? (on ? t('Сложена') : r.slot === 'head' ? t('За главата') : t('За врата')) : r.need}
                  </Text>
                </Touch>
              );
            })}
          </View>
          <Text style={s.muted}>{t('Може по едно нещо на главата и едно на врата.')}</Text>

          {/* Growth: four little Charlies, what each stage adds, and how far the next one is */}
          <Text style={s.section} accessibilityRole="header">{t('Растеж')}</Text>
          <Card style={{ gap: 14 }}>
            <View style={s.path}>
              {STAGES.map((st, i) => {
                const reached = (pet.xp || 0) >= st.xp;
                const isCurrent = status.stage.key === st.key;
                return (
                  <View
                    key={st.key}
                    style={[s.step, isCurrent && s.stepOn]}
                    accessible
                    accessibilityLabel={`${st.name}, ${st.xp} XP${reached ? (isCurrent ? t(', сегашният етап') : t(', достигнат')) : t(', предстои')}. ${STAGE_PERKS[st.key]}`}
                  >
                    <View style={[s.stepPet, !reached && { opacity: 0.5 }]}>
                      <Pet expression="happy" stage={st.key} size={58} animate={false} />
                    </View>
                    <Text style={[s.stepName, !reached && { color: colors.muted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                      {st.name}
                    </Text>
                    <Text style={s.stepXp}>{i === 0 ? t('старт') : `${st.xp} XP`}</Text>
                  </View>
                );
              })}
            </View>
            <Bar value={status.progress} color={colors.needs} height={6} label={`${pet.xp || 0} XP`} />
            <Text style={s.muted}>
              {status.next
                ? t('{0} XP · още {1} до „{2}“. Ще получи: {3}.', { 0: pet.xp || 0, 1: status.next.xp - (pet.xp || 0), 2: status.next.name, 3: STAGE_PERKS[status.next.key] })
                : t('{0} XP · най-високият етап. {1} носи корона.', { 0: pet.xp || 0, 1: pet.name })}
            </Text>
          </Card>

          <Touch onPress={() => setReview(true)}>
            <Card style={s.reviewCard}>
              <Ionicons name="calendar" size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.h2}>{t('Твоята {0} с {1}', { 0: reviewYear, 1: pet.name })}</Text>
                <Text style={s.muted}>{t('Най-добрият месец, топ категория, спестено')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Card>
          </Touch>

          {advice.length > 0 && (
            <>
              <Text style={s.section} accessibilityRole="header">{t('Съвети')}</Text>
              <View style={{ gap: 12 }}>
                {advice.map((tip) => (
                  <AdviceCard key={tip.id} tip={tip} />
                ))}
              </View>
            </>
          )}
        </Appear>
      </ScrollView>

      <PetStatSheet
        stat={statOpen}
        onClose={() => setStatOpen(null)}
        status={status}
        pet={pet}
        advice={advice}
        canFeed={!activeToday}
        onFeed={feed}
        now={now}
      />
      <YearReviewSheet visible={review} onClose={() => setReview(false)} year={reviewYear} data={data} pet={pet} stage={status.stage.key} />
    </View>
  );
}

const s = themed((c) => ({
  overscroll: { position: 'absolute', top: -1000, left: 0, right: 0, height: 1000, backgroundColor: c.roomFrom },
  roomTitle: { color: c.text, fontSize: 26, fontWeight: '800', paddingTop: 8 },
  sheet: {
    backgroundColor: c.bg, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet,
    marginTop: -30, paddingHorizontal: 16, paddingTop: 16, gap: 12,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flame: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.warningSoft, alignItems: 'center', justifyContent: 'center' },
  h2: { color: c.text, fontSize: 16, fontWeight: '700' },
  muted: { color: c.muted, fontSize: 13, lineHeight: 18 },
  section: { color: c.text, fontSize: 18, fontWeight: '800', marginTop: 10 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 4 },
  weekDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.faint, alignItems: 'center', justifyContent: 'center' },
  weekDone: { backgroundColor: c.orange },
  weekToday: { borderWidth: 2, borderColor: c.orange, backgroundColor: 'transparent' },
  weekLabel: { color: c.muted, fontSize: 12 },
  mission: { flex: 1, color: c.text, fontSize: 14.5, fontWeight: '600' },
  xp: { color: c.muted, fontSize: 12.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
  rewards: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  reward: {
    width: '30.8%', minHeight: 112, backgroundColor: c.card, borderRadius: radius.badge, padding: 10,
    alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 2, borderColor: 'transparent',
  },
  rewardOn: { borderColor: c.primary, backgroundColor: c.primarySoft },
  rewardName: { color: c.text, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  rewardNeed: { color: c.muted, fontSize: 11.5, textAlign: 'center' },
  lock: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.faint, alignItems: 'center', justifyContent: 'center' },
  path: { flexDirection: 'row', gap: 6 },
  step: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.badge, borderWidth: 2, borderColor: 'transparent', gap: 2 },
  stepOn: { borderColor: c.primary, backgroundColor: c.primarySoft },
  stepPet: { width: 58, height: 58, marginTop: 10 },
  stepName: { color: c.text, fontSize: 12, fontWeight: '700' },
  stepXp: { color: c.muted, fontSize: 11, fontVariant: ['tabular-nums'] },
  reviewCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
}));
