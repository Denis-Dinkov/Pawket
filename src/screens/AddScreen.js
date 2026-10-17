import React, { useState } from 'react';
import { View, ScrollView, Keyboard, Platform, StyleSheet } from 'react-native';
import { Text, TextInput } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore, normalizeMerchant } from '../store';
import { colors, getCategories, BUCKETS, categoryById, INCOME_KINDS, money, radius, tint, shadow } from '../theme';
import { getIncome } from '../budget';
import { cleanAmountInput } from '../format';
import { successFeedback } from '../haptics';
import IconBadge from '../components/ui/IconBadge';
import Pill from '../components/ui/Pill';
import Segmented from '../components/ui/Segmented';
import Touch from '../components/ui/Touch';
import NewCategorySheet from '../components/NewCategorySheet';
import useKeyboardHeight from '../hooks/useKeyboardHeight';

const DAYS = ['Днес', 'Вчера', 'Преди 2 дни'];
const MODES = [
  { key: 'expense', label: 'Разход' },
  { key: 'income', label: 'Доход' },
];

/**
 * New expense or income. prefill = { mode, amount, merchant, source } comes from Apple Pay, the widget or Home.
 * For an expense: if a category is remembered for the merchant, it's preselected.
 * The "Save" button is pinned to the bottom and always visible.
 */
export default function AddScreen({ onDone, prefill = {} }) {
  const { addExpense, addIncome, addCategory, merchants, incomes } = useStore();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const [mode, setMode] = useState(prefill.mode === 'income' ? 'income' : 'expense');
  const [amount, setAmount] = useState(prefill.amount ? prefill.amount.toFixed(2).replace('.', ',') : '');
  const [picked, setPicked] = useState(null);
  const [kind, setKind] = useState('bonus');
  const [merchant, setMerchant] = useState(prefill.merchant || '');
  const [note, setNote] = useState('');
  const [daysAgo, setDaysAgo] = useState(0);
  const [newCategoryFor, setNewCategoryFor] = useState(null); // bucket or null

  const isIncome = mode === 'income';
  const remembered = merchants[normalizeMerchant(merchant)];
  const rememberedOk = remembered && categoryById(remembered) && !categoryById(remembered).archived;
  const categoryId = picked || (rememberedOk ? remembered : null);
  const value = parseFloat(amount.replace(/\s/g, '').replace(',', '.'));
  const valid = value > 0 && (isIncome || !!categoryId);
  const now = new Date();
  const baseIncome = getIncome(incomes, now.getFullYear(), now.getMonth());

  const save = () => {
    if (!valid) return;
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const common = { amount: Math.round(value * 100) / 100, note: note.trim(), date: d.toISOString() };
    if (isIncome) {
      addIncome({ ...common, kind });
    } else {
      addExpense({ ...common, categoryId, merchant: merchant.trim(), source: prefill.source || 'manual' });
    }
    successFeedback();
    onDone({ ...common, type: mode });
  };

  const hint = !(value > 0) ? 'Въведи сума' : 'Избери категория';

  return (
    // The sheet reaches the bottom edge of the screen, so exactly the keyboard height is covered
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingBottom: keyboard }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <View style={s.header}>
          <Touch onPress={() => onDone(null)} hitSlop={12}>
            <Text style={s.cancel}>Отказ</Text>
          </Touch>
          <Segmented options={MODES} value={mode} onChange={setMode} style={{ width: 190 }} />
          <View style={{ width: 50 }} />
        </View>

        {prefill.source === 'applepay' && !isIncome && (
          <Pill small variant="ink" icon="logo-apple" label="Плащане с Apple Pay" style={{ alignSelf: 'center', marginTop: 16 }} />
        )}

        <View style={s.amountWrap}>
          {isIncome && <Text style={[s.currency, { color: colors.savings, marginLeft: 0, marginRight: 4 }]}>+</Text>}
          <TextInput
            value={amount}
            onChangeText={(t) => setAmount(cleanAmountInput(t))}
            maxLength={10}
            placeholder="0,00"
            placeholderTextColor="#DCCDBF"
            keyboardType="decimal-pad"
            // The width follows the text so the "€" sits right next to the amount
            style={[s.amount, isIncome && { color: colors.savings }, { width: Math.min(280, (amount.length || 4) * 31 + 12) }]}
            autoFocus={!prefill.amount}
          />
          <Text style={s.currency}>€</Text>
        </View>

        <View style={s.chips}>
          {DAYS.map((l, i) => (
            <Pill key={l} haptic="select" small label={l} variant={daysAgo === i ? 'active' : 'outline'} onPress={() => setDaysAgo(i)} />
          ))}
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
            />
          </View>
        </View>

        {isIncome ? (
          <>
            <Text style={[s.bucketLabel, { marginTop: 20, marginBottom: 10 }]}>Вид доход</Text>
            <View style={s.grid}>
              {INCOME_KINDS.map((k) => {
                const active = k.id === kind;
                return (
                  <Touch
                    key={k.id}
                    haptic="select"
                    onPress={() => {
                      Keyboard.dismiss();
                      setKind(k.id);
                    }}
                    style={[s.cat, active && { borderColor: colors.savings, backgroundColor: tint(colors.savings, 0.08) }]}
                  >
                    <IconBadge icon={k.icon} color={colors.savings} size={38} solid={active} />
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
        ) : (
          <>
            {rememberedOk && !picked && (
              <Text style={s.remembered}>
                Запомнена категория за „{merchant.trim()}“: {categoryById(remembered).name}
              </Text>
            )}
            {Object.entries(BUCKETS).map(([bucket, b]) => (
              <View key={bucket} style={{ marginTop: 20 }}>
                <View style={s.bucketRow}>
                  <View style={[s.dot, { backgroundColor: b.color }]} />
                  <Text style={s.bucketLabel}>
                    {b.label} · {b.target * 100}%
                  </Text>
                </View>
                <View style={s.grid}>
                  {getCategories()
                    .filter((c) => c.bucket === bucket)
                    .map((c) => {
                      const active = c.id === categoryId;
                      return (
                        <Touch
                          haptic="select"
                          key={c.id}
                          onPress={() => {
                            Keyboard.dismiss();
                            setPicked(c.id);
                          }}
                          style={[s.cat, active && { borderColor: b.color, backgroundColor: tint(b.color, 0.08) }]}
                        >
                          <IconBadge icon={c.icon} color={b.color} size={38} solid={active} />
                          <Text style={[s.catText, active && { fontWeight: '700' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                            {c.name}
                          </Text>
                        </Touch>
                      );
                    })}
                  <Touch onPress={() => setNewCategoryFor(bucket)} style={[s.cat, s.newCat]}>
                    <Ionicons name="add" size={24} color={b.color} />
                    <Text style={[s.catText, { color: b.color, fontWeight: '700' }]}>Нова</Text>
                  </Touch>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Pinned button — always visible, including above the keyboard */}
      <View style={[s.footer, { paddingBottom: keyboard ? 10 : Math.max(insets.bottom, 12) }]}>
        <Touch
          haptic={false}
          onPress={save}
          disabled={!valid}
          style={[s.save, isIncome && { backgroundColor: colors.savings }, !valid && { opacity: 0.35 }]}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={s.saveText}>{valid ? `Запази · ${isIncome ? '+' : ''}${money(value)}` : hint}</Text>
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

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cancel: { color: colors.muted, fontSize: 15, width: 50 },
  amountWrap: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginTop: 24 },
  amount: { fontSize: 54, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -1.5, padding: 0 },
  currency: { fontSize: 30, color: colors.muted, marginLeft: 6, fontWeight: '700' },
  chips: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 14 },
  fields: { backgroundColor: colors.card, borderRadius: radius.card, paddingHorizontal: 16, marginTop: 22 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.faint },
  input: { flex: 1, minWidth: 0, paddingVertical: 15, fontSize: 15, color: colors.text },
  remembered: { color: colors.primary, fontSize: 12.5, marginTop: 8, marginLeft: 6, fontWeight: '600' },
  incomeHint: { color: colors.muted, fontSize: 12.5, lineHeight: 18, marginTop: 12, marginHorizontal: 4 },
  bucketRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  bucketLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cat: {
    width: '22.6%', aspectRatio: 0.95, borderRadius: 20, borderWidth: 1.5, borderColor: 'transparent',
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 4,
  },
  newCat: { backgroundColor: 'transparent', borderColor: colors.faint, borderStyle: 'dashed' },
  catText: { fontSize: 10.5, color: colors.text, letterSpacing: -0.2, alignSelf: 'stretch', textAlign: 'center' },
  footer: {
    paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.bg,
    ...shadow, shadowOffset: { width: 0, height: -4 },
  },
  save: {
    flexDirection: 'row', gap: 8, backgroundColor: colors.ink, borderRadius: radius.pill,
    paddingVertical: 17, alignItems: 'center', justifyContent: 'center',
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
