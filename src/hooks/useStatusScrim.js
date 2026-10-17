import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

// When the white sheet reaches the clock, a strip in the header color appears under the status bar.
// Otherwise content scrolls under the clock, and iOS darkens the clock and keeps it dark even over the header.
// lead: how far white elements stick out above the sheet (the dog and the bubble on Home)
export default function useStatusScrim(lead = 0) {
  const insets = useSafeAreaInsets();
  const [sheetTop, setSheetTop] = useState(Infinity);
  const [covered, setCovered] = useState(false);

  const onScroll = useCallback(
    (e) => {
      // Margin so nothing white passes under the clock when scrolling fast
      const next = e.nativeEvent.contentOffset.y > sheetTop - lead - insets.top - 60;
      setCovered((c) => (c === next ? c : next));
    },
    [sheetTop, lead, insets.top]
  );

  const onSheetLayout = useCallback((e) => setSheetTop(e.nativeEvent.layout.y), []);

  // Only when needed: over the header gradient a solid strip would show as a separate band.
  // No animation — even translucent for a moment, it still darkens the clock.
  const overlay = covered ? <View pointerEvents="none" style={[s.scrim, { height: insets.top }]} /> : null;

  return { onScroll, onSheetLayout, overlay };
}

const s = StyleSheet.create({
  scrim: {
    position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.heroDeep,
    shadowColor: colors.heroDeep, shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
});
