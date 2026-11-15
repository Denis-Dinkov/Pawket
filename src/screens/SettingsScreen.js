import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert, Platform, Switch, Linking, AppState } from 'react-native';
import { Text, TextInput } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors, BUCKETS, moneyShort, radius, monthLower, euroFirst } from '../theme';
import { getIncome } from '../budget';
import { cleanAmountInput, amountText, parseAmount } from '../format';
import { stageFor } from '../pet/logic';
import Card from '../components/ui/Card';
import IconBadge from '../components/ui/IconBadge';
import Pet from '../pet/Pet';
import ApplePayGuideScreen from './ApplePayGuideScreen';
import Touch from '../components/ui/Touch';
import NewCategorySheet from '../components/NewCategorySheet';
import SplitSheet from '../components/SplitSheet';
import { splitPercents, splitFor } from '../split';
import Segmented from '../components/ui/Segmented';
import Pill from '../components/ui/Pill';
import { remindersAvailable, requestReminderPermission } from '../reminders';
import { liveActivityAvailable } from '../widget/liveActivity';
import { backupAvailable, shareBackup, pickBackup } from '../backup';
import { dayLabel, plural, timeLabel } from '../format';
import { notificationReaderAvailable, notificationAccessEnabled, openNotificationAccess, unreadNotifications } from '../androidPayments';
import { appVersion } from '../appVersion';
import { themed } from '../themed';
import { t } from '../i18n';

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
  const { incomes, pet, categories, settings, lastBackupAt, setIncomeFrom, setSplitFrom, setPetName, addCategory, removeCategory, resetAll, setSettings, exportData, restoreData, showToast } =
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
  // The part whose percent was tapped (the split sheet opens on it), or null
  const [splitFocus, setSplitFocus] = useState(null);
  const split = splitPercents(splitFor(y, m));

  const saveIncome = () => setIncomeFrom(y, m, parseAmount(incomeText));
  const income = parseAmount(incomeText);

  // Android: whether Pawket may read the payment notifications; checked again on coming back from the system screen
  const [access, setAccess] = useState(notificationAccessEnabled);
  const [unread, setUnread] = useState([]);
  useEffect(() => {
    if (!notificationReaderAvailable()) return undefined;
    unreadNotifications().then(setUnread);
    const sub = AppState.addEventListener('change', (st) => st === 'active' && setAccess(notificationAccessEnabled()));
    return () => sub.remove();
  }, []);

  if (guide) return <ApplePayGuideScreen onClose={() => setGuide(false)} onTry={onTryApplePay} />;

  const done = () => {
    saveIncome();
    setPetName(name);
    onClose();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Outside the scroll view, so "Готово" is always within reach */}
      <View style={s.header}>
        <View style={{ width: 70 }} />
        <Text style={s.title} accessibilityRole="header">{t('Настройки')}</Text>
        <Touch hitSlop={12} onPress={done} style={s.doneBtn}>
          <Text style={s.done}>{t('Готово')}</Text>
        </Touch>
      </View>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Text style={[s.group, { marginTop: 4 }]} accessibilityRole="header">{t('Бюджет')}</Text>
        <Card>
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
              accessibilityLabel={t('Месечен доход в евро')}
            />
            <Text style={s.currency}>€</Text>
          </View>
          <Text style={s.hint}>{t('Важи от {0} {1} нататък.', { 0: monthLower(m), 1: y })}</Text>
          {/* The split: each part is named, tap one to change it */}
          <View style={s.split}>
            {['needs', 'wants', 'savings'].map((k) => (
              <Touch
                key={k}
                haptic="select"
                onPress={() => setSplitFocus(k)}
                style={s.splitCell}
                accessibilityLabel={t('{0} {1}%. Промени', { 0: BUCKETS[k].label, 1: split[k] })}
              >
                <View style={s.splitHead}>
                  <View style={[s.dot, { backgroundColor: BUCKETS[k].color }]} />
                  <Text style={s.splitName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{BUCKETS[k].label}</Text>
                </View>
                <Text style={[s.splitPct, { color: BUCKETS[k].color }]}>{split[k]}%</Text>
                {income > 0 && <Text style={s.splitAmount} numberOfLines={1}>{moneyShort((income * split[k]) / 100)}</Text>}
              </Touch>
            ))}
          </View>
          <Touch haptic="select" onPress={() => setSplitFocus('needs')} hitSlop={8} style={s.splitEdit}>
            <Ionicons name="options-outline" size={14} color={colors.primary} />
            <Text style={s.addLink}>{t('Промени разпределението')}</Text>
          </Touch>
        </Card>

        <SplitSheet
          visible={!!splitFocus}
          focus={splitFocus}
          onClose={() => setSplitFocus(null)}
          current={split}
          income={income}
          month={m}
          year={y}
          onSave={(p) => {
            setSplitFrom(y, m, p);
            setSplitFocus(null);
          }}
        />

        <Card style={s.gap}>
          <View style={s.catHead}>
            <Text style={s.label}>{t('Моите категории')}</Text>
            <Touch onPress={() => setNewCategory(true)} hitSlop={8}>
              <Text style={s.addLink}>{t('+ Нова')}</Text>
            </Touch>
          </View>
          {mine.length === 0 ? (
            <Text style={s.hint}>{t('Добави своя категория за „Нов разход“.')}</Text>
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

        <Text style={s.group} accessibilityRole="header">{pet?.name}</Text>
        <Card>
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
                accessibilityLabel={t('Име на кучето')}
              />
              <Text style={s.hint}>
                {stage.name} · {pet?.xp || 0} XP{next ? t(' · {0} при {1} XP', { 0: next.name, 1: next.xp }) : ''}
              </Text>
            </View>
          </View>
        </Card>

        <Text style={s.group} accessibilityRole="header">{t('Изглед')}</Text>
        <Card style={{ gap: 10 }}>
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

        {/* One card for everything that notifies: three switches read faster as rows than as three cards */}
        <Text style={s.group} accessibilityRole="header">{t('Известия')}</Text>
        <Card style={{ paddingVertical: 6 }}>
          {remindersAvailable() && (
            <View style={s.row}>
              <IconBadge icon="notifications-outline" color={colors.primary} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={s.linkTitle}>{t('Вечерно напомняне')}</Text>
                <Text style={s.rowHint}>{t('Само в дните без запис.')}</Text>
              </View>
              <Switch thumbColor={colors.white} value={reminder.enabled} onValueChange={toggleReminder} trackColor={{ true: colors.primary }} accessibilityLabel={t('Вечерно напомняне')} />
            </View>
          )}
          {remindersAvailable() && reminder.enabled && (
            <Segmented
              options={[19, 20, 21, 22].map((h) => ({ key: String(h), label: `${h}:00` }))}
              value={String(reminder.hour)}
              onChange={(h) => setSettings({ reminder: { ...reminder, hour: Number(h) } })}
              style={{ marginBottom: 12 }}
            />
          )}
          <View style={[s.row, remindersAvailable() && s.sep]}>
            <IconBadge icon="shield-outline" color={colors.savings} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={s.linkTitle}>{t('Пази спестяванията')}</Text>
              <Text style={s.rowHint}>{t('Казва ти, щом разход бръкне в тях.')}</Text>
            </View>
            <Switch
              thumbColor={colors.white}
              value={settings.savingsAlert !== false}
              onValueChange={toggleSavingsAlert}
              trackColor={{ true: colors.primary }}
              accessibilityLabel={t('Пази спестяванията')}
            />
          </View>
          {liveActivityAvailable() && (
            <View style={[s.row, s.sep]}>
              <IconBadge icon="phone-portrait-outline" color={colors.primary} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={s.linkTitle}>{t('{0} в Dynamic Island', { 0: pet?.name })}</Text>
                <Text style={s.rowHint}>{t('Само при важни моменти.')}</Text>
              </View>
              <Switch
                thumbColor={colors.white}
                value={settings.liveActivity !== false}
                onValueChange={(v) => setSettings({ liveActivity: v })}
                trackColor={{ true: colors.primary }}
                accessibilityLabel={t('{0} в Dynamic Island', { 0: pet?.name })}
              />
            </View>
          )}
        </Card>

        <Text style={s.group} accessibilityRole="header">{t('Автоматичен запис')}</Text>
        {notificationReaderAvailable() && (
          <Card style={{ gap: 10 }}>
            <View style={s.linkRow}>
              <IconBadge icon="notifications" color={access ? colors.savings : colors.ink} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={s.linkTitle}>{t('Запис от известия')}</Text>
                <Text style={s.rowHint}>{access ? t('Включено за Google Wallet и Revolut.') : t('Изключено. Нужен е достъп до известията.')}</Text>
              </View>
            </View>
            <Text style={[s.hint, { marginTop: 0 }]}>{t('Чета само сумата и магазина. Нищо не излиза от телефона.')}</Text>
            <Pill
              icon={access ? 'settings-outline' : 'key-outline'}
              label={access ? t('Настройки за достъп') : t('Разреши достъп')}
              variant={access ? 'outline' : 'ink'}
              onPress={openNotificationAccess}
            />
            {unread.length > 0 && (
              <View style={{ gap: 6 }}>
                <Text style={s.label}>{t('Известия, които не разпознах')}</Text>
                {unread.map((n, i) => (
                  <Text key={i} style={s.hint} selectable>
                    {timeLabel(new Date(n.time).toISOString())} · {[n.title, n.text].filter(Boolean).join(' — ')}
                  </Text>
                ))}
              </View>
            )}
          </Card>
        )}
        {Platform.OS !== 'android' && (
          <Touch onPress={() => setGuide(true)}>
            <Card style={s.linkRow}>
              <IconBadge icon="logo-apple" color={colors.ink} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={s.linkTitle}>{t('Запис след Apple Pay')}</Text>
                <Text style={s.rowHint}>{t('Всяко плащане се записва само.')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Card>
          </Touch>
        )}

        <Text style={s.group} accessibilityRole="header">{t('Данни')}</Text>
        {backupAvailable() && (
          <Card style={{ gap: 12 }}>
            <View style={s.linkRow}>
              <IconBadge icon="cloud-upload-outline" color={colors.needs} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={s.linkTitle}>{t('Архив на данните')}</Text>
                <Text style={[s.rowHint, backupAge != null && backupAge > 30 && { color: colors.danger }, backupAge == null && { color: colors.warning }]}>
                  {backupAge == null
                    ? t('Още няма архив. Данните са само на този телефон.')
                    : t('Последен архив: {0}{1}', { 0: dayLabel(lastBackupAt), 1: backupAge > 30 ? t(' — време е за нов') : '' })}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Pill icon="share-outline" label={backupBusy ? t('Подготвям…') : t('Запази архив')} variant="ink" onPress={backupBusy ? undefined : saveBackup} />
              <Pill icon="download-outline" label={t('Възстанови')} variant="outline" onPress={loadBackup} />
            </View>
            <Text style={[s.hint, { marginTop: 0 }]}>{t('Запази файла в iCloud Drive или Google Drive.')}</Text>
          </Card>
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

        {/* Which build is installed: version, commit and build time (see src/appVersion.js) */}
        <Text style={s.version} selectable accessibilityLabel={t('Версия {0}', { 0: appVersion() })}>
          {t('Версия {0}', { 0: appVersion() })}
        </Text>

        <NewCategorySheet
          visible={newCategory}
          onClose={() => setNewCategory(false)}
          onCreate={(c) => {
            addCategory(c);
            setNewCategory(false);
          }}
        />
      </ScrollView>
    </View>
  );
}

const s = themed((colors) => ({
  container: { paddingHorizontal: 16, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  doneBtn: { width: 70, minHeight: 44, justifyContent: 'center' },
  done: { color: colors.primary, fontSize: 15, fontWeight: '700', textAlign: 'right' },
  // A group of related cards: its heading sits outside them
  group: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 24, marginBottom: 10, marginHorizontal: 4 },
  gap: { marginTop: 12 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  incomeRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
  incomeInput: { flex: 1, minWidth: 0, fontSize: 30, fontWeight: '800', color: colors.text, paddingVertical: 4 },
  currency: { fontSize: 22, color: colors.muted, fontWeight: '700' },
  hint: { color: colors.muted, fontSize: 13, marginTop: 6, lineHeight: 18 },
  split: { flexDirection: 'row', gap: 8, marginTop: 14 },
  splitCell: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.badge, paddingHorizontal: 8, paddingVertical: 10, gap: 2 },
  splitHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  splitName: { color: colors.muted, fontSize: 12, fontWeight: '600', flexShrink: 1 },
  splitPct: { fontSize: 18, fontWeight: '800' },
  splitAmount: { color: colors.muted, fontSize: 12 },
  splitEdit: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 12, minHeight: 32 },
  petRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  addLink: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  catName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  nameInput: { fontSize: 20, fontWeight: '800', color: colors.text, paddingVertical: 4 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  sep: { borderTopWidth: 1, borderColor: colors.faint },
  rowHint: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 1 },
  linkTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  danger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 28, paddingVertical: 12, minHeight: 44 },
  version: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 4 },
  dangerText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
}));
