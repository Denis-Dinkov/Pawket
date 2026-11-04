import React, { forwardRef, memo, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { themed } from '../themed';

// Owns the "covered" flag, so showing the strip mid-scroll re-renders only this view, not the screen
const Scrim = memo(
  forwardRef(function Scrim({ height }, ref) {
    const [covered, setCovered] = useState(false);
    useImperativeHandle(ref, () => ({ setCovered }), []);
    // Only when needed: over the header gradient a solid strip would show as a separate band.
    // No animation — even translucent for a moment, it still darkens the clock.
    return covered ? <View pointerEvents="none" style={[s.scrim, { height }]} /> : null;
  })
);

// When the white sheet reaches the clock, a strip in the header color appears under the status bar.
// Otherwise content scrolls under the clock, and iOS darkens the clock and keeps it dark even over the header.
// lead: how far white elements stick out above the sheet (the dog and the bubble on Home)
export default function useStatusScrim(lead = 0) {
  const insets = useSafeAreaInsets();
  const sheetTop = useRef(Infinity);
  const covered = useRef(false);
  const scrim = useRef(null);

  const onScroll = useCallback(
    (e) => {
      // Margin so nothing white passes under the clock when scrolling fast
      const next = e.nativeEvent.contentOffset.y > sheetTop.current - lead - insets.top - 60;
      if (next === covered.current) return;
      covered.current = next;
      scrim.current?.setCovered(next);
    },
    [lead, insets.top]
  );

  const onSheetLayout = useCallback((e) => {
    sheetTop.current = e.nativeEvent.layout.y;
  }, []);

  const overlay = useMemo(() => <Scrim ref={scrim} height={insets.top} />, [insets.top]);

  return { onScroll, onSheetLayout, overlay };
}

const s = themed((colors) => ({
  scrim: {
    // The light room color of the headers, so the clock stays readable over it
    position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.roomFrom,
    shadowColor: '#4A2A14', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
}));
