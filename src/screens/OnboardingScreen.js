import React, { useState } from 'react';
import { View, ScrollView, Keyboard, StyleSheet } from 'react-native';
import { Text, TextInput } from '../components/ui/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore, DEFAULT_PET_NAME } from '../store';
import { colors, money, radius } from '../theme';
import { getIncome } from '../budget';
import { cleanAmountInput } from '../format';
import Pet from '../pet/Pet';
import Touch from '../components/ui/Touch';

// First launch: the dog wakes up once you enter your income
export default function OnboardingScreen() {
  const { incomes, createPet } = useStore();
  const insets = useSafeAreaInsets();
  const now = new Date();
  const existing = getIncome(incomes, now.getFullYear(), now.getMonth());
  const [incomeText, setIncomeText] = useState(existing ? String(existing).replace('.', ',') : '');
  const [name, setName] = useState(DEFAULT_PET_NAME);
  const income = parseFloat(incomeText.replace(/\s/g, '').replace(',', '.')) || 0;

  return (
    <LinearGradient colors={[colors.heroFrom, colors.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      {/* iOS lifts the content above the keyboard by itself and shows the field being edited */}
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: insets.top + 30, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
          <Pet expression={income > 0 ? 'ecstatic' : 'sleeping'} stage="kitten" size={190} />
          <Text style={s.h1}>{income > 0 ? 'Бау! Събудих се 🐾' : 'Здравей! Аз съм твоето кученце'}</Text>
          <Text style={s.sub}>
            Ще следя бюджета ти по правилото 50/30/20. Колкото по-добре се справяш, толкова по-щастлив съм — и раста.
          </Text>

          <View style={s.card}>
            <Text style={s.label}>Месечен доход</Text>
            <View style={s.row}>
              <TextInput
                value={incomeText}
                onChangeText={(t) => setIncomeText(cleanAmountInput(t))}
            maxLength={10}
                placeholder="0"
                placeholderTextColor="#E9C9A8"
                keyboardType="decimal-pad"
                accessibilityLabel="Месечен доход в евро"
                style={s.income}
              />
              <Text style={s.currency}>€</Text>
            </View>
            {income > 0 && (
              <View style={s.split}>
                <Text style={[s.splitItem, { color: colors.needs }]}>Нужди {money(income * 0.5)}</Text>
                <Text style={[s.splitItem, { color: colors.wants }]}>Желания {money(income * 0.3)}</Text>
                <Text style={[s.splitItem, { color: colors.savings }]}>Спестявания {money(income * 0.2)}</Text>
              </View>
            )}
            <Text style={[s.label, { marginTop: 18 }]}>Как да се казвам?</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={DEFAULT_PET_NAME}
              placeholderTextColor={colors.muted}
              style={s.name}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              accessibilityLabel="Име на кучето"
            />
          </View>

          <Touch
            disabled={!income}
            onPress={() => {
              Keyboard.dismiss();
              createPet({ name, income });
            }}
            accessibilityRole="button"
            style={[s.btn, !income && { opacity: 0.5 }]}
          >
            <Text style={s.btnText}>Да започваме</Text>
          </Touch>
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24 },
  h1: { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  sub: { color: 'rgba(255,255,255,0.88)', fontSize: 15, textAlign: 'center', lineHeight: 21, marginTop: 10 },
  card: { alignSelf: 'stretch', backgroundColor: '#fff', borderRadius: 28, padding: 20, marginTop: 26 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  row: { flexDirection: 'row', alignItems: 'baseline' },
  income: { flex: 1, minWidth: 0, fontSize: 38, fontWeight: '800', color: colors.text, paddingVertical: 4 },
  currency: { fontSize: 24, color: colors.muted, fontWeight: '700' },
  split: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  splitItem: { fontSize: 12, fontWeight: '700', backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, overflow: 'hidden' },
  name: { fontSize: 20, fontWeight: '700', color: colors.text, paddingVertical: 6, borderBottomWidth: 1, borderColor: colors.faint },
  btn: { alignSelf: 'stretch', backgroundColor: colors.ink, borderRadius: radius.pill, paddingVertical: 17, alignItems: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
