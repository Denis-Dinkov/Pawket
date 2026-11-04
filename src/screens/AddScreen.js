import React, { useMemo, useState } from 'react';
import { View, ScrollView, Keyboard, Platform, Switch } from 'react-native';
import { Text, TextInput } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore, normalizeMerchant } from '../store';
import { colors, getCategories, BUCKETS, categoryById, INCOME_KINDS, money, radius, tint } from '../theme';
import { getIncome } from '../budget';
import { goalProgress } from '../plans';
import { successFeedback, feedback } from '../haptics';
import { dayOrdinal } from '../format';
import IconBadge from '../components/ui/IconBadge';
import Pill from '../components/ui/Pill';
import Segmented from '../components/ui/Segmented';
import Touch from '../components/ui/Touch';
import NewCategorySheet from '../components/NewCategorySheet';
import useKeyboardHeight from '../hooks/useKeyboardHeight';
import { themed } from '../themed';

const DAYS = ['Днес', 'Вчера', 'Преди 2 дни'];
const MODES = [
  { key: 'expense', label: 'Разход' },
  { key: 'income', label: 'Доход' },
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
 * New expense or income, or editing an expense (prefill.edit).
 * The amount comes first, typed on the app's own keypad; the categories used most often are one tap away.
 * prefill = { mode, amount, merchant, source } comes from Apple Pay, the widget or Home.
 */
export default function AddScreen({ onDone, prefill = {} }) {
  const { addExpense, updateExpense, addIncome, addCategory, merchants, incomes, expenses, goals, contributeGoal, showToast, addWish, resolveWish } = useStore();
  const editing = prefill.edit || null;
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const [mode, setMode] = useState(prefill.mode === 'income' ? 'income' : 'expense');
  const initialAmount = editing ? editing.amount : prefill.amount;
  // 42.8 → "42,80", 2200 → "2200"
  const [amount, setAmount] = useState(
    initialAmount ? (Number.isInteger(initialAmount) ? String(initialAmount) : initialAmount.toFixed(2).replace('.', ',')) : ''
  );
  const [picked, setPicked] = useState(editing?.categoryId || prefill.categoryId || null);
  const [kind, setKind] = useState('bonus');
  const [merchant, setMerchant] = useState(editing?.merchant ?? prefill.merchant ?? '');
  const [note, setNote] = useState(editing?.note || prefill.note || '');
  const [daysAgo, setDaysAgo] = useState(editing ? daysAgoOf(editing.date) : 0);
  const [repeat, setRepeat] = useState(false);
  const [allCats, setAllCats] = useState(false);
  // The keypad folds away after a category is picked, so the fields and the button are in view
  const [padOpen, setPadOpen] = useState(!(initialAmount > 0));
  const [newCategoryFor, setNewCategoryFor] = useState(null); // bucket or null

  const isIncome = mode === 'income';
  const remembered = merchants[normalizeMerchant(merchant)];
  const rememberedOk = remembered && categoryById(remembered) && !categoryById(remembered).archived;
  const categoryId = picked || (rememberedOk ? remembered : null);
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
    const first = [rememberedOk ? remembered : null, editing?.categoryId, prefill.categoryId, ...ranked.map((c) => c.id)].filter(Boolean);
    return [...new Set(first)].map(categoryById).filter((c) => c && !c.archived).slice(0, QUICK);
  }, [expenses, rememberedOk, remembered]);

  const save = () => {
    if (!valid) return;
    const d = editing && daysAgo === daysAgoOf(editing.date) ? new Date(editing.date) : new Date();
    if (!(editing && daysAgo === daysAgoOf(editing.date))) d.setDate(d.getDate() - daysAgo);
    const common = { amount: Math.round(value * 100) / 100, note: note.trim(), date: d.toISOString() };
    if (editing) {
      updateExpense(editing.id, { ...common, categoryId, merchant });
    } else if (isIncome) {
      addIncome({ ...common, kind });
      if (kind === 'salary') payYourselfFirst(common.amount);
    } else {
      addExpense({ ...common, categoryId, merchant: merchant.trim(), source: prefill.source || 'manual' }, { repeat });
      if (prefill.wishId) resolveWish(prefill.wishId, 'bought');
    }
    successFeedback();
    onDone({ ...common, type: mode });
  };

  // Pay yourself first: right after a salary, offer to put 20% into a goal (the emergency fund first)
  const payYourselfFirst = (salary) => {
    const open = goals.filter((g) => !goalProgress(g, expenses).done);
    const goal = open.find((g) => g.kind === 'emergency') || open[0];
    const part = Math.round(salary * 0.2);
    if (!goal) {
      setTimeout(() => showToast({ text: `Заплатата е записана. Създай цел в „Планове“ и отделяй 20% (${money(part)}) веднага.`, icon: 'flag-outline' }), 500);
      return;
    }
    setTimeout(
      () =>
        showToast({
          text: `Първо плати на себе си: ${money(part)} към „${goal.name}“?`,
          icon: 'wallet-outline',
          actionLabel: 'Отдели',
          onAction: () => contributeGoal(goal, part),
        }),
      500
    );
  };

  // A pricey want can wait 48 hours on the wishlist instead
  const canWait = !isIncome && !editing && value >= 50 && categoryById(categoryId)?.bucket === 'wants';
  const wait = () => {
    addWish({ name: merchant.trim() || note.trim() || categoryById(categoryId).name, amount: Math.round(value * 100) / 100, categoryId });
    onDone(null);
  };

  const hint = !(value > 0) ? 'Въведи сума' : 'Избери категория';
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
          <Text style={s.cancel}>Отказ</Text>
        </Touch>
        {editing ? (
          <Text style={s.title}>Редакция</Text>
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
        {prefill.source === 'applepay' && !isIncome && !editing && (
          <Pill small variant="ink" icon="logo-apple" label="Плащане с Apple Pay" style={{ alignSelf: 'center', marginBottom: 6 }} />
        )}

        <Touch
          haptic="select"
          pressScale={1}
          onPress={() => {
            Keyboard.dismiss();
            setPadOpen(true);
          }}
          style={s.amountWrap}
          accessibilityLabel={`Сума: ${amount || '0'} евро`}
          accessibilityHint={padOpen ? undefined : 'Отваря клавиатурата за сумата'}
          accessibilityLiveRegion="polite"
        >
          {isIncome && <Text style={[s.amount, { color: colors.savings }]}>+</Text>}
          <Text style={[s.amount, { color: amount ? accent : colors.placeholder }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
            {amount || '0'}
          </Text>
          <Text style={s.currency} maxFontSizeMultiplier={1.2}>€</Text>
          {!padOpen && <Ionicons name="pencil" size={16} color={colors.muted} style={{ marginLeft: 4 }} />}
        </Touch>
        {!isIncome && rememberedOk && !picked && merchant.trim() !== '' && (
          <Text style={s.remembered}>
            {merchant.trim()} → {categoryById(remembered).name} (запомнено)
          </Text>
        )}

        <View style={s.chips}>
          {DAYS.map((l, i) => (
            <Pill key={l} haptic="select" small label={l} variant={daysAgo === i ? 'active' : 'outline'} onPress={() => setDaysAgo(i)} />
          ))}
          {daysAgo > 2 && <Pill small label={`Преди ${daysAgo} дни`} variant="active" />}
        </View>

        <View style={s.fields}>
          {!isIncome && (
            <View style={s.field}>
              <Ionicons name="storefront-outline" size={18} color={colors.muted} />
              <TextInput
                value={merchant}
                onChangeText={setMerchant}
                placeholder="Къде? (магазин, заведение)"
                placeholderTextColor={colors.muted}
                style={s.input}
                returnKeyType="next"
                accessibilityLabel="Къде"
              />
            </View>
          )}
          <View style={[s.field, !isIncome && s.sep]}>
            <Ionicons name="document-text-outline" size={18} color={colors.muted} />
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={isIncome ? 'Бележка (напр. от кого)' : 'За какво? (бележка)'}
              placeholderTextColor={colors.muted}
              style={s.input}
              returnKeyType="done"
              accessibilityLabel="Бележка"
            />
          </View>
          {!isIncome && !editing && (
            <View style={[s.field, s.sep]}>
              <Ionicons name="repeat" size={18} color={colors.muted} />
              <Text style={[s.input, { color: colors.text }]}>Всеки месец</Text>
              <Switch
                value={repeat}
                onValueChange={(v) => {
                  feedback('select');
                  setRepeat(v);
                }}
                trackColor={{ true: colors.primary }}
                accessibilityLabel="Повтаря се всеки месец"
              />
            </View>
          )}
        </View>
        {repeat && !isIncome && (
          <Text style={s.incomeHint}>Всеки месец на {dayOrdinal(new Date(Date.now() - daysAgo * 86400000).getDate())} число се записва сам. Управлява се от „Планове“.</Text>
        )}
        {isIncome ? (
          <>
            <Text style={[s.bucketLabel, { marginTop: 18, marginBottom: 10 }]}>Вид доход</Text>
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
                ? `Заплатата замества месечния доход от настройките${baseIncome ? ` (${money(baseIncome)})` : ''} за този месец — не се брои двойно.`
                : 'Добавя се към месечния доход и увеличава бюджета за месеца по 50/30/20.'}
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
                  <Touch onPress={() => setNewCategoryFor(bucket)} style={[s.cat, s.newCat]} accessibilityLabel={`Нова категория в ${b.label}`}>
                    <Ionicons name="add" size={22} color={b.color} />
                    <Text style={[s.catText, { color: b.color, fontWeight: '700' }]}>Нова</Text>
                  </Touch>
                </View>
              </View>
            ))}
            <Pill small label="По-малко" icon="chevron-up" variant="outline" style={{ alignSelf: 'center', marginTop: 12 }} onPress={() => setAllCats(false)} />
          </>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14, marginHorizontal: -20 }} contentContainerStyle={s.quickRow}>
            {quick.map((c) => (
              <View key={c.id} style={s.quickCell}>
                <CategoryTile c={c} fill />
              </View>
            ))}
            <View style={s.quickCell}>
              <Touch onPress={() => setAllCats(true)} style={[s.cat, s.newCat, s.catFill]} accessibilityLabel="Всички категории">
                <Ionicons name="grid-outline" size={20} color={colors.primary} />
                <Text style={[s.catText, { color: colors.primary, fontWeight: '700' }]}>Всички</Text>
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
                accessibilityLabel={k === 'del' ? 'Изтрий цифра' : k === ',' ? 'Запетая' : k}
              >
                {k === 'del' ? (
                  <Ionicons name="backspace-outline" size={24} color={colors.text} />
                ) : (
                  <Text style={s.keyText} maxFontSizeMultiplier={1.3}>{k}</Text>
                )}
              </Touch>
            ))}
          </View>
        )}
        {canWait && (
          <Touch haptic="select" style={s.waitBtn} onPress={wait} accessibilityHint="Записва го в Желания за 48 часа вместо като разход">
            <Ionicons name="hourglass-outline" size={18} color={colors.wants} />
            <Text style={s.waitText}>Не бързай: отложи за 48 часа</Text>
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
            {valid ? `${editing ? 'Запази промените' : 'Запази'} · ${isIncome ? '+' : ''}${money(value)}` : hint}
          </Text>
        </Touch>
      </View>

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
