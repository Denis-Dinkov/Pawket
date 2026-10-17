import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

// Circular progress 0..1 with content in the center
export default function ProgressRing({ value, size = 64, stroke = 7, color, track = 'rgba(0,0,0,0.08)', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, value || 0));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - p)} strokeLinecap="round"
        />
      </Svg>
      {children}
    </View>
  );
}
