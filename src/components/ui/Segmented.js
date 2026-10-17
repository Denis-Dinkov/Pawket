import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { colors, radius } from '../../theme';
import Touch from './Touch';

// Pill-style segmented control
export default function Segmented({ options, value, onChange, style }) {
  return (
    <View style={[s.wrap, style]}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Touch haptic="select" key={o.key} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => onChange(o.key)} style={[s.item, active && s.active]}>
            <Text style={[s.text, active && s.activeText]} numberOfLines={1}>{o.label}</Text>
          </Touch>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: colors.faint, borderRadius: radius.pill, padding: 4 },
  item: { flex: 1, paddingVertical: 8, borderRadius: radius.pill, alignItems: 'center' },
  active: {
    backgroundColor: '#fff',
    shadowColor: '#4A2A14', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  text: { fontSize: 13, fontWeight: '600', color: colors.muted },
  activeText: { color: colors.text },
});
