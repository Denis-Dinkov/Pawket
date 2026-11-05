import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, useWindowDimensions } from 'react-native';
import { feedback } from '../haptics';
import { motionReduced, DURATION, EASE } from '../motion';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui/AppText';
import Touch from './ui/Touch';
import Pet from '../pet/Pet';
import RoomScene from './RoomScene';
import { colors, radius, shadow } from '../theme';
import { EXPRESSIONS, HUNGRY_AT } from '../pet/logic';
import { themed } from '../themed';
import { plural } from '../format';
import { outfitOf } from '../pet/outfit';

const isNight = (now) => now.getHours() >= 20 || now.getHours() < 6;

// Mood / fullness / level: each says its state in words, not just in color
function Chip({ icon, label, color, onPress, a11y, hint = 'Обяснява стойността и как да я вдигнеш' }) {
  return (
    <Touch haptic="select" style={s.chip} onPress={onPress} accessibilityLabel={a11y} accessibilityHint={hint}>
      {icon}
      {label != null && (
        <Text style={[s.chipText, color && { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {label}
        </Text>
      )}
    </Touch>
  );
}

// Hearts that float up from the dog when he's petted
function Hearts({ id }) {
  const t = useRef(new Animated.Value(0)).current;
  // Plays once per pat: a hidden tab coming back re-runs effects, which mustn't replay it
  const played = useRef(null);
  useEffect(() => {
    if (played.current === id) return;
    played.current = id;
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: DURATION.burst, easing: EASE, useNativeDriver: true }).start();
  }, [id, t]);
  return [-26, 0, 24].map((x, i) => (
    <Animated.Text
      key={i}
      style={{
        position: 'absolute', bottom: 150, left: '50%', marginLeft: x + 14, fontSize: 18 - Math.abs(x) / 8,
        opacity: t.interpolate({ inputRange: [0, 0.15 + i * 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] }),
        transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -60 - i * 12] }) }],
      }}
    >
      💗
    </Animated.Text>
  ));
}

/**
 * Mood / fullness / level in one row. It sits below the room (on the money card),
 * so the chips never cover the dog.
 */
export function PetChips({ status, onStat, style, compact = false, streak, onStreak }) {
  const expr = EXPRESSIONS[status.expression];
  const hungry = status.fullness < HUNGRY_AT;
  return (
    <View style={[s.chips, style]}>
      {/* Compact (in the room on Home): no mood chip — his face shows it, and a hat needs the space */}
      {!compact && (
      <Chip
        icon={<Text style={s.emoji}>{expr.emoji}</Text>}
        label={expr.label}
        onPress={() => onStat('mood')}
        a11y={`Настроение: ${expr.label}${status.score != null ? `, ${status.mood} от 100` : ''}`}
      />
      )}
      <Chip
        icon={<Text style={s.emoji}>🦴</Text>}
        label={`${status.fullness}%`}
        color={hungry ? colors.danger : status.fullness < 60 ? colors.warning : null}
        onPress={() => onStat('fullness')}
        a11y={`Ситост ${status.fullness} процента${hungry ? ', гладен' : ''}`}
      />
      {/* Compact (in the room on Home): the stage lives on Charlie's tab, the streak takes its place */}
      {compact ? (
        streak > 0 ? (
          <Chip
            icon={<Ionicons name="flame" size={13} color={colors.orange} />}
            label={String(streak)}
            onPress={onStreak}
            a11y={`Серия ${plural(streak, 'ден', 'дни')}`}
            hint="Отваря мисиите"
          />
        ) : null
      ) : (
      <Chip
        icon={<Ionicons name="star" size={13} color={colors.warning} />}
        label={status.stage.name}
        onPress={() => onStat('growth')}
        a11y={`Етап ${status.stage.name}, ${Math.round(status.progress * 100)} процента до следващото`}
      />
      )}
    </View>
  );
}

/**
 * Charlie's room at the top of Home: the dog, a speech bubble with the most important advice
 * and a tap-to-pet dog. The room itself shows the state too: an empty bowl when hungry, a dark window at night.
 * top: the content of the top bar (month pill, settings); badges: small chips under it on the right;
 * height: the room height without the safe area.
 */
export default function PetRoom({ pet, status, bubble, bubbleAction, onBubble, onStat, bounceKey, top, badges, insetTop, height = 268, now = new Date() }) {
  const expr = EXPRESSIONS[status.expression];
  const hungry = status.fullness < HUNGRY_AT;
  const night = isNight(now);
  // Petting: a tap makes him hop and sends up hearts
  const [pats, setPats] = useState(0);
  const { width } = useWindowDimensions();
  const pet_ = () => {
    feedback('light');
    setPats((n) => n + 1);
  };
  return (
    <LinearGradient colors={[colors.roomFrom, colors.roomTo]} style={{ height: height + insetTop, paddingTop: insetTop }}>
      {/* The room shows the state too: a dark sky at night, an empty bowl when he's hungry */}
      <RoomScene width={width} height={height + insetTop} top={insetTop} night={night} hungry={hungry} petName={pet.name} stage={status.stage.key} />

      <View style={s.top}>{top}</View>
      {badges ? <View style={[s.badges, { top: insetTop + 52 }]}>{badges}</View> : null}

      <Touch style={s.bubble} onPress={onBubble} accessibilityLabel={`${pet.name} казва: ${bubble}`} accessibilityHint="Отваря всички съвети">
        <Text style={s.bubbleText} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.8}>{bubble}</Text>
        {bubbleAction ? (
          <Touch haptic="success" style={s.bubbleBtn} onPress={bubbleAction.onPress}>
            <Text style={s.bubbleBtnText}>{bubbleAction.label}</Text>
          </Touch>
        ) : (
          <Text style={s.more}>Съвети ›</Text>
        )}
        <View style={s.tail} />
      </Touch>

      <Touch haptic={false} pressScale={1} onPress={pet_} style={s.pet} accessibilityLabel={`${pet.name}, ${status.stage.name.toLowerCase()}, ${expr.label.toLowerCase()}`} accessibilityHint="Погали го">
        <Pet expression={status.expression} stage={status.stage.key} {...outfitOf(pet)} size={150} bounceKey={`${bounceKey}-${pats}`} />
      </Touch>
      {pats > 0 && !motionReduced() && <Hearts id={pats} />}

    </LinearGradient>
  );
}

const s = themed((c) => ({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, zIndex: 3 },
  badges: { position: 'absolute', right: 16, top: 0, zIndex: 3 },
  // A bit right of center, so the speech bubble has room on the left
  pet: { position: 'absolute', bottom: 30, left: '50%', marginLeft: -52 },
  bubble: {
    position: 'absolute', left: 14, bottom: 112, maxWidth: 160, zIndex: 2,
    backgroundColor: c.card, borderRadius: 18, borderBottomLeftRadius: 6, paddingHorizontal: 12, paddingVertical: 9, gap: 4, ...shadow,
  },
  bubbleText: { color: c.text, fontSize: 13.5, fontWeight: '600', lineHeight: 18 },
  more: { color: c.primary, fontSize: 12, fontWeight: '700' },
  bubbleBtn: { alignSelf: 'flex-start', backgroundColor: c.primary, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, marginTop: 2 },
  bubbleBtnText: { color: c.onAccent, fontSize: 12.5, fontWeight: '700' },
  tail: { position: 'absolute', left: 10, bottom: -6, width: 12, height: 12, backgroundColor: c.card, transform: [{ rotate: '45deg' }] },
  chips: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.card, borderRadius: radius.pill,
    paddingHorizontal: 10, minHeight: 34, flexShrink: 1, borderWidth: 1, borderColor: c.faint, justifyContent: 'center',
  },
  chipText: { color: c.text, fontSize: 12, fontWeight: '700', flexShrink: 1 },
  emoji: { fontSize: 13 },
  meter: { width: 28, height: 5, borderRadius: 3, backgroundColor: c.faint, overflow: 'hidden' },
  meterFill: { height: 5, borderRadius: 3 },
}));
