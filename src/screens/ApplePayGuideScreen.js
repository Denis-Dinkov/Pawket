import React, { useEffect, useState } from 'react';
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
import { themed } from '../themed';
import { t, tList } from '../i18n';
import { requestReminderPermission } from '../reminders';

const STEPS = [
  tList(['Отвори „Команди“', 'Приложението Shortcuts → раздел „Автоматизация“ → бутон „+“.']),
  tList(['Избери „Транзакция“', 'Отбележи картите си от Wallet. Избери „Изпълни веднага“ и натисни „Напред“.']),
  tList(['Добави „Запиши плащане“', 'Нова празна автоматизация → потърси „Pawket“ → действие „Запиши плащане“.']),
  tList(['Свържи сумата и магазина', 'Докосни „Сума“ и избери променливата „Сума“, после „Търговец“ → „Търговец“.']),
  tList(['Готово!', 'След всяко плащане Pawket записва разхода сам — дори при заключен телефон — обновява бюджета и ти изпраща известие. Новите плащания са оцветени, докато не ги погледнеш.']),
];

// Guide for the Shortcuts automation that records every Apple Pay payment ("Запиши плащане", works while locked).
// The older "Open URLs" automation stays as an option for people who want to fill in the expense themselves.
export default function ApplePayGuideScreen({ onClose, onTry }) {
  const [copied, setCopied] = useState(false);
  // The action sends a notification for every payment it records, so setting it up is the moment to ask
  useEffect(() => {
    requestReminderPermission().catch(() => {});
  }, []);
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
          <Text style={s.backText}>{t('Назад')}</Text>
        </Touch>
      </View>

      <View style={s.hero}>
        <IconBadge icon="logo-apple" color={colors.ink} size={64} solid />
        <Text style={s.h1}>{t('Запис след Apple Pay')}</Text>
        <Text style={s.sub}>
          {t('След всяко плащане Pawket записва разхода сам, без да го отваряш. Категорията я помня по магазина.')}
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

      <Text style={s.section}>{t('Или: да се отваря „Нов разход“')}</Text>
      <Text style={[s.note, { marginBottom: 10 }]}>
        {t('Вместо „Запиши плащане“ добави „URL кодиране“ на „Търговец“ и „Отвори URL адреси“ с шаблона отдолу ([Сума] → „Сума“, [Търговец] → резултата от „URL кодиране“). Тогава сам избираш категорията, но iOS не отваря приложения при заключен телефон и такова плащане се губи.')}
      </Text>
      <Touch onPress={copy} style={s.template}>
        <Text style={s.code} selectable>
          {APPLE_PAY_TEMPLATE}
        </Text>
        <View style={s.copy}>
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color="#fff" />
          <Text style={s.copyText}>{copied ? t('Копирано') : t('Копирай')}</Text>
        </View>
      </Touch>

      <Pill
        icon="flash-outline"
        label={t('Пробвай как изглежда')}
        variant="soft"
        style={{ alignSelf: 'center', marginTop: 18 }}
        onPress={() => onTry({ amount: 4.8, merchant: 'Starbucks', source: 'applepay' })}
      />

      <View style={s.notes}>
        <Text style={s.note}>{t('• Изисква iOS 17 или по-нов.')}</Text>
        <Text style={s.note}>{t('• Не виждаш „Запиши плащане“? Отвори Pawket веднъж след обновяването.')}</Text>
        <Text style={s.note}>{t('• Работи за плащания с картите в Apple Wallet (телефон или часовник).')}</Text>
        <Text style={s.note}>{t('• Някои банки подават плащането със закъснение от няколко секунди.')}</Text>
      </View>
    </ScrollView>
  );
}

const s = themed((colors) => ({
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
  // A code block stays dark in both themes
  template: { backgroundColor: '#2A1E16', borderRadius: radius.card, padding: 16, gap: 12 },
  code: { color: '#F3E6D8', fontFamily: 'Courier', fontSize: 13, lineHeight: 19 },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  copyText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  notes: { marginTop: 20, gap: 4 },
  note: { color: colors.muted, fontSize: 12.5, lineHeight: 18 },
}));
