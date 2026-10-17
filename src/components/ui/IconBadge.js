import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tint } from '../../theme';

// Icon in a tinted circle
export default function IconBadge({ icon, color, size = 40, solid = false, style }) {
  return (
    <View
      style={[
        {
          width: size, height: size, borderRadius: size / 2,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: solid ? color : tint(color, 0.13),
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={size * 0.48} color={solid ? '#fff' : color} />
    </View>
  );
}
