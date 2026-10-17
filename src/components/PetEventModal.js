import React, { useEffect } from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { Text } from './ui/AppText';
import Pet from '../pet/Pet';
import Pill from './ui/Pill';
import { colors, MONTHS, shadow } from '../theme';
import { expressionFor } from '../pet/logic';
import { successFeedback } from '../haptics';

// Monthly report (+XP) and a celebration on reaching a new growth stage
export default function PetEventModal({ event, pet, stage, onClose }) {
  useEffect(() => {
    if (event) successFeedback();
  }, [event]);
  if (!event || !pet) return null;
  const { reports = [], levelUp } = event;
  const best = reports.reduce((m, r) => Math.max(m, r.score ?? 0), 0);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <Pet expression={levelUp ? 'ecstatic' : expressionFor(best)} stage={(levelUp || stage).key} size={140} />
          {levelUp && (
            <>
              <Text style={s.h1}>{pet.name} порасна! 🎉</Text>
              <Text style={s.text}>Вече е „{levelUp.name}“. Благодарение на добрите ти навици.</Text>
            </>
          )}
          {reports.length > 0 && (
            <View style={{ alignSelf: 'stretch', marginTop: 14, gap: 8 }}>
              <Text style={s.h2}>Месечен отчет</Text>
              {reports.map((r) => (
                <View key={r.key} style={s.row}>
                  <Text style={s.month}>
                    {MONTHS[r.month]} {r.year}
                  </Text>
                  <Text style={s.score}>{r.score}/100</Text>
                  <Text style={[s.xp, { color: r.bonus ? colors.savings : colors.muted }]}>+{r.bonus} XP</Text>
                </View>
              ))}
            </View>
          )}
          <Pill label="Супер!" variant="ink" onPress={onClose} style={s.btn} />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,16,24,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, backgroundColor: colors.bg, borderRadius: 32, padding: 24, alignItems: 'center', ...shadow },
  h1: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 6 },
  h2: { color: colors.text, fontSize: 16, fontWeight: '700' },
  text: { color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 12 },
  month: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  score: { color: colors.text, fontSize: 14, fontWeight: '700', marginRight: 12 },
  xp: { fontSize: 14, fontWeight: '800' },
  btn: { alignSelf: 'stretch', justifyContent: 'center', marginTop: 20, paddingVertical: 14 },
});
