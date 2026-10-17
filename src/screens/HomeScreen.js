import React, { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors, BUCKETS, MONTHS, money, pct, radius } from '../theme';
import { monthOverview, sortByDateDesc } from '../budget';
import { petStatus, EXPRESSIONS, expressionFor } from '../pet/logic';
import { getAdvice } from '../pet/advice';
import { sameDay, plural } from '../format';
import { tapFeedback } from '../haptics';
import useNow from '../hooks/useNow';
import GradientHero from '../components/ui/GradientHero';
import Money from '../components/ui/Money';
import Pill from '../components/ui/Pill';
import Card from '../components/ui/Card';
import IconBadge from '../components/ui/IconBadge';
import Segmented from '../components/ui/Segmented';
import Bar from '../components/Bar';
import Pet from '../pet/Pet';
import PetCard from '../components/PetCard';
import MonthPill from '../components/MonthPill';
import MonthPickerSheet from '../components/MonthPickerSheet';
import ExpenseRow from '../components/ExpenseRow';
import ExpenseList from '../components/ExpenseList';
import ExpenseDetailSheet, { confirmDelete } from '../components/ExpenseDetailSheet';
import AdviceSheet from '../components/AdviceSheet';
import IncomeSheet from '../components/IncomeSheet';
import Touch from '../components/ui/Touch';
import PetStatSheet from '../components/PetStatSheet';
import LayoutSheet from '../components/LayoutSheet';
import { TodayCard, TopCategoriesCard } from '../components/HomeCards';
import useStatusScrim from '../hooks/useStatusScrim';
import { normalizeLayout } from '../homeLayout';

const RECENT = 10;
const MONTH_EMOJI = { ecstatic: '🤩', happy: '🐶', worried: '😟', sad: '😢', crying: '😭' };

function BucketRow({ bucket, actual, income }) {
  const b = BUCKETS[bucket];
  const target = income * b.target;
  const isSavings = bucket === 'savings';
  const left = target - actual;
  const over = !isSavings && left < 0;
  return (
    <View style={s.bucket}>
      <View style={s.bucketTop}>
        <IconBadge icon={b.icon} color={b.color} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={s.bucketName}>{b.label}</Text>
          <Text style={s.bucketSub}>
            {money(actual)} от {money(target)} · {pct(income ? actual / income : 0)}
          </Text>
        </View>
        <Pill
          small
          variant="soft"
          label={isSavings ? (left > 0 ? `още ${money(left)}` : 'целта е постигната') : over ? `над с ${money(-left)}` : `остават ${money(left)}`}
          style={{ backgroundColor: over ? '#FDE7EB' : isSavings && left <= 0 ? '#E3F7EF' : colors.primarySoft }}
          textStyle={{ color: over ? colors.danger : isSavings && left <= 0 ? colors.savings : colors.primary }}
        />
      </View>
      <Bar value={target ? actual / target : 0} color={over ? colors.danger : b.color} height={6} />
    </View>
  );
}

export default function HomeScreen({ year, month, onMonthChange, onOpenSettings, onAdd }) {
  const { expenses, incomes, incomeEntries, pet, homeLayout, setHomeLayout, removeExpense, removeIncome, checkInNoSpend } = useStore();
  const layout = normalizeLayout(homeLayout);
  const visible = layout.order.filter((k) => !layout.hidden.includes(k));
  const petDocked = visible[0] === 'pet';
  const now = useNow();
  const scrim = useStatusScrim(petDocked ? 110 : 0);
  const [view, setView] = useState('recent');
  const [picker, setPicker] = useState(false);
  const [selected, setSelected] = useState(null);
  const [adviceOpen, setAdviceOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [statOpen, setStatOpen] = useState(null); // 'mood' | 'fullness' | 'growth'
  const [layoutOpen, setLayoutOpen] = useState(false);

  const ov = useMemo(() => monthOverview({ expenses, incomes, incomeEntries, year, month, now }), [expenses, incomes, incomeEntries, year, month, now]);
  const status = useMemo(() => petStatus({ expenses, incomes, incomeEntries, pet, now }), [expenses, incomes, incomeEntries, pet, now]);
  const advice = useMemo(
    () => getAdvice({ expenses, incomes, incomeEntries, year, month, now, lastFedAt: pet?.lastFedAt }),
    [expenses, incomes, incomeEntries, year, month, now, pet?.lastFedAt]
  );
  const recent = useMemo(() => sortByDateDesc(ov.list).slice(0, RECENT), [ov.list]);
  // The dog always explains its mood for the current month
  const currentAdvice = useMemo(
    () =>
      ov.progress.isCurrent
        ? advice
        : getAdvice({ expenses, incomes, incomeEntries, year: now.getFullYear(), month: now.getMonth(), now, lastFedAt: pet?.lastFedAt }),
    [ov.progress.isCurrent, advice, expenses, incomes, incomeEntries, now, pet?.lastFedAt]
  );

  const { isCurrent } = ov.progress;
  const hasExpenseToday = expenses.some((e) => sameDay(e.date, now));
  const canFeed = isCurrent && !hasExpenseToday && (now.getHours() >= 18 || status.fullness < 60);
  const feed = () => {
    tapFeedback();
    checkInNoSpend();
  };

  // The dog lives in the present; for a past month it comments on that month's result
  const bubbles = isCurrent
    ? advice.map((a) => a.title)
    : [
        ov.score == null
          ? `За ${MONTHS[month].toLowerCase()} няма доход — не мога да го оценя.`
          : `${MONTHS[month]} завърши с ${ov.score}/100 ${MONTH_EMOJI[expressionFor(ov.score)]}`,
        ...advice.map((a) => a.title),
      ];

  const remove = (e) => {
    removeExpense(e.id);
    setSelected(null);
  };

  const sections = {
    pet: (docked) => (
      <PetCard
        pet={pet}
        status={status}
        docked={docked}
        bubbles={bubbles.length ? bubbles : ['Всичко е наред — гордея се с теб! 🐶']}
        canFeed={canFeed}
        onFeed={feed}
        bounceKey={pet.lastFedAt}
        onOpenAdvice={() => setAdviceOpen(true)}
        onOpenStat={setStatOpen}
      />
    ),
    advice: () =>
      advice.length > 0 ? (
        <Touch style={s.cta} onPress={() => setAdviceOpen(true)}>
          <Ionicons name="sparkles" size={18} color="#fff" />
          <Text style={s.ctaText} numberOfLines={1}>
            {pet.name} има {plural(advice.length, 'съвет', 'съвета')} за теб
          </Text>
          <View style={s.ctaBtn}>
            <Text style={s.ctaBtnText}>Виж</Text>
            <Ionicons name="chevron-forward" size={14} color="#fff" />
          </View>
        </Touch>
      ) : (
        <Card>
          <Text style={s.h2}>Съвети</Text>
          <Text style={s.muted}>Нямам забележки — всичко е наред! 🐶</Text>
        </Card>
      ),
    money: () => (
      <>
        <Text style={s.section}>Твоите пари</Text>
        <View style={s.moneyRow}>
          <Touch style={{ flex: 1 }} onPress={() => setIncomeOpen(true)}>
            <Card style={s.moneyCard}>
              <View style={s.moneyTop}>
                <IconBadge icon="cash-outline" color={colors.needs} size={40} />
                <Ionicons name="add-circle" size={26} color={colors.savings} />
              </View>
              <Text style={s.moneyLabel}>Доход</Text>
              <Money value={ov.income} size={22} />
              {ov.incomeInfo.extra > 0 && <Text style={s.moneyExtra}>вкл. +{money(ov.incomeInfo.extra)} допълнителни</Text>}
            </Card>
          </Touch>
          <Card style={s.moneyCard}>
            <IconBadge icon="card-outline" color={colors.wants} size={40} />
            <Text style={s.moneyLabel}>Похарчено</Text>
            <Money value={ov.total} size={22} />
          </Card>
        </View>
      </>
    ),
    today: () => <TodayCard ov={ov} now={now} />,
    rule: () =>
      ov.income > 0 ? (
        <Card style={{ gap: 16 }}>
          <View style={s.cardHead}>
            <Text style={s.h2}>Правило 50/30/20</Text>
            {ov.score != null && ov.list.length > 0 && <Text style={s.score}>{ov.score}/100</Text>}
          </View>
          {Object.keys(BUCKETS).map((k) => (
            <BucketRow key={k} bucket={k} actual={ov.byBucket[k]} income={ov.income} />
          ))}
        </Card>
      ) : (
        <Card>
          <Text style={s.h2}>Правило 50/30/20</Text>
          <Text style={s.muted}>Задай месечния си доход от ⚙︎, за да видиш разпределението.</Text>
        </Card>
      ),
    topCats: () => <TopCategoriesCard ov={ov} />,
    expenses: () => (
      <>
        <View style={s.listHead}>
          <Text style={[s.section, { marginBottom: 0 }]}>Разходи</Text>
          <Text style={s.listTotal}>{plural(ov.list.length, 'плащане', 'плащания')}</Text>
        </View>
        <Segmented
          options={[
            { key: 'recent', label: ov.list.length > RECENT ? `Последни ${RECENT}` : 'Последни' },
            { key: 'all', label: `Всички (${ov.list.length})` },
          ]}
          value={view}
          onChange={setView}
          style={{ marginBottom: 6 }}
        />
        {ov.list.length === 0 ? (
          <Text style={s.empty}>
            Няма разходи за {MONTHS[month].toLowerCase()}.{'\n'}Натисни + за да добавиш.
          </Text>
        ) : view === 'recent' ? (
          <Card style={{ paddingVertical: 6, marginTop: 8 }}>
            {recent.map((e, i) => (
              <View key={e.id} style={i > 0 && s.sep}>
                <ExpenseRow
                  expense={e}
                  onPress={() => setSelected(e)}
                  onLongPress={() => confirmDelete(e, () => removeExpense(e.id))}
                />
              </View>
            ))}
            {ov.list.length > RECENT && (
              <Touch style={s.seeAll} onPress={() => setView('all')}>
                <Text style={s.seeAllText}>Виж всички {ov.list.length}</Text>
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
      </>
    ),
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false} onScroll={scrim.onScroll} scrollEventThrottle={32}>
        {/* The header color also behind the iOS top "bounce" */}
        <View style={s.overscroll} />
        <GradientHero bottomSpace={petDocked ? 118 : 60}>
          <View style={s.topRow}>
            <Touch style={s.me} onPress={() => setAdviceOpen(true)} accessibilityLabel={`${pet.name}, съветите на кучето`}>
              <View style={s.avatar}>
                <Pet expression={status.expression} stage={status.stage.key} size={46} animate={false} />
              </View>
              <View>
                <Text style={s.meName}>{pet.name}</Text>
                <Text style={s.meSub}>
                  {status.stage.name} · {EXPRESSIONS[status.expression].label.toLowerCase()}
                </Text>
              </View>
            </Touch>
            <Touch style={s.round} onPress={onOpenSettings} hitSlop={8} accessibilityLabel="Настройки">
              <Ionicons name="settings-outline" size={20} color="#fff" />
            </Touch>
          </View>

          <View style={{ marginTop: 18 }}>
            <MonthPill year={year} month={month} onChange={onMonthChange} onOpenPicker={() => setPicker(true)} />
          </View>

          <Text style={s.heroLabel}>{ov.remaining < 0 ? 'Над дохода с' : isCurrent ? 'Остават' : 'Остана'}</Text>
          <Money value={Math.abs(ov.remaining)} size={46} color="#fff" style={{ textAlign: 'center' }} />
          <Pill
            small
            variant="glass"
            style={{ alignSelf: 'center', marginTop: 10 }}
            icon={isCurrent ? 'calendar-outline' : 'ribbon-outline'}
            label={
              !ov.income
                ? 'задай доход от ⚙︎'
                : isCurrent
                  ? `≈ ${money(ov.perDay)}/ден · ${plural(ov.progress.daysLeft, 'ден', 'дни')}`
                  : `оценка ${ov.score}/100`
            }
          />
        </GradientHero>

        <View style={s.sheet} onLayout={scrim.onSheetLayout}>
          {visible.map((key, i) => (
            <View key={key} style={i > 0 && { marginTop: 22 }}>
              {sections[key](i === 0)}
              {i === 0 && !isCurrent && (
                <Pill
                  icon="arrow-undo-outline"
                  label="Към текущия месец"
                  variant="soft"
                  style={{ alignSelf: 'center', marginTop: 14 }}
                  onPress={() => onMonthChange(now.getFullYear(), now.getMonth())}
                />
              )}
            </View>
          ))}

          <Pill
            icon="options-outline"
            label="Подреди началото"
            variant="outline"
            style={s.layoutBtn}
            onPress={() => setLayoutOpen(true)}
          />
        </View>
      </ScrollView>
      {scrim.overlay}

      <MonthPickerSheet
        visible={picker}
        onClose={() => setPicker(false)}
        expenses={expenses}
        year={year}
        month={month}
        onSelect={onMonthChange}
      />
      <ExpenseDetailSheet expense={selected} onClose={() => setSelected(null)} onDelete={() => remove(selected)} />
      <IncomeSheet
        visible={incomeOpen}
        onClose={() => setIncomeOpen(false)}
        info={ov.incomeInfo}
        year={year}
        month={month}
        onDelete={removeIncome}
        onAdd={() => {
          setIncomeOpen(false);
          // iOS won't present a new modal while this one is still closing
          setTimeout(() => onAdd({ mode: 'income' }), 450);
        }}
      />
      <PetStatSheet
        stat={statOpen}
        onClose={() => setStatOpen(null)}
        status={status}
        pet={pet}
        advice={currentAdvice}
        canFeed={isCurrent ? canFeed : !expenses.some((e) => sameDay(e.date, now))}
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

const s = StyleSheet.create({
  overscroll: { position: 'absolute', top: -1000, left: 0, right: 0, height: 1000, backgroundColor: colors.heroFrom },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  me: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
  },
  meName: { color: '#fff', fontSize: 16, fontWeight: '800' },
  meSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 1 },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 20, marginBottom: 2 },
  sheet: {
    backgroundColor: colors.bg, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet,
    marginTop: -36, paddingHorizontal: 20, paddingTop: 18, minHeight: 600,
  },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.ink,
    borderRadius: radius.pill, paddingVertical: 10, paddingLeft: 18, paddingRight: 10,
  },
  ctaText: { flex: 1, color: '#fff', fontSize: 14.5, fontWeight: '700' },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  ctaBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  section: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  muted: { color: colors.muted, fontSize: 13, marginTop: 6 },
  layoutBtn: { alignSelf: 'center', marginTop: 26, borderColor: colors.faint },
  moneyRow: { flexDirection: 'row', gap: 12 },
  moneyCard: { flex: 1, gap: 6 },
  moneyLabel: { color: colors.muted, fontSize: 13, marginTop: 6 },
  moneyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  moneyExtra: { color: colors.savings, fontSize: 11.5, fontWeight: '600' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h2: { color: colors.text, fontSize: 16, fontWeight: '700' },
  score: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  bucket: { gap: 10 },
  bucketTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bucketName: { color: colors.text, fontSize: 14.5, fontWeight: '700' },
  bucketSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  listTotal: { color: colors.muted, fontSize: 13 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 30, lineHeight: 22 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.faint },
  seeAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.faint },
  seeAllText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
