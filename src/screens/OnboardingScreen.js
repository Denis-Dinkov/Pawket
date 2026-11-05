import React, { useState } from 'react';
import { View, ScrollView, Keyboard, StyleSheet } from 'react-native';
import { Text, TextInput } from '../components/ui/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore, defaultPetName } from '../store';
import { colors, money, radius, euroFirst } from '../theme';
import { getIncome } from '../budget';
import { cleanAmountInput, amountText } from '../format';
import Pet from '../pet/Pet';
import Touch from '../components/ui/Touch';
import { themed } from '../themed';
import { t } from '../i18n';

// First launch: the dog wakes up once you enter your income
export default function OnboardingScreen() {
  const { incomes, createPet } = useStore();
  const insets = useSafeAreaInsets();
  const now = new Date();
  const existing = getIncome(incomes, now.getFullYear(), now.getMonth());
  const [incomeText, setIncomeText] = useState(amountText(existing));
  const [name, setName] = useState(defaultPetName);
  const income = parseFloat(incomeText.replace(/\s/g, '').replace(',', '.')) || 0;

  return (
    <LinearGradient colors={[colors.heroFrom, colors.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <StatusBar style="light" />
      {/* iOS lifts the content above the keyboard by itself and shows the field being edited */}
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: insets.top + 30, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
          <Pet expression={income > 0 ? 'ecstatic' : 'sleeping'} stage="kitten" size={190} />
          <Text style={s.h1}>{income > 0 ? t('Бау! Събудих се 🐾') : t('Здравей! Аз съм твоето кученце')}</Text>
          <Text style={s.sub}>
            {t('Ще следя бюджета ти по правилото 50/30/20. Колкото по-добре се справяш, толкова по-щастлив съм — и раста.')}
          </Text>

          <View style={s.card}>
            <Text style={s.label}>{t('Месечен доход')}</Text>
            <View style={[s.row, euroFirst() && { flexDirection: 'row-reverse', justifyContent: 'flex-end' }]}>
              <TextInput
                value={incomeText}
                onChangeText={(text) => setIncomeText(cleanAmountInput(text))}
            maxLength={10}
                placeholder="0"
                placeholderTextColor={colors.placeholder}
                keyboardType="decimal-pad"
                accessibilityLabel={t('Месечен доход в евро')}
                style={s.income}
              />
              <Text style={s.currency}>€</Text>
            </View>
            {income > 0 && (
              <View style={s.split}>
                <Text style={[s.splitItem, { color: colors.needs }]}>{t('Нужди {0}', { 0: money(income * 0.5) })}</Text>
                <Text style={[s.splitItem, { color: colors.wants }]}>{t('Желания {0}', { 0: money(income * 0.3) })}</Text>
                <Text style={[s.splitItem, { color: colors.savings }]}>{t('Спестявания {0}', { 0: money(income * 0.2) })}</Text>
              </View>
            )}
            <Text style={[s.label, { marginTop: 18 }]}>{t('Как да се казвам?')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={defaultPetName()}
              placeholderTextColor={colors.muted}
              style={s.name}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              accessibilityLabel={t('Име на кучето')}
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
            <Text style={s.btnText}>{t('Да започваме')}</Text>
          </Touch>
      </ScrollView>
    </LinearGradient>
  );
}

const s = themed((colors) => ({
  container: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24 },
  h1: { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  sub: { color: 'rgba(255,255,255,0.88)', fontSize: 15, textAlign: 'center', lineHeight: 21, marginTop: 10 },
  card: { alignSelf: 'stretch', backgroundColor: colors.card, borderRadius: 28, padding: 20, marginTop: 26 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  row: { flexDirection: 'row', alignItems: 'baseline' },
  income: { flex: 1, minWidth: 0, fontSize: 38, fontWeight: '800', color: colors.text, paddingVertical: 4 },
  currency: { fontSize: 24, color: colors.muted, fontWeight: '700' },
  split: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  splitItem: { fontSize: 12, fontWeight: '700', backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, overflow: 'hidden' },
  name: { fontSize: 20, fontWeight: '700', color: colors.text, paddingVertical: 6, borderBottomWidth: 1, borderColor: colors.faint },
  btn: { alignSelf: 'stretch', backgroundColor: colors.ink, borderRadius: radius.pill, paddingVertical: 17, alignItems: 'center', marginTop: 20 },
  btnText: { color: colors.onAccent, fontSize: 16, fontWeight: '700' },
}));
