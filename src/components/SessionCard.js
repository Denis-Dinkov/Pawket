import React, { useMemo } from 'react';
import { View, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui/AppText';
import Card from './ui/Card';
import Pill from './ui/Pill';
import Touch from './ui/Touch';
import Bar from './Bar';
import { useStore } from '../store';
import { colors, radius } from '../theme';
import { sessionState, spentToday, SESSION_XP, NOSPEND_XP_BEFORE } from '../sessions';
import { tapFeedback } from '../haptics';
import { themed } from '../themed';
import { t } from '../i18n';

/**
 * Home: start a no-spend day and follow it until midnight. Charlie shows the same countdown in the
 * Dynamic Island. The button appears only on a day with nothing spent yet.
 */
export default function SessionCard({ now, canStart = true }) {
  const { session, expenses, startNoSpendDay, endSession } = useStore();
  const state = useMemo(() => sessionState(session, expenses, now), [session, expenses, now]);

  if (session && state && !state.finished) {
    const stop = () =>
      Alert.alert(t('Да спра ли деня без разходи?'), t('Ще загубиш наградата за днес.'), [
        { text: t('Продължавам'), style: 'cancel' },
        { text: t('Спри'), style: 'destructive', onPress: endSession },
      ]);
    return (
      <Card style={{ gap: 10 }}>
        <View style={s.head}>
          <View style={[s.icon, { backgroundColor: colors.savingsSoft }]}>
            <Ionicons name="leaf" size={18} color={colors.savings} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{t('Ден без разходи')}</Text>
            <Text style={s.sub}>
              {new Date(session.startedAt).getHours() < NOSPEND_XP_BEFORE
                ? t('до полунощ · +{0} XP, ако издържиш', { 0: SESSION_XP.nospend })
                : t('до полунощ')}
            </Text>
          </View>
          <Pill icon="close" label={t('Спри')} variant="outline" small onPress={stop} />
        </View>
        <Bar value={state.ratio} color={colors.savings} height={6} label={t('Мина {0}% от деня', { 0: Math.round(state.ratio * 100) })} />
      </Card>
    );
  }

  if (!canStart || spentToday(expenses, now) > 0) return null;
  // XP only for a day started in the morning (see finishSession in store.js)
  const earnsXp = now.getHours() < NOSPEND_XP_BEFORE;
  return (
    <Touch
      style={s.start}
      onPress={() => {
        tapFeedback();
        startNoSpendDay();
      }}
      accessibilityHint={t('Предизвикателство: без харчене до полунощ')}
    >
      <Ionicons name="leaf-outline" size={18} color={colors.savings} />
      <Text style={s.startText} numberOfLines={1}>{t('Предизвикателство: ден без разходи')}</Text>
      {earnsXp && <Text style={s.startXp}>+{SESSION_XP.nospend} XP</Text>}
    </Touch>
  );
}

const s = themed((c) => ({
  start: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44,
    backgroundColor: c.card, borderRadius: radius.pill, paddingHorizontal: 14, borderWidth: 1, borderColor: c.faint,
  },
  startXp: { color: c.savings, fontSize: 13, fontWeight: '800' },
  startText: { color: c.text, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 36, height: 36, borderRadius: radius.field, alignItems: 'center', justifyContent: 'center' },
  name: { color: c.text, fontSize: 15, fontWeight: '800' },
  sub: { color: c.muted, fontSize: 13 },
}));
