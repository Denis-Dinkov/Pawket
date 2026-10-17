import React, { useState } from 'react';
import { View, ScrollView, Alert, Platform, StyleSheet } from 'react-native';
import { Text, TextInput } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors, MONTHS, BUCKETS, money, radius } from '../theme';
import { getIncome } from '../budget';
import { cleanAmountInput } from '../format';
import { stageFor } from '../pet/logic';
import Card from '../components/ui/Card';
import IconBadge from '../components/ui/IconBadge';
import Pet from '../pet/Pet';
import ApplePayGuideScreen from './ApplePayGuideScreen';
import Touch from '../components/ui/Touch';
import NewCategorySheet from '../components/NewCategorySheet';

const parseMoney = (t) => parseFloat(String(t).replace(/\s/g, '').replace(',', '.')) || 0;

function confirm(title, msg, onYes) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${msg}`)) onYes();
    return;
  }
  Alert.alert(title, msg, [
    { text: 'Отказ', style: 'cancel' },
    { text: 'Изтрий', style: 'destructive', onPress: onYes },
  ]);
}

export default function SettingsScreen({ onClose, onTryApplePay }) {
  const { incomes, pet, categories, setIncomeFrom, setPetName, addCategory, removeCategory, resetAll } = useStore();
  const [newCategory, setNewCategory] = useState(false);
  const mine = categories.filter((c) => !c.archived);
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const current = getIncome(incomes, y, m);
  const [incomeText, setIncomeText] = useState(current ? String(current) : '');
  const [name, setName] = useState(pet?.name || '');
  const { stage, next } = stageFor(pet?.xp || 0);

  const [guide, setGuide] = useState(false);

  const saveIncome = () => setIncomeFrom(y, m, parseMoney(incomeText));
  const income = parseMoney(incomeText);

  if (guide) return <ApplePayGuideScreen onClose={() => setGuide(false)} onTry={onTryApplePay} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <View style={s.header}>
        <View style={{ width: 60 }} />
        <Text style={s.title}>Настройки</Text>
        <Touch
          hitSlop={12}
          onPress={() => {
            saveIncome();
            setPetName(name);
            onClose();
          }}
        >
          <Text style={s.done}>Готово</Text>
        </Touch>
      </View>

      <Card style={{ marginTop: 20 }}>
        <Text style={s.label}>Месечен доход</Text>
        <View style={s.incomeRow}>
          <TextInput
            value={incomeText}
            onChangeText={(t) => setIncomeText(cleanAmountInput(t))}
            maxLength={10}
            onEndEditing={saveIncome}
            onBlur={saveIncome}
            placeholder="Въведи доход"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            style={s.incomeInput}
          />
          <Text style={s.currency}>€</Text>
        </View>
        <Text style={s.hint}>
          Важи от {MONTHS[m].toLowerCase()} {y} нататък — миналите месеци пазят своя доход.
        </Text>
        {income > 0 && (
          <View style={s.split}>
            <Text style={[s.splitItem, { color: colors.needs }]}>50% · {money(income * 0.5)}</Text>
            <Text style={[s.splitItem, { color: colors.wants }]}>30% · {money(income * 0.3)}</Text>
            <Text style={[s.splitItem, { color: colors.savings }]}>20% · {money(income * 0.2)}</Text>
          </View>
        )}
      </Card>

      <Card style={{ marginTop: 14 }}>
        <View style={s.petRow}>
          <Pet expression="happy" stage={stage.key} size={70} />
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Име на кучето</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              onEndEditing={() => setPetName(name)}
              placeholder="Чарли"
              placeholderTextColor={colors.muted}
              style={s.nameInput}
            />
            <Text style={s.hint}>
              {stage.name} · {pet?.xp || 0} XP{next ? ` · ${next.name} при ${next.xp} XP` : ''}
            </Text>
          </View>
        </View>
      </Card>

      <Card style={{ marginTop: 14 }}>
        <View style={s.catHead}>
          <Text style={s.label}>Моите категории</Text>
          <Touch onPress={() => setNewCategory(true)} hitSlop={8}>
            <Text style={s.addLink}>+ Нова</Text>
          </Touch>
        </View>
        {mine.length === 0 ? (
          <Text style={s.hint}>Добави свои категории — появяват се при „Нов разход“ в избраната част от 50/30/20.</Text>
        ) : (
          mine.map((c) => (
            <View key={c.id} style={s.catRow}>
              <IconBadge icon={c.icon} color={BUCKETS[c.bucket].color} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={s.catName}>{c.name}</Text>
                <Text style={[s.hint, { marginTop: 0 }]}>{BUCKETS[c.bucket].label}</Text>
              </View>
              <Touch
                hitSlop={8}
                onPress={() =>
                  confirm('Изтриване на категория', `„${c.name}“ изчезва от избора. Старите разходи в нея се запазват.`, () =>
                    removeCategory(c.id)
                  )
                }
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Touch>
            </View>
          ))
        )}
      </Card>

      {Platform.OS !== 'android' && (
        <Touch onPress={() => setGuide(true)}>
          <Card style={[s.linkRow, { marginTop: 14 }]}>
            <IconBadge icon="logo-apple" color={colors.ink} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={s.linkTitle}>Запис след Apple Pay</Text>
              <Text style={s.hint}>Автоматично отваря „Нов разход“ след плащане</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Card>
        </Touch>
      )}

      <Touch
        style={s.danger}
        onPress={() =>
          confirm('Изтриване на всички данни', 'Разходите, доходите и кучето ще бъдат изтрити безвъзвратно.', () => {
            resetAll();
            onClose();
          })
        }
      >
        <Ionicons name="trash-outline" size={16} color={colors.danger} />
        <Text style={s.dangerText}>Изтрий всички данни</Text>
      </Touch>

      <NewCategorySheet
        visible={newCategory}
        onClose={() => setNewCategory(false)}
        onCreate={(c) => {
          addCategory(c);
          setNewCategory(false);
        }}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  done: { color: colors.primary, fontSize: 15, fontWeight: '700', width: 60, textAlign: 'right' },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  incomeRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
  incomeInput: { flex: 1, minWidth: 0, fontSize: 30, fontWeight: '800', color: colors.text, paddingVertical: 4 },
  currency: { fontSize: 22, color: colors.muted, fontWeight: '700' },
  hint: { color: colors.muted, fontSize: 12.5, marginTop: 6, lineHeight: 17 },
  split: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  splitItem: { fontSize: 12, fontWeight: '700', backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, overflow: 'hidden' },
  petRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  addLink: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  catName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  nameInput: { fontSize: 20, fontWeight: '800', color: colors.text, paddingVertical: 4 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  danger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 28, paddingVertical: 12 },
  dangerText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
});
