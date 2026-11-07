import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui/AppText';
import Sheet from './ui/Sheet';
import Money from './ui/Money';
import { colors, money, monthLower } from '../theme';
import { SAVINGS_SHARE } from '../budget';
import { themed } from '../themed';
import { t } from '../i18n';

const exact = (n) => money(Math.round(n * 100) / 100);

function Row({ label, value, strong }) {
  return (
    <View style={s.row}>
      <Text style={[s.rowLabel, strong && s.strong]}>{label}</Text>
      <Text style={[s.rowValue, strong && s.strong]}>{value}</Text>
    </View>
  );
}

/**
 * Today's limit in plain words: this morning's free money ÷ days left, minus what was spent today,
 * and what tomorrow's limit will be. Opened from the limit on Home (see dailyLimit in budget.js).
 */
export default function LimitSheet({ visible, onClose, daily, now }) {
  if (!daily) return null;
  const month = monthLower(now.getMonth());
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  // Saved more than 20%: the row shows what was saved, not the 20%
  const savingsTarget = daily.savings <= daily.income * SAVINGS_SHARE + 0.005;
  const over = daily.overToday > 0;

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={s.title}>{over ? t('Над лимита днес') : t('Остават за днес')}</Text>
      <Money
        value={over ? daily.overToday : daily.leftToday}
        size={40}
        color={over || daily.eatenSavings > 0 ? colors.danger : colors.savings}
        style={{ textAlign: 'center', marginTop: 6 }}
      />
      <Text style={s.sub}>{t('от {0} лимит за днес', { 0: exact(daily.todayLimit) })}</Text>

      {daily.eatenSavings > 0 && (
        <View style={s.alert}>
          <Ionicons name="alert-circle" size={18} color={colors.danger} />
          <Text style={s.alertText}>{t('Свободните пари свършиха. Вече харчиш от спестяванията: {0}.', { 0: exact(daily.eatenSavings) })}</Text>
        </View>
      )}

      <View style={s.card}>
        <Row label={t('Лимит за днес')} value={exact(daily.todayLimit)} strong />
        <Row label={t('− Похарчени днес')} value={exact(daily.spentToday)} />
        <View style={s.sep} />
        <Row label={over ? t('= Над лимита') : t('= Остават')} value={exact(over ? daily.overToday : daily.leftToday)} strong />
      </View>

      <Text style={s.section}>{t('Как се смята лимитът за днес')}</Text>
      <View style={[s.card, { marginTop: 0 }]}>
        <Row label={t('Свободни тази сутрин')} value={exact(daily.morningFree)} />
        <Row label={t('÷ дни до {0} {1} (с днес)', { 0: lastDay, 1: month })} value={String(daily.days)} />
        <View style={s.sep} />
        <Row label={t('= Лимит за днес')} value={exact(daily.todayLimit)} strong />
      </View>

      <Text style={s.section}>{t('Откъде са свободните')}</Text>
      <View style={[s.card, { marginTop: 0 }]}>
        <Row label={t('Доход')} value={exact(daily.income)} />
        <Row label={t('− Похарчени')} value={exact(daily.spent)} />
        <Row label={savingsTarget ? t('− Спестяване (20%)') : t('− Спестени')} value={exact(daily.savings)} />
        {daily.pending > 0 && <Row label={t('− Предстоящи плащания')} value={exact(daily.pending)} />}
        <View style={s.sep} />
        <Row label={t('= Свободни сега')} value={exact(Math.max(0, daily.free))} strong />
      </View>

      {daily.days > 1 && (
        <Text style={s.tomorrow}>
          {t('Утре: {0} на ден, ако днес не харчиш повече.', { 0: exact(daily.limitTomorrow) })}
        </Text>
      )}

      <View style={s.notes}>
        <Text style={s.note}>• {t('Всеки разход днес се вади изцяло от лимита за днес.')}</Text>
        <Text style={s.note}>• {t('Всяка сутрин лимитът се смята наново от останалите пари: похарчиш ли по-малко, утре е по-голям; повече — по-малък.')}</Text>
        <Text style={s.note}>• {t('Наемът, сметките и повтарящите се плащания намаляват лимита, но не се броят за превишение.')}</Text>
        <Text style={s.note}>• {t('Харчиш ли по лимита, в края на месеца остават 20% за спестяване.')}</Text>
      </View>
    </Sheet>
  );
}

const s = themed((c) => ({
  title: { color: c.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  sub: { color: c.muted, fontSize: 14, textAlign: 'center' },
  alert: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderRadius: 14, padding: 12, marginTop: 16, backgroundColor: c.dangerSoft },
  alertText: { flex: 1, color: c.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  section: { color: c.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 8 },
  card: { backgroundColor: c.card, borderRadius: 20, padding: 14, gap: 10, marginTop: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  rowLabel: { flex: 1, color: c.text, fontSize: 15 },
  rowValue: { color: c.text, fontSize: 15, fontVariant: ['tabular-nums'] },
  strong: { fontWeight: '800' },
  sep: { height: 1, backgroundColor: c.faint },
  tomorrow: { color: c.text, fontSize: 15, fontWeight: '700', textAlign: 'center', marginTop: 16 },
  notes: { gap: 6, marginTop: 16 },
  note: { color: c.muted, fontSize: 14, lineHeight: 20 },
}));
