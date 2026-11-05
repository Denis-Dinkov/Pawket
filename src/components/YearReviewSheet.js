import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from './ui/AppText';
import Sheet from './ui/Sheet';
import IconBadge from './ui/IconBadge';
import Money from './ui/Money';
import Pet from '../pet/Pet';
import { colors, money, MONTHS, BUCKETS, radius } from '../theme';
import { yearReview } from '../yearReview';
import { plural } from '../format';
import { themed } from '../themed';
import { outfitOf } from '../pet/outfit';

function Fact({ icon, color, label, value, sub }) {
  return (
    <View style={s.fact} accessible accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ''}`}>
      <IconBadge icon={icon} color={color} size={40} />
      <View style={{ flex: 1 }}>
        <Text style={s.factLabel}>{label}</Text>
        <Text style={s.factValue} numberOfLines={2}>{value}</Text>
        {!!sub && <Text style={s.factSub}>{sub}</Text>}
      </View>
    </View>
  );
}

// "Your year with Charlie": the year's numbers in one card
export default function YearReviewSheet({ visible, onClose, year, data, pet, stage }) {
  const r = useMemo(() => (visible ? yearReview({ ...data, year }) : null), [visible, data, year]);
  if (!r) return <Sheet visible={false} onClose={onClose} />;
  const maxMonth = Math.max(1, ...r.months.map((m) => m.total));
  return (
    <Sheet visible={visible} onClose={onClose} maxHeight={0.94}>
      <View style={s.hero}>
        <Pet expression="ecstatic" stage={stage} {...outfitOf(pet)} size={110} />
        <Text style={s.title} accessibilityRole="header">Твоята {year} с {pet?.name}</Text>
        <Text style={s.sub}>{plural(r.count, 'запис', 'записа')} за годината</Text>
      </View>

      {r.count === 0 ? (
        <Text style={s.sub}>Още няма разходи за {year}.</Text>
      ) : (
        <>
          <View style={s.totals}>
            <View style={s.total}>
              <Text style={s.factLabel}>Похарчено</Text>
              <Money value={r.total - r.saved} size={24} />
            </View>
            <View style={s.total}>
              <Text style={s.factLabel}>Спестено</Text>
              <Money value={r.saved} size={24} color={colors.savings} />
            </View>
          </View>

          {/* Spending per month: the best month is marked with a star */}
          <View style={s.chart} accessible accessibilityLabel={`Разходи по месеци: ${r.months.map((m) => `${MONTHS[m.month]} ${money(m.total)}`).join(', ')}`}>
            {r.months.map((m) => (
              <View key={m.month} style={s.col}>
                <View style={s.track}>
                  <View
                    style={[
                      s.bar,
                      { height: `${Math.max(3, (m.total / maxMonth) * 100)}%`, backgroundColor: r.best?.month === m.month ? colors.savings : colors.primary },
                    ]}
                  />
                </View>
                <Text style={s.colLabel}>{MONTHS[m.month].slice(0, 1)}</Text>
              </View>
            ))}
          </View>

          <View style={s.facts}>
            {r.best && (
              <Fact icon="star" color={colors.savings} label="Най-добър месец" value={MONTHS[r.best.month]} sub={`оценка ${r.best.score}/100`} />
            )}
            {r.avgScore != null && <Fact icon="ribbon" color={colors.primary} label="Средна оценка" value={`${r.avgScore}/100`} />}
            {r.topCategory && (
              <Fact
                icon={r.topCategory.icon}
                color={BUCKETS[r.topCategory.bucket].color}
                label="Най-много пари отидоха за"
                value={r.topCategory.name}
                sub={money(r.topCategory.value)}
              />
            )}
            {r.topMerchant && (
              <Fact icon="storefront" color={colors.wants} label="Най-често пазаруваш в" value={r.topMerchant.name} sub={`${plural(r.topMerchant.count, 'път', 'пъти')} · ${money(r.topMerchant.value)}`} />
            )}
            {r.priciest && <Fact icon="trending-up" color={colors.danger} label="Най-скъп месец" value={MONTHS[r.priciest.month]} sub={money(r.priciest.total)} />}
            {pet?.bestStreak > 0 && <Fact icon="flame" color={colors.orange} label="Най-дълга серия" value={plural(pet.bestStreak, 'ден', 'дни')} />}
          </View>
        </>
      )}
    </Sheet>
  );
}

const s = themed((c) => ({
  hero: { alignItems: 'center', gap: 4, marginBottom: 12 },
  title: { color: c.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  sub: { color: c.muted, fontSize: 14, textAlign: 'center' },
  totals: { flexDirection: 'row', gap: 10 },
  total: { flex: 1, backgroundColor: c.card, borderRadius: radius.badge, padding: 14, gap: 2 },
  chart: { flexDirection: 'row', height: 110, gap: 4, backgroundColor: c.card, borderRadius: radius.badge, padding: 12, marginTop: 10 },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  track: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4 },
  colLabel: { color: c.muted, fontSize: 11 },
  facts: { backgroundColor: c.card, borderRadius: radius.badge, paddingHorizontal: 14, marginTop: 10 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderColor: c.faint },
  factLabel: { color: c.muted, fontSize: 12.5, fontWeight: '600' },
  factValue: { color: c.text, fontSize: 16, fontWeight: '800' },
  factSub: { color: c.muted, fontSize: 12.5 },
}));
