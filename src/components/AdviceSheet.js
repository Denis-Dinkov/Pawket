import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './ui/AppText';
import Sheet from './ui/Sheet';
import IconBadge from './ui/IconBadge';
import Pill from './ui/Pill';
import Pet from '../pet/Pet';
import { colors, money } from '../theme';
import { TONE_COLORS } from '../pet/advice';

export function AdviceCard({ tip }) {
  return (
    <View style={s.card}>
      <IconBadge icon={tip.icon} color={TONE_COLORS[tip.tone]} size={40} />
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{tip.title}</Text>
        <Text style={s.text}>{tip.text}</Text>
        {tip.saving > 1 && (
          <Pill small variant="soft" icon="wallet-outline" label={`до ${money(tip.saving)} спестени`} style={{ marginTop: 10 }} textStyle={{ color: colors.savings }} />
        )}
      </View>
    </View>
  );
}

// "What to improve": all of the dog's advice
export default function AdviceSheet({ visible, onClose, advice, petName, expression, stage }) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={s.head}>
        <Pet expression={expression} stage={stage} size={110} />
        <Text style={s.h1}>Съветите на {petName}</Text>
        <Text style={s.sub}>Какво можеш да подобриш в бюджета си</Text>
      </View>
      <View style={{ gap: 12 }}>
        {advice.map((t) => (
          <AdviceCard key={t.id} tip={t} />
        ))}
        {advice.length === 0 && <Text style={s.sub}>Всичко е наред — нямам забележки! 🐶</Text>}
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  head: { alignItems: 'center', marginBottom: 16 },
  h1: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 4 },
  sub: { color: colors.muted, fontSize: 14, marginTop: 4, textAlign: 'center' },
  card: { flexDirection: 'row', gap: 12, backgroundColor: colors.card, borderRadius: 22, padding: 16 },
  title: { color: colors.text, fontSize: 15, fontWeight: '700' },
  text: { color: colors.muted, fontSize: 13.5, lineHeight: 19, marginTop: 4 },
});
