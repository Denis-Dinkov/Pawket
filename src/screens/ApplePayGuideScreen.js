import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors, radius } from '../theme';
import { APPLE_PAY_TEMPLATE } from '../deeplink';
import Card from '../components/ui/Card';
import IconBadge from '../components/ui/IconBadge';
import Pill from '../components/ui/Pill';
import Touch from '../components/ui/Touch';

const STEPS = [
  ['Отвори „Команди“', 'Приложението Shortcuts → раздел „Автоматизация“ → бутон „+“.'],
  ['Избери „Транзакция“', 'Отбележи картите си от Wallet. Избери „Изпълни веднага“ и натисни „Напред“.'],
  ['Кодирай търговеца', 'Нова празна автоматизация → действие „URL кодиране“ → в него сложи „Търговец“ от входа на командата.'],
  ['Отвори Pawket', 'Добави „Отвори URL адреси“ и постави шаблона отдолу. Замени [Сума] със „Сума“, а [Търговец] — с резултата от „URL кодиране“.'],
  ['Готово!', 'След следващото плащане Pawket ще се отвори с попълнени сума и магазин. Избираш категория и „Запази“.'],
];

// Guide for the Shortcuts automation that opens "New expense" after Apple Pay
export default function ApplePayGuideScreen({ onClose, onTry }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await Clipboard.setStringAsync(APPLE_PAY_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Touch onPress={onClose} hitSlop={12} style={s.back}>
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
          <Text style={s.backText}>Назад</Text>
        </Touch>
      </View>

      <View style={s.hero}>
        <IconBadge icon="logo-apple" color={colors.ink} size={64} solid />
        <Text style={s.h1}>Запис след Apple Pay</Text>
        <Text style={s.sub}>
          След всяко плащане iPhone отваря Pawket с попълнени сума и магазин. Категорията я помня по магазина — често стига едно „Запази“.
        </Text>
      </View>

      <Card style={{ gap: 16 }}>
        {STEPS.map(([title, text], i) => (
          <View key={title} style={s.step}>
            <View style={s.num}>
              <Text style={s.numText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.stepTitle}>{title}</Text>
              <Text style={s.stepText}>{text}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Text style={s.section}>Шаблон за „Отвори URL адреси“</Text>
      <Touch onPress={copy} style={s.template}>
        <Text style={s.code} selectable>
          {APPLE_PAY_TEMPLATE}
        </Text>
        <View style={s.copy}>
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color="#fff" />
          <Text style={s.copyText}>{copied ? 'Копирано' : 'Копирай'}</Text>
        </View>
      </Touch>

      <Pill
        icon="flash-outline"
        label="Пробвай как изглежда"
        variant="soft"
        style={{ alignSelf: 'center', marginTop: 18 }}
        onPress={() => onTry({ amount: 4.8, merchant: 'Starbucks', source: 'applepay' })}
      />

      <View style={s.notes}>
        <Text style={s.note}>• Изисква iOS 17 или по-нов.</Text>
        <Text style={s.note}>• Работи за плащания с картите в Apple Wallet (телефон или часовник).</Text>
        <Text style={s.note}>• Някои банки подават плащането със закъснение от няколко секунди.</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },
  header: { flexDirection: 'row' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  hero: { alignItems: 'center', marginVertical: 20 },
  h1: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 12 },
  sub: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  step: { flexDirection: 'row', gap: 12 },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  numText: { color: colors.primary, fontWeight: '800' },
  stepTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  stepText: { color: colors.muted, fontSize: 13.5, lineHeight: 19, marginTop: 2 },
  section: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 24, marginBottom: 10 },
  template: { backgroundColor: colors.ink, borderRadius: radius.card, padding: 16, gap: 12 },
  code: { color: '#F3E6D8', fontFamily: 'Courier', fontSize: 13, lineHeight: 19 },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  copyText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  notes: { marginTop: 20, gap: 4 },
  note: { color: colors.muted, fontSize: 12.5, lineHeight: 18 },
});
