import React, { useState } from 'react';
import { View, ScrollView, Alert, Platform, Switch, Linking } from 'react-native';
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
import Segmented from '../components/ui/Segmented';
import Pill from '../components/ui/Pill';
import { remindersAvailable, requestReminderPermission } from '../reminders';
import { liveActivityAvailable } from '../widget/liveActivity';
import { backupAvailable, shareBackup, pickBackup } from '../backup';
import { dayLabel } from '../format';
import { themed } from '../themed';

const parseMoney = (t) => parseFloat(String(t).replace(/\s/g, '').replace(',', '.')) || 0;

function confirm(title, msg, onYes, yes = 'Изтрий') {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${msg}`)) onYes();
    return;
  }
  Alert.alert(title, msg, [
    { text: 'Отказ', style: 'cancel' },
    { text: yes, style: 'destructive', onPress: onYes },
  ]);
}

export default function SettingsScreen({ onClose, onTryApplePay }) {
  const { incomes, pet, categories, settings, lastBackupAt, setIncomeFrom, setPetName, addCategory, removeCategory, resetAll, setSettings, exportData, restoreData, showToast } =
    useStore();
  const reminder = settings.reminder;
  const [backupBusy, setBackupBusy] = useState(false);
  const backupAge = lastBackupAt ? Math.floor((Date.now() - new Date(lastBackupAt)) / 86400000) : null;

  const toggleReminder = async (on) => {
    if (!on) return setSettings({ reminder: { ...reminder, enabled: false } });
    const granted = await requestReminderPermission();
    if (!granted) {
      Alert.alert('Известията са изключени', 'Разреши известията за Pawket от Настройки на телефона, за да получаваш напомняне.', [
        { text: 'Отказ', style: 'cancel' },
        { text: 'Отвори Настройки', onPress: () => Linking.openSettings() },
      ]);
      return undefined;
    }
    setSettings({ reminder: { ...reminder, enabled: true } });
    return undefined;
  };

  const saveBackup = async () => {
    setBackupBusy(true);
    try {
      await shareBackup(exportData());
    } catch {
      showToast({ text: 'Архивът не се запази. Опитай пак.', icon: 'alert-circle' });
    } finally {
      setBackupBusy(false);
    }
  };

  const loadBackup = async () => {
    try {
      const backup = await pickBackup();
      if (!backup) return;
      const count = backup.data.expenses.length;
      const when = backup.exportedAt ? dayLabel(backup.exportedAt) : 'неизвестна дата';
      confirm('Възстановяване от архив', `Архив от ${when} с ${count} разхода. Сегашните данни ще бъдат заменени.`, () => {
        restoreData(backup);
        showToast({ text: 'Данните са възстановени', icon: 'checkmark-circle' });
        onClose();
      }, 'Възстанови');
    } catch (e) {
      Alert.alert('Не мога да отворя архива', e.message);
    }
  };
  const [newCategory, setNewCategory] = useState(false);
  const mine = categories.filter((c) => !c.archived);
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const current = getIncome(incomes, y, m);
  const [incomeText, setIncomeText] = useState(current ? String(current).replace('.', ',') : '');
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
                hitSlop={12}
                accessibilityLabel={`Изтрий категория ${c.name}`}
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

      <Card style={{ marginTop: 14, gap: 10 }}>
        <Text style={s.label}>Тема</Text>
        <Segmented
          options={[
            { key: 'system', label: 'Като телефона' },
            { key: 'light', label: 'Светла' },
            { key: 'dark', label: 'Тъмна' },
          ]}
          value={settings.theme}
          onChange={(theme) => setSettings({ theme })}
        />
      </Card>

      {liveActivityAvailable() && (
        <Card style={{ marginTop: 14 }}>
          <View style={s.switchRow}>
            <IconBadge icon="phone-portrait-outline" color={colors.primary} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={s.linkTitle}>{pet?.name} в Dynamic Island</Text>
              <Text style={s.hint}>До камерата: кучето и колко можеш да харчиш днес. Задръж, за да видиш повече.</Text>
            </View>
            <Switch
              value={settings.liveActivity !== false}
              onValueChange={(v) => setSettings({ liveActivity: v })}
              trackColor={{ true: colors.primary }}
              accessibilityLabel="Чарли в Dynamic Island"
            />
          </View>
        </Card>
      )}

      {remindersAvailable() && (
        <Card style={{ marginTop: 14, gap: 10 }}>
          <View style={s.switchRow}>
            <IconBadge icon="notifications-outline" color={colors.primary} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={s.linkTitle}>Вечерно напомняне</Text>
              <Text style={s.hint}>Само в дните без запис: „{pet?.name} е гладен — днес харчи ли нещо?“</Text>
            </View>
            <Switch value={reminder.enabled} onValueChange={toggleReminder} trackColor={{ true: colors.primary }} accessibilityLabel="Вечерно напомняне" />
          </View>
          {reminder.enabled && (
            <Segmented
              options={[19, 20, 21, 22].map((h) => ({ key: String(h), label: `${h}:00` }))}
              value={String(reminder.hour)}
              onChange={(h) => setSettings({ reminder: { ...reminder, hour: Number(h) } })}
            />
          )}
        </Card>
      )}

      {backupAvailable() && (
        <Card style={{ marginTop: 14, gap: 10 }}>
          <View style={s.switchRow}>
            <IconBadge icon="cloud-upload-outline" color={colors.needs} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={s.linkTitle}>Архив на данните</Text>
              <Text style={[s.hint, backupAge != null && backupAge > 30 && { color: colors.danger }, backupAge == null && { color: colors.warning }]}>
                {backupAge == null
                  ? 'Още няма архив. Данните са само на този телефон.'
                  : `Последен архив: ${dayLabel(lastBackupAt)}${backupAge > 30 ? ' — време е за нов' : ''}`}
              </Text>
            </View>
          </View>
          <Text style={s.hint}>Запази файла във „Файлове → iCloud Drive“ (или Google Drive). Така разходите и растежът на {pet?.name} оцеляват при смяна на телефон.</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Pill icon="share-outline" label={backupBusy ? 'Подготвям…' : 'Запази архив'} variant="ink" onPress={backupBusy ? undefined : saveBackup} />
            <Pill icon="download-outline" label="Възстанови" variant="outline" onPress={loadBackup} />
          </View>
        </Card>
      )}

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

const s = themed((colors) => ({
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
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  danger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 28, paddingVertical: 12 },
  dangerText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
}));
