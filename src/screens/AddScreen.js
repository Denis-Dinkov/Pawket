import React, { startTransition, useMemo, useState } from 'react';
import { View, ScrollView, Keyboard, Platform, Switch } from 'react-native';
import { Text, TextInput } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore, normalizeMerchant } from '../store';
import { guessCategory } from '../categoryGuess';
import { colors, getCategories, BUCKETS, categoryById, INCOME_KINDS, money, radius, tint, decimalSep, euroFirst } from '../theme';
import { getIncome } from '../budget';
import { goalProgress, goalSaved } from '../plans';
import { successFeedback, feedback } from '../haptics';
import { dayOrdinal, dayLabel } from '../format';
import IconBadge from '../components/ui/IconBadge';
import Pill from '../components/ui/Pill';
import Segmented from '../components/ui/Segmented';
import Touch from '../components/ui/Touch';
import NewCategorySheet from '../components/NewCategorySheet';
import DatePickerSheet from '../components/DatePickerSheet';
import useKeyboardHeight from '../hooks/useKeyboardHeight';
import { themed } from '../themed';
import { t, tList } from '../i18n';

const DAYS = tList(['Днес', 'Вчера', 'Преди 2 дни']);
const MODES = [
  { key: 'expense', get label() { return t('Разход'); } },
  { key: 'income', get label() { return t('Доход'); } },
];
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'del'];
const QUICK = 6;

// Typing on the keypad: digits, one comma, at most 2 decimals and 7 integer digits
function press(amount, key) {
  if (key === 'del') return amount.slice(0, -1);
  if (key === ',') return amount.includes(',') ? amount : `${amount || '0'},`;
  const [int, dec] = amount.split(',');
  if (dec != null) return dec.length >= 2 ? amount : amount + key;
  if (int === '0') return key;
  return int.length >= 7 ? amount : amount + key;
}

const daysAgoOf = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  return diff;
};

/**
 * New expense or income, or editing an expense (prefill.edit) or an income entry (prefill.editIncome).
 * The amount comes first, typed on the app's own keypad; the categories used most often are one tap away.
 * prefill = { mode, amount, merchant, source } comes from Apple Pay, the widget or Home.
 */
export default function AddScreen({ onDone, prefill = {} }) {
  const { addExpense, updateExpense, addIncome, addCategory, merchants, incomes, expenses, goals, contributeGoal, showToast, addWish, resolveWish, updateIncome } = useStore();
  const editing = prefill.edit || null;
  const editingIncome = prefill.editIncome || null;
  const editingAny = editing || editingIncome;
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const [mode, setMode] = useState(prefill.mode === 'income' || editingIncome ? 'income' : 'expense');
  const initialAmount = editingAny ? editingAny.amount : prefill.amount;
  // 42.8 → "42,80", 2200 → "2200"
  const [amount, setAmount] = useState(
    initialAmount ? (Number.isInteger(initialAmount) ? String(initialAmount) : initialAmount.toFixed(2).replace('.', ',')) : ''
  );
  const [picked, setPicked] = useState(editing?.categoryId || prefill.categoryId || null);
  const [kind, setKind] = useState(editingIncome?.kind || 'bonus');
  const [merchant, setMerchant] = useState(editing?.merchant ?? prefill.merchant ?? '');
  const [note, setNote] = useState(editingAny?.note || prefill.note || '');
  // The day of the entry (midnight); the time is added on save
  const [day, setDay] = useState(() => {
    const d = editingAny ? new Date(editingAny.date) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  });
  const daysAgo = daysAgoOf(day);
  const setDaysAgo = (n) => {
    const d = new Date();
    setDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() - n));
  };
  const [pickDate, setPickDate] = useState(false);
  const [repeat, setRepeat] = useState(false);
  // Off: paid with money the user already had (another account, old savings), kept out of the month
  const [offBudget, setOffBudget] = useState(!!editing?.offBudget || !!prefill.offBudget);
  const [allCats, setAllCats] = useState(false);
  // The keypad folds away after a category is picked, so the fields and the button are in view
  const [padOpen, setPadOpen] = useState(!(initialAmount > 0));
  const [newCategoryFor, setNewCategoryFor] = useState(null); // bucket or null

  const isIncome = mode === 'income';
  // A payment out of a goal or sinking fund: its money was already counted as savings
  const fromGoal = !isIncome && prefill.fromGoalId ? goals.find((g) => g.id === prefill.fromGoalId) : null;
  const remembered = merchants[normalizeMerchant(merchant)];
  const rememberedOk = remembered && categoryById(remembered) && !categoryById(remembered).archived;
  // Not picked by hand: the category used for this shop before, else a guess from its name
  const categoryId = picked || (rememberedOk ? remembered : merchant.trim() ? guessCategory(merchant) : null);
  const value = parseFloat(amount.replace(',', '.'));
  const valid = value > 0 && (isIncome || !!categoryId);
  const now = new Date();
  const baseIncome = getIncome(incomes, now.getFullYear(), now.getMonth());

  // Quick categories: the remembered one first, then the most used in the last 60 days
  const quick = useMemo(() => {
    const since = Date.now() - 60 * 86400000;
    const counts = {};
    expenses.forEach((e) => {
      if (new Date(e.date) >= since && !e.goalId) counts[e.categoryId] = (counts[e.categoryId] || 0) + 1;
    });
    const active = getCategories();
    const ranked = [...active].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));
    // Only the remembered category jumps to the front; picking one doesn't reorder the row under the finger
    const first = [rememberedOk ? remembered : null, !picked && !rememberedOk ? categoryId : null, editing?.categoryId, prefill.categoryId, ...ranked.map((c) => c.id)].filter(Boolean);
    return [...new Set(first)].map(categoryById).filter((c) => c && !c.archived).slice(0, QUICK);
  }, [expenses, rememberedOk, remembered, categoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    if (!valid) return;
    // An edit on the same day keeps its time; otherwise the chosen day gets the current time
    const keep = editingAny && daysAgoOf(editingAny.date) === daysAgo;
    const d = keep ? new Date(editingAny.date) : new Date();
    if (!keep) d.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    const common = { amount: Math.round(value * 100) / 100, note: note.trim(), date: d.toISOString() };
    // The new data re-renders every screen (all the budget and pet math): ~45 ms of JS. Done in the same
    // step as closing the sheet, it held back the first frame of the close. So the sheet is closed first
    // (onDone below) and the data is written two frames later, as a transition, while iOS runs the close
    // animation on its own. The flying amount waits 350 ms anyway, so nothing visible is delayed.
    const write = () => {
      if (editing) {
        updateExpense(editing.id, { ...common, categoryId, merchant, offBudget: (offBudget && !editing.fromGoalId) || undefined });
      } else if (editingIncome) {
        updateIncome(editingIncome.id, { ...common, kind });
      } else if (isIncome) {
        addIncome({ ...common, kind });
        if (kind === 'salary') payYourselfFirst(common.amount);
      } else {
        addExpense(
          {
            ...common,
            categoryId,
            merchant: merchant.trim(),
            source: fromGoal ? 'fund' : prefill.source || 'manual',
            ...(fromGoal && { fromGoalId: fromGoal.id }),
            ...(offBudget && !fromGoal && { offBudget: true }),
          },
          { repeat: repeat && !fromGoal && !offBudget }
        );
        if (prefill.wishId) resolveWish(prefill.wishId, 'bought');
      }
    };
    successFeedback();
    onDone({ ...common, type: mode });
    requestAnimationFrame(() => requestAnimationFrame(() => startTransition(write)));
  };

  // Pay yourself first: right after a salary, offer to put 20% into a goal (the emergency fund first)
  const payYourselfFirst = (salary) => {
    const open = goals.filter((g) => !goalProgress(g, expenses).done);
    const goal = open.find((g) => g.kind === 'emergency') || open[0];
    const part = Math.round(salary * 0.2);
    if (!goal) {
      setTimeout(() => showToast({ text: t('Заплатата е записана. Създай цел в „Планове“ и заделяй 20% ({0}) веднага.', { 0: money(part) }), icon: 'flag-outline' }), 500);
      return;
    }
    setTimeout(
      () =>
        showToast({
          text: t('Първо плати на себе си: {0} към „{1}“?', { 0: money(part), 1: goal.name }),
          icon: 'wallet-outline',
          actionLabel: t('Задели'),
          onAction: () => contributeGoal(goal, part),
        }),
      500
    );
  };

  // A pricey want can wait 48 hours on the wishlist instead
  const canWait = !isIncome && !editingAny && !fromGoal && value >= 50 && categoryById(categoryId)?.bucket === 'wants';
  const wait = () => {
    addWish({ name: merchant.trim() || note.trim() || categoryById(categoryId).name, amount: Math.round(value * 100) / 100, categoryId });
    onDone(null);
  };

  const hint = !(value > 0) ? t('Въведи сума') : t('Избери категория');
  const accent = isIncome ? colors.savings : colors.text;

  const CategoryTile = ({ c, fill }) => {
    const b = BUCKETS[c.bucket];
    const active = c.id === categoryId;
    return (
      <Touch
        haptic="select"
        onPress={() => {
          Keyboard.dismiss();
          setPicked(c.id);
          if (value > 0) setPadOpen(false);
        }}
        style={[s.cat, fill && s.catFill, active && { borderColor: b.color, backgroundColor: tint(b.color, 0.1) }]}
        accessibilityLabel={`${c.name}, ${b.label}`}
        accessibilityState={{ selected: active }}
      >
        <IconBadge icon={c.icon} color={b.color} size={34} solid={active} />
        <Text style={[s.catText, active && { fontWeight: '700' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {c.name}
        </Text>
      </Touch>
    );
  };

  return (
    // The sheet reaches the bottom edge of the screen, so exactly the keyboard height is covered
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingBottom: keyboard }}>
      <View style={s.header}>
        <Touch onPress={() => onDone(null)} hitSlop={12} style={s.headerSide}>
          <Text style={s.cancel}>{t('Отказ')}</Text>
        </Touch>
        {editingAny ? (
          <Text style={s.title}>{t('Редакция')}</Text>
        ) : (
          <Segmented options={MODES} value={mode} onChange={setMode} style={{ width: 190 }} />
        )}
        <View style={s.headerSide} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        {fromGoal && (
          <Pill small variant="soft" icon="wallet-outline" label={t('От „{0}“ · {1}', { 0: fromGoal.name, 1: money(goalSaved(fromGoal, expenses)) })} style={{ alignSelf: 'center', marginBottom: 6 }} />
        )}
        {prefill.source === 'applepay' && !isIncome && !editing && (
          <Pill small variant="ink" icon="logo-apple" label={t('Плащане с Apple Pay')} style={{ alignSelf: 'center', marginBottom: 6 }} />
        )}

        <Touch
          haptic="select"
          pressScale={1}
          onPress={() => {
            Keyboard.dismiss();
            setPadOpen(true);
          }}
          style={s.amountWrap}
          accessibilityLabel={t('Сума: {0} евро', { 0: (amount || '0').replace(',', decimalSep()) })}
          accessibilityHint={padOpen ? undefined : t('Отваря клавиатурата за сумата')}
          accessibilityLiveRegion="polite"
        >
          {isIncome && <Text style={[s.amount, { color: colors.savings }]}>+</Text>}
          {/* The euro sign goes before the amount in English (€12.50), after it in Bulgarian */}
          {euroFirst() && <Text style={s.currency} maxFontSizeMultiplier={1.2}>€</Text>}
          <Text style={[s.amount, { color: amount ? accent : colors.placeholder }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
            {(amount || '0').replace(',', decimalSep())}
          </Text>
          {!euroFirst() && <Text style={s.currency} maxFontSizeMultiplier={1.2}>€</Text>}
          {!padOpen && <Ionicons name="pencil" size={16} color={colors.muted} style={{ marginLeft: 4 }} />}
        </Touch>
        {!isIncome && rememberedOk && !picked && merchant.trim() !== '' && (
          <Text style={s.remembered}>
            {t('{0} → {1} (запомнено)', { 0: merchant.trim(), 1: categoryById(remembered).name })}
          </Text>
        )}

        <View style={s.chips}>
          {DAYS.map((l, i) => (
            <Pill key={l} haptic="select" small label={l} variant={daysAgo === i ? 'active' : 'outline'} onPress={() => setDaysAgo(i)} />
          ))}
          {/* Any earlier day: the chip shows the picked date */}
          <Pill
            haptic="select"
            small
            icon="calendar-outline"
            label={daysAgo > 2 ? dayLabel(day.toISOString()) : t('Друга дата')}
            variant={daysAgo > 2 ? 'active' : 'outline'}
            onPress={() => {
              Keyboard.dismiss();
              setPickDate(true);
            }}
            accessibilityLabel={daysAgo > 2 ? t('Дата: {0}, смени', { 0: dayLabel(day.toISOString()) }) : t('Друга дата, отваря календар')}
          />
        </View>

        <View style={s.fields}>
          {!isIncome && (
            <View style={s.field}>
              <Ionicons name="storefront-outline" size={18} color={colors.muted} />
              <TextInput
                value={merchant}
                onChangeText={setMerchant}
                placeholder={t('Къде? (магазин, заведение)')}
                placeholderTextColor={colors.muted}
                style={s.input}
                returnKeyType="next"
                accessibilityLabel={t('Къде')}
              />
            </View>
          )}
          <View style={[s.field, !isIncome && s.sep]}>
            <Ionicons name="document-text-outline" size={18} color={colors.muted} />
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={isIncome ? t('Бележка (напр. от кого)') : t('За какво? (бележка)')}
              placeholderTextColor={colors.muted}
              style={s.input}
              returnKeyType="done"
              accessibilityLabel={t('Бележка')}
            />
          </View>
          {!isIncome && !editing && !fromGoal && (
            <Touch
              haptic="select"
              onPress={() => setRepeat((v) => !v)}
              style={[s.field, s.sep]}
              accessibilityRole="switch"
              accessibilityState={{ checked: repeat }}
              accessibilityLabel={t('Повтаря се всеки месец')}
            >
              <Ionicons name="repeat" size={18} color={colors.muted} />
              <Text style={[s.input, { color: colors.text }]}>{t('Всеки месец')}</Text>
              <View pointerEvents="none">
                <Switch value={repeat} trackColor={{ true: colors.primary }} />
              </View>
            </Touch>
          )}
          {!isIncome && !fromGoal && !editing?.fromGoalId && !repeat && (
            <Touch
              haptic="select"
              onPress={() => setOffBudget((v) => !v)}
              style={[s.field, s.sep]}
              accessibilityRole="switch"
              accessibilityState={{ checked: !offBudget }}
              accessibilityLabel={t('Брои се в бюджета за месеца')}
            >
              <Ionicons name="calculator-outline" size={18} color={colors.muted} />
              <Text style={[s.input, { color: colors.text }]}>{t('Брои се в месеца')}</Text>
              <View pointerEvents="none">
                <Switch value={!offBudget} trackColor={{ true: colors.primary }} />
              </View>
            </Touch>
          )}
        </View>
        {fromGoal && (
          <Text style={s.incomeHint}>{t('Плащането намалява „{0}“ и не се брои в разходите за месеца — парите вече са заделени.', { 0: fromGoal.name })}</Text>
        )}
        {offBudget && !isIncome && !fromGoal && (
          <Text style={s.incomeHint}>{t('Платено с пари, които вече имаш настрана (друга сметка, стари спестявания). Остава в историята, но не намалява бюджета за месеца и не влиза в отчетите.')}</Text>
        )}
        {repeat && !isIncome && (
          <Text style={s.incomeHint}>{t('Всеки месец на {0} число се записва сам. Управлява се от „Планове“.', { 0: dayOrdinal(day.getDate()) })}</Text>
        )}
        {isIncome ? (
          <>
            <Text style={[s.bucketLabel, { marginTop: 18, marginBottom: 10 }]}>{t('Вид доход')}</Text>
            <View style={s.grid}>
              {INCOME_KINDS.map((k) => {
                const active = k.id === kind;
                return (
                  <Touch
                    key={k.id}
                    haptic="select"
                    onPress={() => setKind(k.id)}
                    style={[s.cat, active && { borderColor: colors.savings, backgroundColor: tint(colors.savings, 0.1) }]}
                    accessibilityState={{ selected: active }}
                  >
                    <IconBadge icon={k.icon} color={colors.savings} size={34} solid={active} />
                    <Text style={[s.catText, active && { fontWeight: '700' }]} numberOfLines={1}>
                      {k.name}
                    </Text>
                  </Touch>
                );
              })}
            </View>
            <Text style={s.incomeHint}>
              {kind === 'salary'
                ? t('Заплатата замества месечния доход от настройките{0} за този месец — не се брои двойно.', { 0: baseIncome ? ` (${money(baseIncome)})` : '' })
                : t('Добавя се към месечния доход и увеличава бюджета за месеца по 50/30/20.')}
            </Text>
          </>
        ) : allCats ? (
          <>
            {Object.entries(BUCKETS).map(([bucket, b]) => (
              <View key={bucket} style={{ marginTop: 16 }}>
                <View style={s.bucketRow}>
                  <View style={[s.dot, { backgroundColor: b.color }]} />
                  <Text style={s.bucketLabel}>
                    {b.label} · {b.target * 100}%
                  </Text>
                </View>
                <View style={s.grid}>
                  {getCategories()
                    .filter((c) => c.bucket === bucket)
                    .map((c) => (
                      <CategoryTile key={c.id} c={c} />
                    ))}
                  <Touch onPress={() => setNewCategoryFor(bucket)} style={[s.cat, s.newCat]} accessibilityLabel={t('Нова категория в {0}', { 0: b.label })}>
                    <Ionicons name="add" size={22} color={b.color} />
                    <Text style={[s.catText, { color: b.color, fontWeight: '700' }]}>{t('Нова')}</Text>
                  </Touch>
                </View>
              </View>
            ))}
            <Pill small label={t('По-малко')} icon="chevron-up" variant="outline" style={{ alignSelf: 'center', marginTop: 12 }} onPress={() => setAllCats(false)} />
          </>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14, marginHorizontal: -20 }} contentContainerStyle={s.quickRow}>
            {quick.map((c) => (
              <View key={c.id} style={s.quickCell}>
                <CategoryTile c={c} fill />
              </View>
            ))}
            <View style={s.quickCell}>
              <Touch onPress={() => setAllCats(true)} style={[s.cat, s.newCat, s.catFill]} accessibilityLabel={t('Всички категории')}>
                <Ionicons name="grid-outline" size={20} color={colors.primary} />
                <Text style={[s.catText, { color: colors.primary, fontWeight: '700' }]}>{t('Всички')}</Text>
              </Touch>
            </View>
          </ScrollView>
        )}

      </ScrollView>

      {/* The keypad and the pinned button; the system keyboard takes their place while a text field is focused */}
      <View style={[s.footer, { paddingBottom: keyboard ? 10 : Math.max(insets.bottom, 12) }]}>
        {!keyboard && padOpen && (
          <View style={s.pad}>
            {KEYS.map((k) => (
              <Touch
                key={k}
                haptic="select"
                style={({ pressed }) => [s.key, pressed && { backgroundColor: colors.faint }]}
                onPress={() => setAmount((a) => press(a, k))}
                onLongPress={k === 'del' ? () => setAmount('') : undefined}
                accessibilityLabel={k === 'del' ? t('Изтрий цифра') : k === ',' ? t('Запетая') : k}
              >
                {k === 'del' ? (
                  <Ionicons name="backspace-outline" size={24} color={colors.text} />
                ) : (
                  <Text style={s.keyText} maxFontSizeMultiplier={1.3}>{k === ',' ? decimalSep() : k}</Text>
                )}
              </Touch>
            ))}
          </View>
        )}
        {canWait && (
          <Touch haptic="select" style={s.waitBtn} onPress={wait} accessibilityHint={t('Записва го в Желания за 48 часа вместо като разход')}>
            <Ionicons name="hourglass-outline" size={18} color={colors.wants} />
            <Text style={s.waitText}>{t('Не бързай: отложи за 48 часа')}</Text>
          </Touch>
        )}
        <Touch
          haptic={false}
          onPress={save}
          disabled={!valid}
          style={[s.save, isIncome && { backgroundColor: colors.savings }, !valid && { backgroundColor: colors.faint }]}
          accessibilityState={{ disabled: !valid }}
        >
          <Ionicons name="checkmark" size={20} color={valid ? colors.onAccent : colors.muted} />
          <Text style={[s.saveText, !valid && { color: colors.muted }]}>
            {valid ? `${editingAny ? t('Запази промените') : t('Запази')} · ${isIncome ? '+' : ''}${money(value)}` : hint}
          </Text>
        </Touch>
      </View>

      <DatePickerSheet visible={pickDate} value={day} onSelect={setDay} onClose={() => setPickDate(false)} />

      <NewCategorySheet
        visible={!!newCategoryFor}
        initialBucket={newCategoryFor || 'wants'}
        onClose={() => setNewCategoryFor(null)}
        onCreate={(c) => {
          setPicked(addCategory(c));
          setNewCategoryFor(null);
        }}
      />
    </View>
  );
}

const s = themed((c) => ({
  container: { paddingHorizontal: 20, paddingBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 },
  headerSide: { width: 60, minHeight: 44, justifyContent: 'center' },
  title: { color: c.text, fontSize: 16, fontWeight: '700' },
  cancel: { color: c.primary, fontSize: 15, fontWeight: '600' },
  amountWrap: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginTop: 8, gap: 4 },
  amount: { fontSize: 52, fontWeight: '800', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  currency: { fontSize: 28, color: c.muted, fontWeight: '700' },
  chips: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  remembered: { color: c.primary, fontSize: 13, textAlign: 'center', fontWeight: '600' },
  fields: { backgroundColor: c.card, borderRadius: radius.card, paddingHorizontal: 16, marginTop: 16 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50 },
  sep: { borderTopWidth: 1, borderColor: c.faint },
  input: { flex: 1, minWidth: 0, paddingVertical: 13, fontSize: 15, color: c.text },
  incomeHint: { color: c.muted, fontSize: 13, lineHeight: 18, marginTop: 10, marginHorizontal: 4 },
  bucketRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  bucketLabel: { color: c.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickRow: { paddingHorizontal: 20, gap: 8 },
  quickCell: { width: 84 },
  catFill: { width: '100%', maxWidth: '100%' },
  cat: {
    width: '23%', flexGrow: 1, maxWidth: '24%', minHeight: 74, borderRadius: 18, borderWidth: 1.5, borderColor: 'transparent',
    backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', gap: 5, padding: 5,
  },
  newCat: { backgroundColor: 'transparent', borderColor: c.faint, borderStyle: 'dashed' },
  catText: { fontSize: 11.5, color: c.text, alignSelf: 'stretch', textAlign: 'center' },
  footer: { paddingHorizontal: 12, paddingTop: 8, backgroundColor: c.bg, borderTopWidth: 1, borderColor: c.faint, gap: 8 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  // Three columns: 31% each plus the two 6 px gaps fit on every phone width
  key: { width: '31%', flexGrow: 1, height: 46, borderRadius: 14, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
  keyText: { color: c.text, fontSize: 22, fontWeight: '600' },
  save: {
    flexDirection: 'row', gap: 8, backgroundColor: c.ink, borderRadius: radius.pill,
    minHeight: 54, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
  },
  saveText: { color: c.onAccent, fontSize: 16, fontWeight: '700' },
  waitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, borderRadius: radius.pill, borderWidth: 1.5, borderColor: c.wants },
  waitText: { color: c.wants, fontSize: 14.5, fontWeight: '700' },
}));
