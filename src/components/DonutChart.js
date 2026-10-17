import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './ui/AppText';
import Svg, { Circle, G } from 'react-native-svg';
import { colors, money, moneyShort } from '../theme';

// Donut chart: segments = [{ key, value, color }]
export default function DonutChart({ segments, size = 190, stroke = 22, total, label = 'общо' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const sum = segments.reduce((a, x) => a + x.value, 0) || 1;
  const gap = segments.length > 1 ? 3 : 0;
  let offset = 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Start at the top: rotate the whole Svg instead of G (rotation/origin don't work on web) */}
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <G>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.faint} strokeWidth={stroke} fill="none" />
          {segments.map((seg) => {
            const len = (seg.value / sum) * c;
            const el = (
              <Circle
                key={seg.key}
                cx={size / 2} cy={size / 2} r={r}
                stroke={seg.color} strokeWidth={stroke} fill="none"
                strokeDasharray={`${Math.max(0.01, len - gap)} ${c}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
        </G>
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={s.center}>
          <Text style={s.total} numberOfLines={1} adjustsFontSizeToFit>
            {(total ?? sum) < 1000 ? money(total ?? sum) : moneyShort(total ?? sum)}
          </Text>
          <Text style={s.label}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  total: { color: colors.text, fontSize: 22, fontWeight: '800' },
  label: { color: colors.muted, fontSize: 12 },
});
