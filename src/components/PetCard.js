import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import Pet from '../pet/Pet';
import Bar from './Bar';
import Pill from './ui/Pill';
import { colors, shadow } from '../theme';
import { EXPRESSIONS } from '../pet/logic';
import Touch from './ui/Touch';

// Tapping opens an explanation of the value and how to raise it
function Meter({ icon, label, value, progress, color, onPress }) {
  return (
    <Touch style={s.meter} onPress={onPress}>
      <View style={s.meterHead}>
        <Ionicons name={icon} size={13} color={color} />
        <Text style={s.meterLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {label}
        </Text>
        <Ionicons name="information-circle-outline" size={12} color={colors.muted} style={{ marginLeft: 'auto' }} />
      </View>
      <Text style={s.meterValue} numberOfLines={1}>{value}</Text>
      <Bar value={progress} color={color} height={5} />
    </Touch>
  );
}

/**
 * When it's first (docked), the dog sits on the edge of the white sheet and peeks into the header.
 * The speech bubble shows the advice one at a time (tap → next).
 */
export default function PetCard({ pet, status, bubbles, onFeed, canFeed, bounceKey, onOpenAdvice, onOpenStat, docked = true }) {
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [bubbles.length, bubbles[0]]);
  const expr = EXPRESSIONS[status.expression];
  const bubble = bubbles[i % Math.max(1, bubbles.length)];

  return (
    <View>
      <View style={[s.top, !docked && s.topInline]}>
        <Pet expression={status.expression} stage={status.stage.key} size={docked ? 150 : 124} bounceKey={bounceKey} style={s.pet} />
        <Touch
          style={[s.bubble, !docked && { marginBottom: 20 }]}
          onPress={() => (bubbles.length > 1 ? setI(i + 1) : onOpenAdvice?.())}
        >
          <View style={s.bubbleTail} />
          <Text style={s.bubbleHead}>
            {pet.name} · <Text style={{ color: expr.color }}>{expr.label}</Text>
          </Text>
          <Text style={s.bubbleText} numberOfLines={4}>{bubble}</Text>
          {bubbles.length > 1 && (
            <Text style={s.more}>
              {(i % bubbles.length) + 1}/{bubbles.length} · още ›
            </Text>
          )}
        </Touch>
      </View>

      <View style={s.meters}>
        <Meter
          icon="heart"
          label="Настроение"
          value={status.score == null ? '—' : `${status.mood}%`}
          progress={status.mood / 100}
          color={expr.color}
          onPress={() => onOpenStat?.('mood')}
        />
        <Meter
          icon="restaurant"
          label="Ситост"
          value={`${status.fullness}%`}
          progress={status.fullness / 100}
          color={colors.warning}
          onPress={() => onOpenStat?.('fullness')}
        />
        <Meter
          icon="sparkles"
          label={status.stage.name}
          value={status.next ? `${status.xp}/${status.next.xp}` : `${status.xp} XP`}
          progress={status.progress}
          color={colors.primary}
          onPress={() => onOpenStat?.('growth')}
        />
      </View>

      {canFeed && (
        <Pill icon="restaurant" label={`Днес без разходи? Нахрани ${pet.name}`} variant="soft" onPress={onFeed} style={s.feed} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-end', marginTop: -104 },
  topInline: { marginTop: 0 },
  pet: { marginLeft: -18 },
  bubble: {
    flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 34, marginLeft: -4, ...shadow,
  },
  bubbleTail: {
    position: 'absolute', left: -6, bottom: 22, width: 14, height: 14, backgroundColor: '#fff', transform: [{ rotate: '45deg' }],
  },
  bubbleHead: { color: colors.muted, fontSize: 11.5, fontWeight: '700', marginBottom: 4 },
  bubbleText: { color: colors.text, fontSize: 13.5, fontWeight: '600', lineHeight: 18 },
  more: { color: colors.primary, fontSize: 11.5, fontWeight: '700', marginTop: 6 },
  meters: { flexDirection: 'row', gap: 10, marginTop: -8 },
  meter: { flex: 1, backgroundColor: colors.card, borderRadius: 18, padding: 10, gap: 6 },
  meterHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meterLabel: { flexShrink: 1, color: colors.muted, fontSize: 10.5, fontWeight: '600' },
  meterValue: { color: colors.text, fontSize: 14, fontWeight: '800' },
  feed: { alignSelf: 'stretch', justifyContent: 'center', marginTop: 12 },
});
