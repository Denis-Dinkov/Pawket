import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import Sheet from './ui/Sheet';
import IconBadge from './ui/IconBadge';
import Touch from './ui/Touch';
import { colors, radius } from '../theme';
import { HOME_SECTIONS, DEFAULT_LAYOUT, moveSection, toggleSection } from '../homeLayout';

const byKey = Object.fromEntries(HOME_SECTIONS.map((x) => [x.key, x]));

// Reorder and hide the Home sections; changes show up immediately
export default function LayoutSheet({ visible, onClose, layout, onChange }) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={s.title}>Подреди началото</Text>
      <Text style={s.sub}>Стрелките местят секцията нагоре и надолу, окото я скрива или показва.</Text>
      <View style={s.card}>
        {layout.order.map((key, i) => {
          const sec = byKey[key];
          const hidden = layout.hidden.includes(key);
          return (
            <View key={key} style={[s.row, i > 0 && s.sep]}>
              <IconBadge icon={sec.icon} color={hidden ? colors.muted : colors.primary} size={38} />
              <Text style={[s.name, hidden && { color: colors.muted }]}>{sec.name}</Text>
              <Touch haptic="select" hitSlop={6} onPress={() => onChange(toggleSection(layout, key))} style={s.btn}>
                <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={20} color={hidden ? colors.muted : colors.text} />
              </Touch>
              <Touch haptic="select" hitSlop={6} disabled={i === 0} onPress={() => onChange(moveSection(layout, key, -1))} style={[s.btn, i === 0 && s.off]}>
                <Ionicons name="chevron-up" size={20} color={colors.text} />
              </Touch>
              <Touch
                haptic="select"
                hitSlop={6}
                disabled={i === layout.order.length - 1}
                onPress={() => onChange(moveSection(layout, key, 1))}
                style={[s.btn, i === layout.order.length - 1 && s.off]}
              >
                <Ionicons name="chevron-down" size={20} color={colors.text} />
              </Touch>
            </View>
          );
        })}
      </View>
      <Touch onPress={() => onChange(DEFAULT_LAYOUT)} style={s.reset}>
        <Text style={s.resetText}>Възстанови по подразбиране</Text>
      </Touch>
    </Sheet>
  );
}

const s = StyleSheet.create({
  title: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  sub: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 14 },
  card: { backgroundColor: colors.card, borderRadius: 22, paddingHorizontal: 12, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.faint },
  name: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
  btn: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.25 },
  reset: { alignSelf: 'center', marginTop: 14, padding: 8 },
  resetText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
