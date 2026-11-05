import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Pressable, Animated, StyleSheet, Dimensions, PanResponder, Platform, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../../theme';
import useKeyboardHeight from '../../hooks/useKeyboardHeight';
import { themed } from '../../themed';
import { DURATION, EASE_IN, SPRING, motionReduced } from '../../motion';
import { t } from '../../i18n';

// Dragged further than this (or flicked down faster than CLOSE_VELOCITY) closes the sheet
const CLOSE_DISTANCE = 110;
const CLOSE_VELOCITY = 0.9;
// The bounce resists the finger (about half its travel), so pulling the content needs less offset
const PULL_CLOSE = 60;
const ANDROID = Platform.OS === 'android';
// Handing over to another sheet (e.g. "Edit" opening the Add page): the closing one leaves quicker and
// speeding up, without easing to a stop. Easing out to a standstill, then a pause while iOS swaps
// the windows, then the next sheet starting read as a stop-and-go stutter.
const HANDOFF_EXIT = 200;
const HANDOFF_EASE = Easing.in(Easing.quad);

// iOS won't present a new modal (e.g. "Edit" opening the Add page) while another one is still leaving,
// and a fixed delay is either too short (a stutter) or too long (a pause). So the sheets count themselves,
// and afterSheetsClose(fn) runs fn the moment the last one is really gone.
let openSheets = 0;
let waiting = [];
const flush = () => {
  if (openSheets > 0) return;
  const run = waiting;
  waiting = [];
  run.forEach((fn) => fn());
};
export function afterSheetsClose(fn) {
  waiting.push(fn);
  if (openSheets === 0) requestAnimationFrame(flush);
}

/**
 * Bottom sheet with a translucent backdrop; footer stays pinned at the bottom (and above the keyboard).
 * It slides up on open and back down on close: the Modal stays mounted until the exit has played,
 * with the last content kept, so a sheet whose content clears on close (e.g. selected = null) doesn't
 * collapse while it leaves.
 */
export default function Sheet({ visible, onClose, children, footer, scroll = true, maxHeight = 0.88 }) {
  const insets = useSafeAreaInsets();
  // The sheet lifts above the keyboard so it doesn't cover fields and buttons
  const keyboard = useKeyboardHeight();
  const winHeight = Dimensions.get('window').height;
  // Off screen = the panel's own height down: a fixed 500 pt left the top of tall sheets visible, so they
  // popped in and out mid-screen, while a whole window down made short ones dart. The slide-in therefore
  // starts once the panel has been measured (onLayout), one frame after it mounts, hidden a window down.
  const panelHeight = useRef(0);
  const pendingOpen = useRef(false);
  // Whether the panel on screen has been measured (its layout can arrive before or after the open effect)
  const measured = useRef(false);
  const offscreen = () => (panelHeight.current ? panelHeight.current + 24 : winHeight);
  const y = useRef(new Animated.Value(winHeight)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  // Counted as open from the moment it shows until iOS has removed its window
  const counted = useRef(false);
  const release = useRef(() => {
    if (!counted.current) return;
    counted.current = false;
    openSheets -= 1;
    flush();
  }).current;
  useEffect(() => release, [release]);
  // Swipe down to close, like an iOS sheet. The handle and the footer track the finger with a pan
  // responder. The scrolling content can't: iOS hands that touch to the native scroll view, so there
  // the pull past the top (the bounce) moves the whole sheet down, and letting go far enough closes it.
  const scrollY = useRef(new Animated.Value(0)).current;
  // Built once: new interpolation nodes on every render would be re-attached to the native driver
  const anim = useRef(null);
  if (!anim.current) {
    const pull = scrollY.interpolate({ inputRange: [-1000, 0], outputRange: [1000, 0], extrapolateRight: 'clamp' });
    anim.current = {
      panelY: Animated.add(y, pull),
      // Cancels the bounce inside the sheet, so the content moves with the sheet rather than twice as far
      counterPull: scrollY.interpolate({ inputRange: [-1000, 0], outputRange: [-1000, 0], extrapolateRight: 'clamp' }),
      backdrop: Animated.multiply(backdrop, pull.interpolate({ inputRange: [0, 400], outputRange: [1, 0], extrapolate: 'clamp' })),
    };
  }
  // Android has no bounce past the top, so there the content is dragged with a pan responder instead,
  // taken over only while the content is scrolled to the top (its scroll view can't move further down)
  const atTop = useRef(true);
  const onScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: true,
      listener: ANDROID
        ? (e) => {
            atTop.current = e.nativeEvent.contentOffset.y <= 0;
          }
        : undefined,
    })
  ).current;
  const onScrollEndDrag = (e) => {
    const { contentOffset, velocity } = e.nativeEvent;
    // iOS reports a downward pull as a negative offset and a negative velocity
    if (contentOffset.y < -PULL_CLOSE || (contentOffset.y < -8 && (velocity?.y ?? 0) < -CLOSE_VELOCITY)) closeRef.current?.();
  };
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const settle = () => {
    Animated.parallel([
      Animated.spring(y, { toValue: 0, useNativeDriver: true, ...SPRING.standard }),
      Animated.timing(backdrop, { toValue: 1, duration: DURATION.exit, useNativeDriver: true }),
    ]).start();
  };
  const drag = useRef(null);
  if (!drag.current) {
    const handlers = {
      onPanResponderGrant: () => y.stopAnimation(),
      onPanResponderMove: (_, g) => {
        const d = Math.max(0, g.dy);
        y.setValue(d);
        backdrop.setValue(1 - Math.min(1, d / 400));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > CLOSE_DISTANCE || (g.vy > CLOSE_VELOCITY && g.dy > 10)) closeRef.current?.();
        else settle();
      },
      onPanResponderTerminate: () => settle(),
      onPanResponderTerminationRequest: () => false,
    };
    const down = (g) => g.dy > 6 && g.dy > Math.abs(g.dx) * 1.5;
    drag.current = {
      handle: PanResponder.create({ ...handlers, onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: (_, g) => down(g) }),
      // The footer, and the content when it doesn't scroll: buttons inside still get taps
      body: PanResponder.create({ ...handlers, onMoveShouldSetPanResponderCapture: (_, g) => down(g) }),
      // Android only: the scrolling content, while it is at the top
      content: PanResponder.create({ ...handlers, onMoveShouldSetPanResponderCapture: (_, g) => atTop.current && down(g) }),
    };
  }

  // What was on screen while open, shown during the exit
  const last = useRef({ children, footer });
  if (visible) last.current = { children, footer };

  const slideIn = () => {
    pendingOpen.current = false;
    scrollY.setValue(0);
    atTop.current = true;
    y.setValue(offscreen());
    Animated.parallel([
      Animated.spring(y, { toValue: 0, useNativeDriver: true, ...SPRING.standard }),
      Animated.timing(backdrop, { toValue: 1, duration: DURATION.appear, useNativeDriver: true }),
    ]).start();
  };
  const onPanelLayout = (e) => {
    panelHeight.current = e.nativeEvent.layout.height;
    measured.current = true;
    if (pendingOpen.current && visible) slideIn();
  };

  useEffect(() => {
    if (visible) {
      setMounted(true);
      if (!counted.current) {
        counted.current = true;
        openSheets += 1;
      }
      if (motionReduced()) {
        y.setValue(0);
        backdrop.setValue(1);
        return;
      }
      y.setValue(winHeight);
      backdrop.setValue(0);
      pendingOpen.current = true;
      if (measured.current) slideIn();
    } else if (mounted) {
      if (motionReduced()) {
        setMounted(false);
        return;
      }
      // Something waits for this sheet to go (afterSheetsClose): hand over instead of a full exit
      const handoff = waiting.length > 0;
      const exit = handoff ? HANDOFF_EXIT : DURATION.exit;
      Animated.parallel([
        Animated.timing(y, { toValue: offscreen(), duration: exit, easing: handoff ? HANDOFF_EASE : EASE_IN, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 0, duration: exit, useNativeDriver: true }),
      ]).start(({ finished }) => finished && setMounted(false));
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // After the exit the Modal stays rendered but hidden, so iOS reports when its window is gone (onDismiss).
  // A timer backs that up in case the event never comes.
  useEffect(() => {
    if (mounted || visible || !counted.current) return undefined;
    const timer = setTimeout(release, 400);
    return () => clearTimeout(timer);
  }, [mounted, visible, release]);

  const shown = mounted || visible;
  // The panel unmounts with the Modal's content, and the next one is measured afresh
  if (!shown) measured.current = false;
  const content = visible ? { children, footer } : last.current;
  return (
    <Modal visible={shown} transparent animationType="none" onRequestClose={onClose} onDismiss={release} statusBarTranslucent>
      {shown && (
      <View style={s.root} pointerEvents={visible ? 'auto' : 'none'}>
        <Animated.View style={[StyleSheet.absoluteFill, s.backdrop, { opacity: scroll ? anim.current.backdrop : backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('Затвори')} />
        </Animated.View>
        <Animated.View
          {...(ANDROID && scroll ? drag.current.content.panHandlers : null)}
          onLayout={onPanelLayout}
          onAccessibilityEscape={onClose}
          style={[
            s.panel,
            {
              paddingBottom: keyboard ? 16 : insets.bottom + 16,
              marginBottom: keyboard,
              maxHeight: Math.min(winHeight * maxHeight, winHeight - keyboard - insets.top - 12),
            },
            { transform: [{ translateY: scroll ? anim.current.panelY : y }] },
          ]}
        >
          {/* A taller grab area than the visible handle */}
          <View style={s.grab} {...drag.current.handle.panHandlers}>
            <View style={s.handle} />
          </View>
          {scroll ? (
            <Animated.ScrollView
              contentContainerStyle={s.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              // Bounces even when the content fits, so a pull from the top always reaches the sheet
              alwaysBounceVertical
              scrollEventThrottle={16}
              onScroll={onScroll}
              onScrollEndDrag={onScrollEndDrag}
            >
              <Animated.View style={{ transform: [{ translateY: anim.current.counterPull }] }}>{content.children}</Animated.View>
            </Animated.ScrollView>
          ) : (
            <View style={s.content} {...drag.current.body.panHandlers}>
              {content.children}
            </View>
          )}
          {content.footer && (
            <View style={s.footer} {...drag.current.body.panHandlers}>
              {content.footer}
            </View>
          )}
        </Animated.View>
      </View>
      )}
    </Modal>
  );
}

const s = themed((colors) => ({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: colors.backdrop },
  panel: { backgroundColor: colors.bg, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  // No overlap with the content below: scrolled content would otherwise slide over the handle
  grab: { alignSelf: 'stretch', alignItems: 'center', paddingTop: 10 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.faint },
  content: { padding: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 4 },
}));
