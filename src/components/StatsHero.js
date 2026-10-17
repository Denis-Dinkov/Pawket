import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui/AppText';
import Money from './ui/Money';
import Touch from './ui/Touch';
import ProgressRing from './ui/ProgressRing';
import { BUCKETS, MONTHS, money, pct } from '../theme';
import { scoreVerdict } from '../budget';

const WHITE_SOFT = 'rgba(255,255,255,0.82)';

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
      <Money value={total} size={40} color="#fff" />
      <Text style={s.sub}>
        {income
          ? `от ${money(income)} доход · ${left >= 0 ? `остават ${money(left)}` : `над дохода с ${money(-left)}`}`
          : 'Задай месечен доход, за да видиш остатъка.'}
      </Text>
      {income > 0 && (
        <View style={s.track} accessibilityLabel={`Похарчени ${pct(total / income)} от дохода`}>
          <View style={[s.fill, { width: `${Math.min(100, (total / income) * 100)}%` }, left < 0 && s.fillOver]} />
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
        <ProgressRing value={hasData && income ? ov.score / 100 : 0} size={54} stroke={6} color="#fff" track="rgba(255,255,255,0.25)">
          <Text style={s.ringValue}>{hasData && income ? ov.score : '—'}</Text>
        </ProgressRing>
        <View style={{ flex: 1 }}>
          <Text style={s.scoreTitle}>{scoreTitle}</Text>
          <Text style={s.scoreText}>{scoreText}</Text>
        </View>
        {hasData && income > 0 && <Ionicons name="chevron-forward" size={18} color="#fff" />}
      </Touch>
    </View>
  );
}

const s = StyleSheet.create({
  label: { color: WHITE_SOFT, fontSize: 14, fontWeight: '600', marginTop: 18 },
  sub: { color: WHITE_SOFT, fontSize: 13.5, marginTop: 2 },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 12, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: '#fff' },
  fillOver: { backgroundColor: '#FFD1DA' },
  bucketsCaption: { color: WHITE_SOFT, fontSize: 12, fontWeight: '600', marginTop: 16 },
  buckets: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  bucket: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  bucketName: { color: WHITE_SOFT, fontSize: 12, fontWeight: '600' },
  bucketPct: { color: '#fff', fontSize: 17, fontWeight: '800', marginTop: 1 },
  bucketOver: { color: '#FFD1DA' },
  bucketTarget: { color: WHITE_SOFT, fontSize: 11.5 },
  score: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, padding: 12,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)',
  },
  ringValue: { color: '#fff', fontSize: 16, fontWeight: '800' },
  scoreTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  scoreText: { color: WHITE_SOFT, fontSize: 12, lineHeight: 16, marginTop: 2 },
});
