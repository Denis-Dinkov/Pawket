import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui/AppText';
import Money from './ui/Money';
import Touch from './ui/Touch';
import Pill from './ui/Pill';
import ProgressRing from './ui/ProgressRing';
import { colors, BUCKETS, MONTHS, pct } from '../theme';
import { scoreVerdict } from '../budget';
import { themed } from '../themed';


// Top of Reports: the month's total, the change from last month, the score and the 50/30/20 shares.
// "What's left" lives on Home only, so the two screens never show two different "left" numbers.
export default function StatsHero({ ov, month, vsPrev, onOpenScore, onOpenSettings }) {
  const { income, total, byBucket, list, progress } = ov;
  const hasData = list.length > 0;
  const scored = hasData && income > 0;
  const monthName = MONTHS[month].toLowerCase();
  const prevName = MONTHS[(month + 11) % 12].toLowerCase();

  return (
    <View>
      <View style={s.top}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>
            {/* The total includes the money put into savings, so it isn't called just "spent" then */}
            {byBucket.savings > 0 ? 'Похарчено и заделено' : 'Похарчено'} през {monthName}
            {progress.isCurrent ? ' досега' : ''}
          </Text>
          <Money value={total} size={40} color={colors.text} />
          {vsPrev != null && Math.abs(vsPrev) >= 0.01 && (
            <View style={s.delta}>
              <Ionicons name={vsPrev > 0 ? 'trending-up' : 'trending-down'} size={14} color={vsPrev > 0 ? colors.danger : colors.savings} />
              <Text style={[s.deltaText, { color: vsPrev > 0 ? colors.danger : colors.savings }]}>
                {vsPrev > 0 ? '+' : '−'}
                {pct(Math.abs(vsPrev))} спрямо {prevName}
                {progress.isCurrent ? ' до момента' : ''}
              </Text>
            </View>
          )}
        </View>
        <Touch
          style={s.score}
          onPress={scored ? onOpenScore : undefined}
          disabled={!scored}
          accessibilityRole="button"
          accessibilityLabel={scored ? `Оценка ${ov.score} от 100, ${scoreVerdict(ov.score)}` : 'Оценка: още няма'}
          accessibilityHint={scored ? 'Показва разбивката на оценката' : undefined}
        >
          <ProgressRing value={scored ? ov.score / 100 : 0} size={58} stroke={6} color={colors.primary} track={colors.faint}>
            <Text style={s.ringValue}>{scored ? ov.score : '—'}</Text>
          </ProgressRing>
          <View style={s.scoreLabel}>
            <Text style={s.scoreText}>Оценка</Text>
            {scored && <Ionicons name="chevron-forward" size={12} color={colors.muted} />}
          </View>
        </Touch>
      </View>

      {income > 0 ? (
        // The three parts of the rule: the share of income in each, against its target
        <View style={s.buckets}>
          {Object.entries(BUCKETS).map(([key, b]) => {
            const share = byBucket[key] / income;
            const over = key !== 'savings' && share > b.target;
            return (
              <View key={key} style={s.bucket} accessible accessibilityLabel={`${b.label}: ${pct(share)} от дохода, цел ${pct(b.target)}`}>
                <View style={s.bucketHead}>
                  <View style={[s.dot, { backgroundColor: b.color }]} />
                  <Text style={s.bucketName} numberOfLines={1}>{b.label}</Text>
                </View>
                <Text style={[s.bucketPct, over && s.bucketOver]}>
                  {pct(share)}
                  <Text style={s.bucketTarget}> / {pct(b.target)}</Text>
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Pill icon="settings-outline" label="Задай месечния си доход" variant="white" onPress={onOpenSettings} style={{ alignSelf: 'flex-start', marginTop: 14 }} />
      )}
    </View>
  );
}

const s = themed((c) => ({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  label: { color: c.muted, fontSize: 14, fontWeight: '600' },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  deltaText: { fontSize: 13, fontWeight: '700' },
  scoreLabel: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
  buckets: { flexDirection: 'row', gap: 8, marginTop: 16 },
  bucket: { flex: 1, backgroundColor: c.card, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  bucketHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  bucketName: { color: c.muted, fontSize: 12, fontWeight: '600' },
  bucketPct: { color: c.text, fontSize: 17, fontWeight: '800' },
  bucketOver: { color: c.danger },
  bucketTarget: { color: c.muted, fontSize: 12, fontWeight: '600' },
  score: { alignItems: 'center', backgroundColor: c.card, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 10 },
  ringValue: { color: c.text, fontSize: 16, fontWeight: '800' },
  scoreText: { color: c.muted, fontSize: 12, fontWeight: '600' },
}));
