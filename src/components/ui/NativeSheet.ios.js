import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet, Group, Host, RNHostView } from '@expo/ui/swift-ui';
import {
  presentationBackground,
  presentationDragIndicator,
  preferredColorScheme,
} from '@expo/ui/swift-ui/modifiers';
import { colors, currentColorScheme } from '../../theme';
import { useSheetEntry } from './sheetHost';

/**
 * The system's own sheet (SwiftUI .sheet), sized to its content. iOS slides it in and out, dims the screen,
 * follows the finger and closes on a swipe down or a tap outside, all natively and at the display's full
 * refresh rate, like the pages opened with "+". Same props as the drawn sheet in Sheet.js.
 * The last content stays while it slides away, so a sheet whose content clears on close (selected = null)
 * doesn't collapse mid-way.
 */
export default function NativeSheet({ visible, onClose, children, footer, scroll = true, maxHeight = 0.88 }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // A page opened from this sheet (Add from "Edit") is presented on top of it, so the sheet stays until it's gone
  const { hosted, enter, leave } = useSheetEntry();
  const presented = visible || !!hosted;
  // Content stays mounted from the opening until iOS reports the sheet gone
  const [mounted, setMounted] = useState(presented);
  if (presented && !mounted) setMounted(true);
  useEffect(() => {
    if (presented) enter();
  }, [presented, enter]);

  const last = useRef({ children, footer });
  if (visible) last.current = { children, footer };
  const content = visible ? { children, footer } : last.current;

  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  if (!mounted) return null;
  return (
    <Host style={{ position: 'absolute', width }} pointerEvents="none">
      <BottomSheet
        isPresented={presented}
        // A swipe down or a tap outside: the parent decides (it clears its state)
        onIsPresentedChange={(open) => !open && closeRef.current?.()}
        onDismiss={() => {
          leave();
          setMounted(false);
        }}
        fitToContents
      >
        <Group
          modifiers={[
            presentationDragIndicator('visible'),
            presentationBackground(colors.bg),
            preferredColorScheme(currentColorScheme()),
          ]}
        >
          <RNHostView matchContents={{ vertical: true }}>
            {/* Tall content scrolls inside; the footer stays below it */}
            <View style={{ maxHeight: Math.min(height * maxHeight, height - insets.top - 12), paddingTop: 14 }}>
              {scroll ? (
                <ScrollView
                  style={{ flexGrow: 0, flexShrink: 1 }}
                  contentContainerStyle={{ padding: 20, paddingTop: 10 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="interactive"
                >
                  {content.children}
                </ScrollView>
              ) : (
                <View style={{ padding: 20, paddingTop: 10 }}>{content.children}</View>
              )}
              {content.footer && <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 }}>{content.footer}</View>}
              {hosted}
            </View>
          </RNHostView>
        </Group>
      </BottomSheet>
    </Host>
  );
}
