import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui/AppText';
import Sheet from './ui/Sheet';
import Money from './ui/Money';
import { colors, money, monthLower } from '../theme';
import { themed } from '../themed';
import { t } from '../i18n';

const exact = (n) => money(Math.round(n * 100) / 100);

function Row({ label, value, sign = '−', strong, color, text }) {
  return (
    <View style={s.row}>
      <Text style={[s.rowLabel, strong && s.strong]}>{label}</Text>
      <Text style={[s.rowValue, strong && s.strong, color && { color }]}>
        {text ?? `${sign ? `${sign} ` : ''}${exact(value)}`}
      </Text>
    </View>
  );
}

/**
 * How today's limit is calculated, step by step, with the user's own numbers (see dailyLimit in budget.js).
 * Opened from "Днес остават" on Home.
 */
export default function LimitSheet({ visible, onClose, daily, now }) {
  if (!daily) return null;
  const month = monthLower(now.getMonth());
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const status = daily.eatenSavings > 0
    ? {
        tone: colors.danger,
        bg: colors.dangerSoft,
        icon: 'alert-circle',
        text: daily.overIncome > 0
          ? t('Спестяванията свършиха и харчиш {0} над дохода. Лимитът е 0 до края на месеца.', { 0: exact(daily.overIncome) })
          : t('Изхарчени са {0} от парите за спестяване. Лимитът е 0 до края на месеца: всеки нов разход идва от спестяванията.', { 0: exact(daily.eatenSavings) }),
      }
    : daily.over
      ? {
          tone: colors.warning,
          bg: colors.warningSoft,
          icon: 'trending-down',
          text: daily.tomorrowLimit != null
            ? t('Днес си над лимита с {0}. Разликата се взима от следващите дни: утре лимитът е {1}.', { 0: exact(-daily.left), 1: exact(daily.tomorrowLimit) })
            : t('Днес си над лимита с {0}.', { 0: exact(-daily.left) }),
        }
      : null;

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={s.title}>{t('Дневен лимит')}</Text>
      <Money value={daily.limit} size={36} color={colors.text} style={{ textAlign: 'center', marginTop: 6 }} />
      <Text style={s.sub}>{t('на ден до {0} {1}', { 0: lastDay, 1: month })}</Text>

      {status && (
        <View style={[s.status, { backgroundColor: status.bg }]}>
          <Ionicons name={status.icon} size={18} color={status.tone} />
          <Text style={s.statusText}>{status.text}</Text>
        </View>
      )}

      <Text style={s.section}>{t('Как се смята')}</Text>
      <View style={s.card}>
        <Row label={t('Доход за месеца')} value={daily.income} sign="" strong />
        {daily.spentBefore > 0 && <Row label={t('Похарчени за нужди и желания (без днес)')} value={daily.spentBefore} />}
        {daily.saved > 0 && <Row label={t('Вече спестени')} value={daily.saved} />}
        {daily.pending > 0 && <Row label={t('Предстоящи месечни плащания')} value={daily.pending} />}
        {daily.reserve > 0 && <Row label={t('Остават за спестяване (до 20%)')} value={daily.reserve} color={colors.savings} />}
        <View style={s.sep} />
        <Row label={t('За харчене до края на месеца')} value={Math.max(0, daily.base)} sign="=" strong />
        <Row label={t('Дни, с днешния ({0}–{1} {2})', { 0: now.getDate(), 1: lastDay, 2: month })} text={`÷ ${daily.days}`} />
        <View style={s.sep} />
        <Row label={t('Лимит за днес')} value={daily.limit} sign="=" strong />
        {daily.spentToday > 0 && (
          <>
            <Row label={t('Похарчени днес')} value={daily.spentToday} />
            <Row label={daily.left < 0 ? t('Над лимита') : t('Остават за днес')} value={Math.abs(daily.left)} sign={daily.left < 0 ? '+' : '='} strong color={daily.left < 0 ? colors.danger : colors.savings} />
          </>
        )}
      </View>

      <Text style={s.section}>{t('Добре е да знаеш')}</Text>
      <View style={s.notes}>
        <Text style={s.note}>• {t('Ако харчиш точно по лимита всеки ден, в края на месеца остават 20% от дохода за спестяване.')}</Text>
        <Text style={s.note}>• {t('Лимитът се смята сутрин и не се променя с всеки разход през деня.')}</Text>
        <Text style={s.note}>• {t('Похарчиш ли по-малко днес, утрешният лимит леко расте. Похарчиш ли повече, пада.')}</Text>
        <Text style={s.note}>• {t('Вноска в „Спестявания“ не го променя до 20%: парите просто минават от „пазени“ в „спестени“. Над 20% лимитът пада.')}</Text>
        <Text style={s.note}>• {t('Месечните плащания се вадят предварително, затова денят на наема не е „над лимита“.')}</Text>
      </View>
    </Sheet>
  );
}

const s = themed((c) => ({
  title: { color: c.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  sub: { color: c.muted, fontSize: 14, textAlign: 'center' },
  status: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderRadius: 14, padding: 12, marginTop: 16 },
  statusText: { flex: 1, color: c.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  section: { color: c.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 8 },
  card: { backgroundColor: c.card, borderRadius: 20, padding: 14, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  rowLabel: { flex: 1, color: c.text, fontSize: 14 },
  rowValue: { color: c.text, fontSize: 14, fontVariant: ['tabular-nums'] },
  strong: { fontWeight: '800' },
  sep: { height: 1, backgroundColor: c.faint },
  notes: { gap: 8 },
  note: { color: c.text, fontSize: 14, lineHeight: 20 },
}));
