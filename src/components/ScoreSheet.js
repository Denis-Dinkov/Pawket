import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui/AppText';
import Sheet from './ui/Sheet';
import ProgressRing from './ui/ProgressRing';
import { colors, MONTHS, money, pct } from '../theme';
import { budgetScoreParts } from '../budget';
import { EXPRESSIONS, expressionFor } from '../pet/logic';
import { themed } from '../themed';
import { t } from '../i18n';

function Row({ ok, title, detail, badge }) {
  return (
    <View style={s.row}>
      <Ionicons name={ok ? 'checkmark-circle' : 'alert-circle'} size={22} color={ok ? colors.savings : colors.wants} />
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        <Text style={s.rowDetail}>{detail}</Text>
      </View>
      <Text style={[s.badge, { color: ok ? colors.savings : colors.danger }]}>{badge}</Text>
    </View>
  );
}

// How the 50/30/20 score was calculated for the selected month
export default function ScoreSheet({ visible, onClose, ov, month, year }) {
  const result = ov && ov.income ? budgetScoreParts({ income: ov.income, byBucket: ov.byBucket, dayFrac: ov.progress.dayFrac }) : null;
  if (!result) return null;
  const p = Object.fromEntries(result.parts.map((x) => [x.key, x]));
  const minus = (x) => (x.penalty >= 0.5 ? `−${Math.round(x.penalty)}` : '✓');
  const color = EXPRESSIONS[expressionFor(result.score)].color;

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={s.head}>
        <ProgressRing value={result.score / 100} size={92} stroke={9} color={color} track={colors.faint}>
          <Text style={s.score}>{result.score}</Text>
        </ProgressRing>
        <Text style={s.title}>
          {t('Оценка 50/30/20 · {0} {1}', { 0: MONTHS[month], 1: year })}
        </Text>
        <Text style={s.text}>
          {t('Започва от 100 и губи точки за всяко отклонение от правилото: 50% от дохода за нужди, 30% за желания и поне 20% спестявания.')}
        </Text>
      </View>
      <View style={s.card}>
        <Row ok={p.needs.penalty < 0.5} title={t('Нужди до 50%')} detail={t('{0} от дохода ({1})', { 0: pct(p.needs.value), 1: money(ov.byBucket.needs) })} badge={minus(p.needs)} />
        <Row
          ok={p.wantsPace.penalty < 0.5}
          title={t('Темпо на желанията')}
          detail={
            ov.progress.isCurrent
              ? t('{0} от бюджета им при изминали {1} от месеца', { 0: pct(p.wantsPace.value), 1: pct(ov.progress.dayFrac) })
              : t('{0} от бюджета им за целия месец', { 0: pct(p.wantsPace.value) })
          }
          badge={minus(p.wantsPace)}
        />
        <Row ok={p.wantsCap.penalty < 0.5} title={t('Желания до 30%')} detail={t('{0} от дохода ({1})', { 0: pct(p.wantsCap.value), 1: money(ov.byBucket.wants) })} badge={minus(p.wantsCap)} />
        <Row ok={p.savings.penalty < 0.5} title={t('Поне 20% за спестяване')} detail={t('Заделени {0} · ако не харчиш повече, можеш да спестиш {1} от дохода', { 0: money(ov.byBucket.savings), 1: pct(p.savings.value) })} badge={minus(p.savings)} />
        {result.overIncome && <Row ok={false} title={t('Разходи над дохода')} detail={t('Докато е така, оценката е най-много 15')} badge="≤15" />}
      </View>
      <Text style={s.foot}>{t('85+ отлично · 65+ добре · 45+ внимавай · под 45 — време за промяна')}</Text>
    </Sheet>
  );
}

const s = themed((colors) => ({
  head: { alignItems: 'center', gap: 8, marginBottom: 14 },
  score: { color: colors.text, fontSize: 26, fontWeight: '800' },
  title: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 4, textAlign: 'center' },
  text: { color: colors.muted, fontSize: 13.5, lineHeight: 19, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 22, padding: 14, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  rowTitle: { color: colors.text, fontSize: 14.5, fontWeight: '700' },
  rowDetail: { color: colors.muted, fontSize: 12.5, marginTop: 2 },
  badge: { fontSize: 14, fontWeight: '800' },
  foot: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 12 },
}));
