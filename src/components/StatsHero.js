import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui/AppText';
import Money from './ui/Money';
import Touch from './ui/Touch';
import ProgressRing from './ui/ProgressRing';
import { colors, BUCKETS, MONTHS, money, moneyShort, pct } from '../theme';
import Bar from './Bar';
import { scoreVerdict } from '../budget';
import { themed } from '../themed';


// Top of Statistics: how much was spent, out of what income, and the 50/30/20 score with an explanation
export default function StatsHero({ ov, month, onOpenScore }) {
  const { income, total, byBucket, list, progress } = ov;
  const hasData = list.length > 0;
  const left = income - total;
  const monthName = MONTHS[month].toLowerCase();

  let scoreTitle;
  let scoreText;
  if (!income) {
    scoreTitle = 'Няма оценка';
    scoreText = 'Задай месечен доход от ⚙︎ в Начало, за да се смята 50/30/20.';
  } else if (!hasData) {
    scoreTitle = 'Оценка 50/30/20: още няма';
    scoreText = 'Ще се появи след първия разход за месеца.';
  } else {
    scoreTitle = `Оценка 50/30/20 · ${scoreVerdict(ov.score)}`;
    scoreText = `${ov.score} от 100 точки за спазване на 50% нужди, 30% желания и 20% спестявания. Натисни за разбивка.`;
  }

  return (
    <View>
      <Text style={s.label}>
        Похарчено през {monthName}
        {progress.isCurrent ? ' досега' : ''}
      </Text>
      <Money value={total} size={40} color={colors.text} />
      <Text style={s.sub}>
        {income
          ? `от ${moneyShort(income)} доход · ${left >= 0 ? `остават ${moneyShort(left)}` : `над дохода с ${moneyShort(-left)}`}`
          : 'Задай месечен доход, за да видиш остатъка.'}
      </Text>
      {income > 0 && (
        <View style={{ marginTop: 12 }}>
          <Bar value={total / income} color={left < 0 ? colors.danger : colors.primary} track={colors.card} label={`Похарчени ${pct(total / income)} от дохода`} />
        </View>
      )}

      {/* The three parts of the rule: what % of income went to each */}
      {income > 0 && <Text style={s.bucketsCaption}>Дял от дохода по части</Text>}
      {income > 0 && (
        <View style={s.buckets}>
          {Object.entries(BUCKETS).map(([key, b]) => {
            const share = byBucket[key] / income;
            const over = key !== 'savings' && share > b.target;
            return (
              <View key={key} style={s.bucket}>
                <View style={[s.dot, { backgroundColor: b.color }]} />
                <View style={{ flexShrink: 1 }}>
                  <Text style={s.bucketName}>{b.label}</Text>
                  <Text style={[s.bucketPct, over && s.bucketOver]}>{pct(share)}</Text>
                  <Text style={s.bucketTarget}>{key === 'savings' ? 'заделени · цел ' : 'цел до '}{pct(b.target)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Touch
        style={s.score}
        onPress={hasData && income ? onOpenScore : undefined}
        accessibilityRole="button"
        accessibilityLabel={`${scoreTitle}. ${scoreText}`}
      >
        <ProgressRing value={hasData && income ? ov.score / 100 : 0} size={54} stroke={6} color={colors.primary} track={colors.faint}>
          <Text style={s.ringValue}>{hasData && income ? ov.score : '—'}</Text>
        </ProgressRing>
        <View style={{ flex: 1 }}>
          <Text style={s.scoreTitle}>{scoreTitle}</Text>
          <Text style={s.scoreText}>{scoreText}</Text>
        </View>
        {hasData && income > 0 && <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
      </Touch>
    </View>
  );
}

const s = themed((c) => ({
  label: { color: c.muted, fontSize: 14, fontWeight: '600', marginTop: 18 },
  sub: { color: c.muted, fontSize: 13.5, marginTop: 2 },
  bucketsCaption: { color: c.muted, fontSize: 12, fontWeight: '600', marginTop: 16 },
  buckets: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  bucket: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  bucketName: { color: c.muted, fontSize: 12, fontWeight: '600' },
  bucketPct: { color: c.text, fontSize: 17, fontWeight: '800', marginTop: 1 },
  bucketOver: { color: c.danger },
  bucketTarget: { color: c.muted, fontSize: 11.5 },
  score: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, padding: 12,
    borderRadius: 20, backgroundColor: c.card,
  },
  ringValue: { color: c.text, fontSize: 16, fontWeight: '800' },
  scoreTitle: { color: c.text, fontSize: 14, fontWeight: '700' },
  scoreText: { color: c.muted, fontSize: 12, lineHeight: 16, marginTop: 2 },
}));
