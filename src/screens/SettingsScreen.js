import React, { useState } from 'react';
import { View, ScrollView, Alert, Platform, Switch, Linking } from 'react-native';
import { Text, TextInput } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors, MONTHS, BUCKETS, money, radius, monthLower, euroFirst } from '../theme';
import { getIncome } from '../budget';
import { cleanAmountInput, amountText } from '../format';
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
import { dayLabel, plural } from '../format';
import { themed } from '../themed';
import { t } from '../i18n';

const parseMoney = (text) => parseFloat(String(text).replace(/\s/g, '').replace(',', '.')) || 0;

function confirm(title, msg, onYes, yes = t('Изтрий')) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${msg}`)) onYes();
    return;
  }
  Alert.alert(title, msg, [
    { text: t('Отказ'), style: 'cancel' },
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
      Alert.alert(t('Известията са изключени'), t('Разреши известията за Pawket от Настройки на телефона, за да получаваш напомняне.'), [
        { text: t('Отказ'), style: 'cancel' },
        { text: t('Отвори Настройки'), onPress: () => Linking.openSettings() },
      ]);
      return undefined;
    }
    setSettings({ reminder: { ...reminder, enabled: true } });
    return undefined;
  };
  // The savings alert works without permission too (as a message inside the app), so it's never blocked
  const toggleSavingsAlert = async (on) => {
    setSettings({ savingsAlert: on });
    if (on) await requestReminderPermission();
  };

  const saveBackup = async () => {
    setBackupBusy(true);
    try {
      await shareBackup(exportData());
    } catch {
      showToast({ text: t('Архивът не се запази. Опитай пак.'), icon: 'alert-circle' });
    } finally {
      setBackupBusy(false);
    }
  };

  const loadBackup = async () => {
    try {
      const backup = await pickBackup();
      if (!backup) return;
      const count = backup.data.expenses.length;
      const when = backup.exportedAt ? dayLabel(backup.exportedAt) : t('неизвестна дата');
      confirm(t('Възстановяване от архив'), t('Архив от {0} с {1}. Сегашните данни ще бъдат заменени.', { 0: when, 1: plural(count, t('плащане'), t('плащания')) }), () => {
        restoreData(backup);
        showToast({ text: t('Данните са възстановени'), icon: 'checkmark-circle' });
        onClose();
      }, t('Възстанови'));
    } catch (e) {
      Alert.alert(t('Не мога да отворя архива'), e.message);
    }
  };
  const [newCategory, setNewCategory] = useState(false);
  const mine = categories.filter((c) => !c.archived);
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const current = getIncome(incomes, y, m);
  const [incomeText, setIncomeText] = useState(amountText(current));
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
        <Text style={s.title}>{t('Настройки')}</Text>
        <Touch
          hitSlop={12}
          onPress={() => {
            saveIncome();
            setPetName(name);
            onClose();
          }}
        >
          <Text style={s.done}>{t('Готово')}</Text>
        </Touch>
      </View>

      <Card style={{ marginTop: 20 }}>
        <Text style={s.label}>{t('Месечен доход')}</Text>
        <View style={[s.incomeRow, euroFirst() && { flexDirection: 'row-reverse', justifyContent: 'flex-end' }]}>
          <TextInput
            value={incomeText}
            onChangeText={(text) => setIncomeText(cleanAmountInput(text))}
            maxLength={10}
            onEndEditing={saveIncome}
            onBlur={saveIncome}
            placeholder={t('Въведи доход')}
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            style={s.incomeInput}
          />
          <Text style={s.currency}>€</Text>
        </View>
        <Text style={s.hint}>
          {t('Важи от {0} {1} нататък — миналите месеци пазят своя доход.', { 0: monthLower(m), 1: y })}
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
            <Text style={s.label}>{t('Име на кучето')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              onEndEditing={() => setPetName(name)}
              placeholder={t('Чарли')}
              placeholderTextColor={colors.muted}
              style={s.nameInput}
            />
            <Text style={s.hint}>
              {stage.name} · {pet?.xp || 0} XP{next ? t(' · {0} при {1} XP', { 0: next.name, 1: next.xp }) : ''}
            </Text>
          </View>
        </View>
      </Card>

      <Card style={{ marginTop: 14 }}>
        <View style={s.catHead}>
          <Text style={s.label}>{t('Моите категории')}</Text>
          <Touch onPress={() => setNewCategory(true)} hitSlop={8}>
            <Text style={s.addLink}>{t('+ Нова')}</Text>
          </Touch>
        </View>
        {mine.length === 0 ? (
          <Text style={s.hint}>{t('Добави свои категории — появяват се при „Нов разход“ в избраната част от 50/30/20.')}</Text>
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
                accessibilityLabel={t('Изтрий категория {0}', { 0: c.name })}
                onPress={() =>
                  confirm(t('Изтриване на категория'), t('„{0}“ изчезва от избора. Старите разходи в нея се запазват.', { 0: c.name }), () =>
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
        <Text style={s.label}>{t('Тема')}</Text>
        <Segmented
          options={[
            { key: 'system', label: t('Като телефона') },
            { key: 'light', label: t('Светла') },
            { key: 'dark', label: t('Тъмна') },
          ]}
          value={settings.theme}
          onChange={(theme) => setSettings({ theme })}
        />
        <Text style={[s.label, { marginTop: 6 }]}>{t('Език')}</Text>
        {/* Each language is named in itself, so it can be found whatever the app is showing */}
        <Segmented
          options={[
            { key: 'system', label: t('Като телефона') },
            { key: 'bg', label: 'Български' },
            { key: 'en', label: 'English' },
          ]}
          value={settings.language || 'system'}
          onChange={(language) => setSettings({ language })}
        />
      </Card>

      {liveActivityAvailable() && (
        <Card style={{ marginTop: 14 }}>
          <View style={s.switchRow}>
            <IconBadge icon="phone-portrait-outline" color={colors.primary} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={s.linkTitle}>{t('{0} в Dynamic Island', { 0: pet?.name })}</Text>
              <Text style={s.hint}>{t('Само когато нещо се случва: ден без разходи, разход над лимита или от спестяванията, плащане днес и последните дни от месеца.')}</Text>
            </View>
            <Switch
              value={settings.liveActivity !== false}
              onValueChange={(v) => setSettings({ liveActivity: v })}
              trackColor={{ true: colors.primary }}
              accessibilityLabel={t('Чарли в Dynamic Island')}
            />
          </View>
        </Card>
      )}

      {remindersAvailable() && (
        <Card style={{ marginTop: 14, gap: 10 }}>
          <View style={s.switchRow}>
            <IconBadge icon="notifications-outline" color={colors.primary} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={s.linkTitle}>{t('Вечерно напомняне')}</Text>
              <Text style={s.hint}>{t('Само в дните без запис: „{0} е гладен — похарчи ли нещо днес?“', { 0: pet?.name })}</Text>
            </View>
            <Switch value={reminder.enabled} onValueChange={toggleReminder} trackColor={{ true: colors.primary }} accessibilityLabel={t('Вечерно напомняне')} />
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

      <Card style={{ marginTop: 14 }}>
        <View style={s.switchRow}>
          <IconBadge icon="shield-outline" color={colors.savings} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={s.linkTitle}>{t('Предупреждение за спестяванията')}</Text>
            <Text style={s.hint}>{t('Дневният лимит пази 20% за спестяване. Когато разход започне да яде от тях, {0} ще ти каже веднага.', { 0: pet?.name })}</Text>
          </View>
          <Switch
            value={settings.savingsAlert !== false}
            onValueChange={toggleSavingsAlert}
            trackColor={{ true: colors.primary }}
            accessibilityLabel={t('Предупреждение за спестяванията')}
          />
        </View>
      </Card>

      {backupAvailable() && (
        <Card style={{ marginTop: 14, gap: 10 }}>
          <View style={s.switchRow}>
            <IconBadge icon="cloud-upload-outline" color={colors.needs} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={s.linkTitle}>{t('Архив на данните')}</Text>
              <Text style={[s.hint, backupAge != null && backupAge > 30 && { color: colors.danger }, backupAge == null && { color: colors.warning }]}>
                {backupAge == null
                  ? t('Още няма архив. Данните са само на този телефон.')
                  : t('Последен архив: {0}{1}', { 0: dayLabel(lastBackupAt), 1: backupAge > 30 ? t(' — време е за нов') : '' })}
              </Text>
            </View>
          </View>
          <Text style={s.hint}>{t('Запази файла във „Файлове → iCloud Drive“ (или Google Drive). Така разходите и растежът на {0} оцеляват при смяна на телефон.', { 0: pet?.name })}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Pill icon="share-outline" label={backupBusy ? t('Подготвям…') : t('Запази архив')} variant="ink" onPress={backupBusy ? undefined : saveBackup} />
            <Pill icon="download-outline" label={t('Възстанови')} variant="outline" onPress={loadBackup} />
          </View>
        </Card>
      )}

      {Platform.OS !== 'android' && (
        <Touch onPress={() => setGuide(true)}>
          <Card style={[s.linkRow, { marginTop: 14 }]}>
            <IconBadge icon="logo-apple" color={colors.ink} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={s.linkTitle}>{t('Запис след Apple Pay')}</Text>
              <Text style={s.hint}>{t('Записва всяко плащане сам, дори при заключен телефон')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Card>
        </Touch>
      )}

      <Touch
        style={s.danger}
        onPress={() =>
          confirm(t('Изтриване на всички данни'), t('Разходите, доходите и кучето ще бъдат изтрити безвъзвратно.'), () => {
            resetAll();
            onClose();
          })
        }
      >
        <Ionicons name="trash-outline" size={16} color={colors.danger} />
        <Text style={s.dangerText}>{t('Изтрий всички данни')}</Text>
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
