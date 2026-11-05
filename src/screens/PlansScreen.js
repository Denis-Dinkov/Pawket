import React, { useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '../components/ui/AppText';
import { useStore } from '../store';
import { colors, money, pct, radius, categoryById, BUCKETS, MONTHS, currentColorScheme } from '../theme';
import { cleanAmountInput, dayLabel, dayOrdinal } from '../format';
import { goalProgress, monthlyNeeded, upcomingPayments, GOAL_ICONS, averageNeeds, wishHoursLeft, FUND_PRESETS } from '../plans';
import Appear from '../components/ui/Appear';
import Card from '../components/ui/Card';
import IconBadge from '../components/ui/IconBadge';
import Pill from '../components/ui/Pill';
import Touch from '../components/ui/Touch';
import Sheet from '../components/ui/Sheet';
import Bar from '../components/Bar';
import Segmented from '../components/ui/Segmented';
import { themed } from '../themed';

const parseMoney = (t) => parseFloat(String(t).replace(/\s/g, '').replace(',', '.')) || 0;
const toText = (n) => (n ? String(n).replace('.', ',') : '');

function AmountField({ value, onChange, label, autoFocus }) {
  return (
    <View style={s.amountRow}>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(cleanAmountInput(t))}
        placeholder="0"
        placeholderTextColor={colors.placeholder}
        keyboardType="decimal-pad"
        style={s.amountInput}
        maxLength={10}
        autoFocus={autoFocus}
        accessibilityLabel={label}
        maxFontSizeMultiplier={1.3}
      />
      <Text style={s.currency}>€</Text>
    </View>
  );
}

// Create or edit a goal: name, icon, amount and an optional month to reach it by
const KINDS = [
  { key: 'goal', label: 'Цел' },
  { key: 'fund', label: 'Касичка' },
  { key: 'emergency', label: 'Авариен фонд' },
];

function GoalSheet({ goal, visible, onClose, onSave, onDelete, needs = 0, preset }) {
  const [kind, setKind] = useState(goal?.kind || preset?.kind || 'goal');
  const [name, setName] = useState(goal?.name || preset?.name || '');
  const [icon, setIcon] = useState(goal?.icon || preset?.icon || GOAL_ICONS[0]);
  const [target, setTarget] = useState(toText(goal?.target || preset?.target));
  const [cover, setCover] = useState(3); // months of needs for the emergency fund
  const pickKind = (k) => {
    setKind(k);
    if (k === 'emergency') {
      setName('Авариен фонд');
      setIcon('umbrella');
      setTarget(toText(Math.ceil((needs * cover) / 10) * 10));
    }
    if (k === 'fund' && months === 0) setMonths(12);
  };
  const [months, setMonths] = useState(() => {
    if (!goal?.deadline) return 0;
    const d = new Date(goal.deadline);
    const now = new Date();
    return Math.max(0, (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth());
  });
  const valid = name.trim() && parseMoney(target) > 0;
  const kindHint = {
    goal: 'Нещо, за което спестяваш: ваканция, телефон, курс.',
    fund: 'Годишен разход, който винаги изненадва. Делиш го на месеци и плащаш от касичката, когато дойде.',
    emergency: needs > 0 ? `Резерв за ${cover} месеца нужди. Средно харчиш ${money(Math.round(needs))} на месец за нужди.` : 'Резерв за 3 до 6 месеца нужди.',
  }[kind];
  const deadline = months ? new Date(new Date().getFullYear(), new Date().getMonth() + months, 1) : null;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      footer={
        <Touch
          haptic="success"
          disabled={!valid}
          style={[s.primaryBtn, !valid && { opacity: 0.4 }]}
          onPress={() => onSave({ name, icon, kind: kind === 'goal' ? null : kind, target: parseMoney(target), deadline: deadline?.toISOString() || null })}
        >
          <Text style={s.primaryBtnText}>{goal ? 'Запази' : 'Създай цел'}</Text>
        </Touch>
      }
    >
      <Text style={s.sheetTitle}>{goal ? 'Редакция' : 'Ново спестяване'}</Text>
      {!goal && <Segmented options={KINDS} value={kind} onChange={pickKind} />}
      <Text style={[s.hint, { marginTop: 8 }]}>{kindHint}</Text>
      {kind === 'emergency' && !goal && (
        <View style={[s.chipRow, { marginTop: 8 }]}>
          {[3, 6].map((m) => (
            <Pill
              key={m}
              small
              haptic="select"
              label={`${m} месеца`}
              variant={cover === m ? 'active' : 'outline'}
              onPress={() => {
                setCover(m);
                setTarget(toText(Math.ceil((needs * m) / 10) * 10));
              }}
            />
          ))}
        </View>
      )}
      {kind === 'fund' && !goal && (
        <View style={[s.chipRow, { marginTop: 8 }]}>
          {FUND_PRESETS.map((f) => (
            <Pill
              key={f.name}
              small
              haptic="select"
              icon={f.icon}
              label={f.name}
              variant={name === f.name ? 'active' : 'outline'}
              onPress={() => {
                setName(f.name);
                setIcon(f.icon);
              }}
            />
          ))}
        </View>
      )}
      <Text style={s.label}>{kind === 'fund' ? 'Колко струва годишно?' : 'За какво спестяваш?'}</Text>
      <TextInput value={name} onChangeText={setName} placeholder="напр. Ваканция" placeholderTextColor={colors.muted} style={s.textInput} maxLength={30} />
      <Text style={s.label}>Сума</Text>
      <AmountField value={target} onChange={setTarget} label="Целева сума в евро" />
      <Text style={s.label}>Срок</Text>
      <View style={s.chipRow}>
        {(kind === 'fund' ? [3, 6, 9, 12] : [0, 3, 6, 12]).map((m) => (
          <Pill key={m} small haptic="select" label={m ? `${m} месеца` : 'Без срок'} variant={months === m ? 'active' : 'outline'} onPress={() => setMonths(m)} />
        ))}
      </View>
      {deadline && (
        <Text style={s.hint}>
          До {MONTHS[deadline.getMonth()].toLowerCase()} {deadline.getFullYear()}
          {parseMoney(target) > 0 ? ` · ≈ ${money(Math.ceil(parseMoney(target) / months))} на месец` : ''}
        </Text>
      )}
      <Text style={s.label}>Икона</Text>
      <View style={s.iconGrid}>
        {GOAL_ICONS.map((ic) => (
          <Touch
            key={ic}
            haptic="select"
            onPress={() => setIcon(ic)}
            style={[s.iconCell, ic === icon && { borderColor: colors.savings, backgroundColor: colors.savingsSoft }]}
            accessibilityLabel={ic}
            accessibilityState={{ selected: ic === icon }}
          >
            <Ionicons name={ic} size={22} color={ic === icon ? colors.savings : colors.muted} />
          </Touch>
        ))}
      </View>
      {goal && (
        <Pill icon="trash-outline" label="Изтрий целта" variant="outline" textStyle={{ color: colors.danger }} style={s.deleteBtn} onPress={onDelete} />
      )}
    </Sheet>
  );
}

// New wish: it waits 48 hours before it can be bought
function WishSheet({ visible, onClose, onSave }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const v = parseMoney(amount);
  const valid = name.trim() && v > 0;
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      footer={
        <Touch haptic="success" disabled={!valid} style={[s.primaryBtn, !valid && { opacity: 0.4 }]} onPress={() => onSave({ name, amount: v })}>
          <Text style={s.primaryBtnText}>Изчакай 48 часа</Text>
        </Touch>
      }
    >
      <Text style={s.sheetTitle}>Ново желание</Text>
      <Text style={[s.hint, { textAlign: 'center' }]}>Записваш го сега, решаваш след 2 дни. Често желанието минава само, а парите отиват в цел.</Text>
      <Text style={s.label}>Какво искаш?</Text>
      <TextInput value={name} onChangeText={setName} placeholder="напр. Слушалки" placeholderTextColor={colors.muted} style={s.textInput} maxLength={40} />
      <Text style={s.label}>Цена</Text>
      <AmountField value={amount} onChange={setAmount} label="Цена в евро" />
    </Sheet>
  );
}

// Put money aside: it's booked as an expense in "Savings", so it counts towards the 20%.
// Money the user already had (another account, old savings) fills the goal without touching this month.
function DepositSheet({ goal, visible, onClose, onSave, saved }) {
  const [amount, setAmount] = useState('');
  const [from, setFrom] = useState('new');
  const left = goal ? Math.max(0, goal.target - saved) : 0;
  const v = parseMoney(amount);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      footer={
        <Touch haptic="success" disabled={!(v > 0)} style={[s.primaryBtn, s.savingsBtn, !(v > 0) && { opacity: 0.4 }]} onPress={() => onSave(v, { existing: from === 'existing' })}>
          <Text style={s.primaryBtnText}>{v > 0 ? `Задели ${money(v)}` : 'Въведи сума'}</Text>
        </Touch>
      }
    >
      <Text style={s.sheetTitle}>Към „{goal?.name}“</Text>
      <Segmented
        options={[
          { key: 'new', label: 'От този месец' },
          { key: 'existing', label: 'Вече ги имам' },
        ]}
        value={from}
        onChange={setFrom}
        style={{ marginTop: 6, marginBottom: 10 }}
      />
      <Text style={[s.hint, { textAlign: 'center' }]}>
        Остават {money(left)}.{' '}
        {from === 'existing'
          ? 'Пари от друга сметка или стари спестявания: пълнят целта, но не намаляват бюджета за месеца.'
          : 'Сумата се записва в „Спестявания“ и се брои към 20% за месеца.'}
      </Text>
      <AmountField value={amount} onChange={setAmount} label="Сума в евро" autoFocus />
      <View style={[s.chipRow, { justifyContent: 'center' }]}>
        {[20, 50, 100].map((n) => (
          <Pill key={n} small haptic="select" label={money(n)} variant="outline" onPress={() => setAmount(String(n))} />
        ))}
        {left > 0 && <Pill small haptic="select" label={`Всичко ${money(left)}`} variant="outline" onPress={() => setAmount(toText(Math.round(left * 100) / 100))} />}
      </View>
    </Sheet>
  );
}

function RecurringSheet({ rule, visible, onClose, onSave, onDelete }) {
  const [amount, setAmount] = useState(toText(rule?.amount));
  const [day, setDay] = useState(rule?.day || 1);
  const cat = rule && categoryById(rule.categoryId);
  if (!rule) return null;
  const v = parseMoney(amount);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      footer={
        <Touch haptic="success" disabled={!(v > 0)} style={[s.primaryBtn, !(v > 0) && { opacity: 0.4 }]} onPress={() => onSave({ amount: v, day })}>
          <Text style={s.primaryBtnText}>Запази</Text>
        </Touch>
      }
    >
      <View style={s.ruleHead}>
        <IconBadge icon={cat?.icon || 'repeat'} color={BUCKETS[cat?.bucket]?.color || colors.muted} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={s.sheetTitle}>{rule.merchant || rule.note || cat?.name}</Text>
          <Text style={s.hint}>{cat?.name} · всеки месец</Text>
        </View>
      </View>
      <Text style={s.label}>Сума</Text>
      <AmountField value={amount} onChange={setAmount} label="Сума в евро" />
      <Text style={s.label}>Число от месеца</Text>
      <View style={s.dayRow}>
        <Touch style={s.stepBtn} onPress={() => setDay((d) => Math.max(1, d - 1))} accessibilityLabel="По-рано">
          <Ionicons name="remove" size={20} color={colors.text} />
        </Touch>
        <Text style={s.dayText} accessibilityLiveRegion="polite">{dayOrdinal(day)} число</Text>
        <Touch style={s.stepBtn} onPress={() => setDay((d) => Math.min(31, d + 1))} accessibilityLabel="По-късно">
          <Ionicons name="add" size={20} color={colors.text} />
        </Touch>
      </View>
      <Text style={s.hint}>При по-кратък месец се записва на последния ден.</Text>
      <View style={[s.chipRow, { justifyContent: 'center', marginTop: 18 }]}>
        <Pill
          icon={rule.paused ? 'play' : 'pause'}
          label={rule.paused ? 'Продължи' : 'Спри временно'}
          variant="outline"
          onPress={() => onSave({ paused: !rule.paused })}
        />
        <Pill icon="trash-outline" label="Премахни" variant="outline" textStyle={{ color: colors.danger }} onPress={onDelete} />
      </View>
      <Text style={[s.hint, { textAlign: 'center' }]}>Записаните вече плащания остават.</Text>
    </Sheet>
  );
}

// "март", or "март 2027" when the deadline isn't this year
const deadlineLabel = (iso) => {
  const d = new Date(iso);
  const name = MONTHS[d.getMonth()].toLowerCase();
  return d.getFullYear() === new Date().getFullYear() ? name : `${name} ${d.getFullYear()}`;
};

export default function PlansScreen({ onAdd }) {
  const { goals, recurring, expenses, wishes, addGoal, updateGoal, removeGoal, contributeGoal, updateRecurring, removeRecurring, showToast, addWish, resolveWish, removeWish } =
    useStore();
  const [wishOpen, setWishOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const now = new Date();
  const needs = useMemo(() => averageNeeds(expenses, now), [expenses]);
  const openWishes = wishes.filter((w) => !w.decision);
  const firstGoal = goals.map((g) => ({ g, p: goalProgress(g, expenses) })).find((x) => !x.p.done)?.g;
  const hasEmergency = goals.some((g) => g.kind === 'emergency');
  const [goalEdit, setGoalEdit] = useState(null); // goal | 'new' | null
  const [deposit, setDeposit] = useState(null);
  const [ruleEdit, setRuleEdit] = useState(null);

  const list = useMemo(() => goals.map((g) => ({ g, ...goalProgress(g, expenses) })), [goals, expenses]);
  const upcoming = upcomingPayments(recurring, now);
  const paused = recurring.filter((r) => r.paused);
  const monthlyTotal = recurring.filter((r) => !r.paused).reduce((a, r) => a + r.amount, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={currentColorScheme() === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={[s.container, { paddingTop: insets.top + 20 }]} showsVerticalScrollIndicator={false}>
        <Text style={s.title} accessibilityRole="header">Планове</Text>

        {/* Recurring payments first: they shape every month */}
        <View style={s.sectionHead}>
          <Text style={s.section} accessibilityRole="header">Повтарящи се плащания</Text>
          {monthlyTotal > 0 && <Text style={s.hint}>{money(monthlyTotal)}/месец</Text>}
        </View>
        {recurring.length === 0 ? (
          <Card style={s.emptyCard}>
            <Ionicons name="repeat" size={30} color={colors.primary} />
            <Text style={s.emptyTitle}>Наем, сметки, абонаменти</Text>
            <Text style={s.hintCenter}>При нов разход включи „Всеки месец“ и той ще се записва сам. Дневният лимит вече ги смята предварително.</Text>
            <Pill icon="add" label="Нов разход" variant="ink" onPress={() => onAdd({})} />
          </Card>
        ) : (
          <Card style={{ paddingVertical: 4 }}>
            {[...upcoming.map((u) => ({ rule: u.rule, date: u.date })), ...paused.map((r) => ({ rule: r, date: null }))].map(({ rule, date }, i) => {
              const cat = categoryById(rule.categoryId);
              return (
                <Touch key={rule.id} style={[s.ruleRow, i > 0 && s.sep]} onPress={() => setRuleEdit(rule)}>
                  <IconBadge icon={cat?.icon || 'repeat'} color={BUCKETS[cat?.bucket]?.color || colors.muted} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.ruleName, rule.paused && { color: colors.muted }]} numberOfLines={1}>
                      {rule.merchant || rule.note || cat?.name}
                    </Text>
                    <Text style={s.hint}>{rule.paused ? 'Спряно' : `Следващо: ${dayLabel(date.toISOString(), now)}`}</Text>
                  </View>
                  <Text style={s.ruleAmount}>{money(rule.amount)}</Text>
                </Touch>
              );
            })}
          </Card>
        )}

        <View style={s.sectionHead}>
          <Text style={s.section} accessibilityRole="header">Цели и касички</Text>
          <Pill small icon="add" label="Нова" variant="soft" onPress={() => setGoalEdit('new')} />
        </View>
        {!hasEmergency && needs > 0 && (
          <Touch onPress={() => setGoalEdit({ preset: { kind: 'emergency' } })}>
            <Card style={[s.goalHead, { borderColor: colors.needs }]}>
              <IconBadge icon="umbrella" color={colors.needs} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={s.goalName}>Създай авариен фонд</Text>
                <Text style={s.hint}>3 месеца нужди ≈ {money(Math.ceil((needs * 3) / 10) * 10)}. Спокойствие при неочакван разход.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Card>
          </Touch>
        )}
        {list.length === 0 ? (
          <Card style={s.emptyCard}>
            <Ionicons name="flag-outline" size={30} color={colors.savings} />
            <Text style={s.emptyTitle}>Спестявай за нещо конкретно</Text>
            <Text style={s.hintCenter}>Ваканция, нов телефон, резерв за 3 месеца. Парите, които слагаш, се броят към 20% спестявания.</Text>
            <Pill icon="add" label="Създай цел" variant="ink" onPress={() => setGoalEdit('new')} />
          </Card>
        ) : (
          list.map(({ g, saved, left, progress, done }) => {
            const perMonth = monthlyNeeded(g, saved, now);
            return (
              <Card key={g.id} style={s.goal}>
                <Touch style={s.goalHead} onPress={() => setGoalEdit(g)} accessibilityHint="Редактира целта">
                  <IconBadge icon={done ? 'trophy' : g.icon} color={colors.savings} size={44} solid={done} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.goalName}>
                      {g.name}
                      {g.kind === 'fund' ? '  · касичка' : g.kind === 'emergency' ? `  · ${needs > 0 ? `${(saved / needs).toFixed(1).replace('.', ',')} мес.` : 'резерв'}` : ''}
                    </Text>
                    <Text style={s.hint}>
                      {money(saved)} от {money(g.target)}
                      {g.deadline ? ` · до ${deadlineLabel(g.deadline)}` : ''}
                    </Text>
                  </View>
                  <Text style={[s.goalPct, done && { color: colors.savings }]}>{pct(progress)}</Text>
                </Touch>
                <Bar value={progress} color={colors.savings} height={8} label={`${g.name}: ${pct(progress)}`} />
                <View style={s.goalFoot}>
                  <Text style={[s.hint, { flex: 1 }]}>
                    {done ? 'Постигната! 🎉' : perMonth ? `≈ ${money(Math.ceil(perMonth))} на месец до срока` : `Остават ${money(left)}`}
                  </Text>
                  {/* Paying the cost out of the goal doesn't count as spending again */}
                  {saved > 0 && (
                    <Pill
                      small
                      icon="card-outline"
                      label="Плати"
                      variant="outline"
                      onPress={() => onAdd({ fromGoalId: g.id, note: g.name })}
                      accessibilityLabel={`Плати от „${g.name}“`}
                    />
                  )}
                  {!done && <Pill small icon="add" label="Задели" variant="ink" onPress={() => setDeposit(g)} />}
                </View>
              </Card>
            );
          })
        )}

        {/* The 48-hour wishlist */}
        <View style={s.sectionHead}>
          <Text style={s.section} accessibilityRole="header">Желания · 48 часа</Text>
          <Pill small icon="add" label="Желание" variant="soft" onPress={() => setWishOpen(true)} />
        </View>
        {openWishes.length === 0 ? (
          <Appear index={1}>
            <Card style={s.emptyCard}>
              <Ionicons name="hourglass-outline" size={28} color={colors.wants} />
              <Text style={s.emptyTitle}>Искаш нещо скъпо?</Text>
              <Text style={s.hintCenter}>Запиши го тук и изчакай 2 дни. Ако още го искаш — купуваш. Ако не — парите отиват в цел.</Text>
            </Card>
          </Appear>
        ) : (
          openWishes.map((w, i) => {
            const left = wishHoursLeft(w, now);
            return (
              <Appear key={w.id} index={i + 1}>
                <Card style={{ gap: 10 }}>
                  <View style={s.goalHead}>
                    <IconBadge icon={left ? 'hourglass' : 'checkmark-done'} color={colors.wants} size={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.goalName}>{w.name}</Text>
                      <Text style={s.hint}>{left ? `Още ${left} ч. до решението` : 'Мина 48 часа. Още ли го искаш?'}</Text>
                    </View>
                    <Text style={s.goalPct}>{money(w.amount)}</Text>
                  </View>
                  {left > 0 ? (
                    <Bar value={1 - left / 48} color={colors.wants} height={6} label={`Изчакани ${48 - left} от 48 часа`} />
                  ) : (
                    <View style={s.chipRow}>
                      <Pill
                        icon="heart-dislike-outline"
                        label={firstGoal ? `Отказвам се · към „${firstGoal.name}“` : 'Отказвам се'}
                        variant="ink"
                        onPress={() => resolveWish(w.id, 'skipped', firstGoal)}
                      />
                      <Pill
                        icon="bag-check-outline"
                        label="Купувам"
                        variant="outline"
                        // The wish is marked as bought only when the expense is saved, so "Отказ" keeps it
                        onPress={() => onAdd({ amount: w.amount, merchant: '', note: w.name, categoryId: w.categoryId, wishId: w.id })}
                      />
                    </View>
                  )}
                  {left > 0 && (
                    <Touch hitSlop={8} onPress={() => removeWish(w.id)} style={{ alignSelf: 'flex-start' }}>
                      <Text style={[s.hint, { color: colors.primary, fontWeight: '700' }]}>Премахни</Text>
                    </Touch>
                  )}
                </Card>
              </Appear>
            );
          })
        )}
      </ScrollView>

      <GoalSheet
        key={`goal-${goalEdit === 'new' ? 'new' : goalEdit?.preset ? 'preset' : goalEdit?.id || 'closed'}`}
        goal={goalEdit && goalEdit !== 'new' && !goalEdit.preset ? goalEdit : null}
        preset={goalEdit?.preset ? { ...goalEdit.preset, name: 'Авариен фонд', icon: 'umbrella', target: Math.ceil((needs * 3) / 10) * 10 } : null}
        needs={needs}
        visible={!!goalEdit}
        onClose={() => setGoalEdit(null)}
        onSave={(g) => {
          if (goalEdit === 'new' || goalEdit.preset) addGoal(g);
          else updateGoal(goalEdit.id, g);
          setGoalEdit(null);
        }}
        onDelete={() => {
          removeGoal(goalEdit.id);
          setGoalEdit(null);
          showToast({ text: 'Целта е изтрита. Спестените пари остават в „Спестявания“.', icon: 'trash-outline' });
        }}
      />
      <WishSheet
        key={`wish-${wishOpen ? 'open' : 'closed'}`}
        visible={wishOpen}
        onClose={() => setWishOpen(false)}
        onSave={(w) => {
          addWish(w);
          setWishOpen(false);
        }}
      />
      <DepositSheet
        key={`deposit-${deposit?.id || 'closed'}`}
        goal={deposit}
        visible={!!deposit}
        saved={deposit ? goalProgress(deposit, expenses).saved : 0}
        onClose={() => setDeposit(null)}
        onSave={(v, opts) => {
          contributeGoal(deposit, v, opts);
          setDeposit(null);
        }}
      />
      <RecurringSheet
        key={`rule-${ruleEdit?.id || 'closed'}`}
        rule={ruleEdit}
        visible={!!ruleEdit}
        onClose={() => setRuleEdit(null)}
        onSave={(patch) => {
          updateRecurring(ruleEdit.id, patch);
          setRuleEdit(null);
        }}
        onDelete={() => {
          removeRecurring(ruleEdit.id);
          setRuleEdit(null);
          showToast({ text: 'Повтарящото се плащане е премахнато. Вече записаните разходи остават.', icon: 'trash-outline' });
        }}
      />
    </View>
  );
}

const s = themed((c) => ({
  container: { paddingHorizontal: 16, paddingBottom: 140, gap: 12 },
  title: { color: c.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  section: { color: c.text, fontSize: 18, fontWeight: '800' },
  emptyCard: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  emptyTitle: { color: c.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  hint: { color: c.muted, fontSize: 13, lineHeight: 18 },
  hintCenter: { color: c.muted, fontSize: 13.5, lineHeight: 19, textAlign: 'center', maxWidth: 320 },
  goal: { gap: 12 },
  goalHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalName: { color: c.text, fontSize: 16, fontWeight: '700' },
  goalPct: { color: c.text, fontSize: 18, fontWeight: '800' },
  goalFoot: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 2, minHeight: 56 },
  sep: { borderTopWidth: 1, borderColor: c.faint },
  ruleName: { color: c.text, fontSize: 15, fontWeight: '600' },
  ruleAmount: { color: c.text, fontSize: 15, fontWeight: '700' },
  sheetTitle: { color: c.text, fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  label: { color: c.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 16, marginBottom: 6 },
  textInput: { backgroundColor: c.card, borderRadius: radius.badge, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: c.text },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginVertical: 6 },
  amountInput: { fontSize: 40, fontWeight: '800', color: c.text, minWidth: 80, textAlign: 'center', padding: 0 },
  currency: { fontSize: 24, color: c.muted, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconCell: { width: 48, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: 'transparent', backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { alignSelf: 'center', marginTop: 20, borderColor: c.faint },
  primaryBtn: { backgroundColor: c.ink, borderRadius: radius.pill, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  savingsBtn: { backgroundColor: c.savings },
  primaryBtnText: { color: c.onAccent, fontSize: 16, fontWeight: '700' },
  ruleHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
  dayText: { color: c.text, fontSize: 20, fontWeight: '800', minWidth: 100, textAlign: 'center' },
}));
