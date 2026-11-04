import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, Platform } from 'react-native';
import Svg, { G, Path, Circle, Ellipse, Text as SvgText } from 'react-native-svg';
import { extras } from './petShapes';
import useReduceMotion from '../hooks/useReduceMotion';

// Charlie is a painted picture (cut out of the original illustration, bottom faded out).
// Each mood has its own face; the moods with open eyes also have a closed-eyes version for blinking.
const FACES = {
  happy: require('../../assets/pet/charlie-happy.webp'),
  ecstatic: require('../../assets/pet/charlie-ecstatic.webp'),
  worried: require('../../assets/pet/charlie-worried.webp'),
  sad: require('../../assets/pet/charlie-sad.webp'),
  crying: require('../../assets/pet/charlie-crying.webp'),
  hungry: require('../../assets/pet/charlie-hungry.webp'),
  sleeping: require('../../assets/pet/charlie-sleeping.webp'),
};
const BLINKS = {
  happy: require('../../assets/pet/charlie-happy-blink.webp'),
  worried: require('../../assets/pet/charlie-worried-blink.webp'),
  sad: require('../../assets/pet/charlie-sad-blink.webp'),
  hungry: require('../../assets/pet/charlie-hungry-blink.webp'),
};

const TAGS = { path: Path, circle: Circle, ellipse: Ellipse };
const native = Platform.OS !== 'web';

function render(nodes) {
  return nodes.map(({ t, children, text, ...props }, i) => {
    if (t === 'g') return <G key={i} {...props}>{render(children)}</G>;
    if (t === 'text') return <SvgText key={i} {...props}>{text}</SvgText>;
    const Tag = TAGS[t];
    return <Tag key={i} {...props} />;
  });
}

// Motion per mood: how much and how fast he breathes / bobs (livelier when happy, slow when sad or asleep)
const MOTION = {
  ecstatic: { bob: 5, breath: 0.03, ms: 420 },
  happy: { bob: 3, breath: 0.02, ms: 900 },
  worried: { bob: 1.5, breath: 0.015, ms: 1200 },
  sad: { bob: 1, breath: 0.012, ms: 1800 },
  crying: { bob: 1.5, breath: 0.015, ms: 260 },
  hungry: { bob: 2.5, breath: 0.02, ms: 700 },
  sleeping: { bob: 1, breath: 0.025, ms: 2200 },
};

// The puppy is smaller and grows with the stages
const STAGE_SCALE = { kitten: 0.8, young: 0.9, adult: 1, champion: 1 };

function useLoop(value, duration, enabled) {
  useEffect(() => {
    if (!enabled) {
      value.setValue(0);
      return undefined;
    }
    value.setValue(0);
    const ease = Easing.inOut(Easing.sin);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration, easing: ease, useNativeDriver: native }),
        Animated.timing(value, { toValue: 0, duration, easing: ease, useNativeDriver: native }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [value, duration, enabled]);
}

/**
 * Animated dog. bounceKey — change the value to make it jump (e.g. after feeding).
 * accessory is accepted for compatibility; the painted picture doesn't show rewards yet.
 */
function Pet({ expression = 'happy', stage = 'adult', size = 160, animate: animateProp = true, bounceKey = 0, style, accessibilityLabel }) {
  const animate = animateProp && !useReduceMotion();
  const motion = MOTION[expression] || MOTION.happy;
  const bob = useRef(new Animated.Value(0)).current;
  const face = FACES[expression] || FACES.happy;
  const blinkFace = animate ? BLINKS[expression] : null;
  // Blinking shows the closed-eyes picture on top for a moment (native opacity, no React render)
  const blink = useRef(new Animated.Value(0)).current;
  const jump = useRef(new Animated.Value(0)).current;
  // The last bounceKey seen: effects re-run when a hidden tab comes back, and that mustn't count as a new jump
  const lastBounce = useRef(bounceKey);

  useLoop(bob, motion.ms, animate);

  useEffect(() => {
    if (!blinkFace) return undefined;
    let timer;
    let alive = true;
    const next = () => {
      timer = setTimeout(() => {
        if (!alive) return;
        blink.setValue(1);
        timer = setTimeout(() => {
          blink.setValue(0);
          next();
        }, 150);
      }, 2400 + Math.random() * 3000);
    };
    next();
    return () => {
      alive = false;
      clearTimeout(timer);
      blink.setValue(0);
    };
  }, [blinkFace, blink]);

  useEffect(() => {
    if (lastBounce.current === bounceKey) return;
    lastBounce.current = bounceKey;
    jump.setValue(0);
    Animated.sequence([
      Animated.timing(jump, { toValue: -size * 0.14, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: native }),
      Animated.spring(jump, { toValue: 0, friction: 4, tension: 120, useNativeDriver: native }),
    ]).start();
  }, [bounceKey, jump, size]);

  // Sparkles, "Zzz", the bone thought, the sweat drop: built once per mood
  const extrasSvg = useMemo(() => {
    const nodes = extras(expression);
    return nodes.length ? (
      <Svg width={size} height={size} viewBox="0 0 200 200" style={{ position: 'absolute' }} pointerEvents="none">
        {render(nodes)}
      </Svg>
    ) : null;
  }, [expression, size]);

  const unit = size / 200;
  const k = STAGE_SCALE[stage] ?? 1;
  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -motion.bob * unit] });
  // Breathing: a slight stretch from the bottom, so he looks alive without moving around
  const breathe = bob.interpolate({ inputRange: [0, 1], outputRange: [k, k * (1 + motion.breath)] });

  return (
    <Animated.View
      style={[{ width: size, height: size, transform: [{ translateY: Animated.add(bobY, jump) }] }, style]}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={{ width: size, height: size, transformOrigin: 'bottom', transform: [{ scaleX: k }, { scaleY: breathe }] }}>
        <Image source={face} style={{ width: size, height: size }} resizeMode="contain" fadeDuration={0} />
        {blinkFace && (
          <Animated.Image
            source={blinkFace}
            style={{ position: 'absolute', width: size, height: size, opacity: blink }}
            resizeMode="contain"
            fadeDuration={0}
          />
        )}
      </Animated.View>
      {extrasSvg}
    </Animated.View>
  );
}

// Parents re-render often (store changes, timers); the dog only redraws when its own props change
export default memo(Pet);
