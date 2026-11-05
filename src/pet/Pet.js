import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, Platform } from 'react-native';
import Svg, { G, Path, Circle, Ellipse, Text as SvgText } from 'react-native-svg';
import { extras } from './petShapes';
import useReduceMotion from '../hooks/useReduceMotion';
import Accessories from './Accessories';
import { SLOTS } from './outfit';

// Charlie is a painted picture (cut out of the original illustration, bottom faded out).
// Each mood has its own face; the moods with open eyes also have a closed-eyes version for blinking.
// The younger stages are the same pictures made younger (bigger head and eyes, shorter muzzle),
// generated from the adult ones, so every mood and blink matches.
const FACES = {
  kitten: {
    happy: require('../../assets/pet/charlie-happy-kitten.webp'),
    ecstatic: require('../../assets/pet/charlie-ecstatic-kitten.webp'),
    worried: require('../../assets/pet/charlie-worried-kitten.webp'),
    sad: require('../../assets/pet/charlie-sad-kitten.webp'),
    crying: require('../../assets/pet/charlie-crying-kitten.webp'),
    hungry: require('../../assets/pet/charlie-hungry-kitten.webp'),
    sleeping: require('../../assets/pet/charlie-sleeping-kitten.webp'),
  },
  young: {
    happy: require('../../assets/pet/charlie-happy-young.webp'),
    ecstatic: require('../../assets/pet/charlie-ecstatic-young.webp'),
    worried: require('../../assets/pet/charlie-worried-young.webp'),
    sad: require('../../assets/pet/charlie-sad-young.webp'),
    crying: require('../../assets/pet/charlie-crying-young.webp'),
    hungry: require('../../assets/pet/charlie-hungry-young.webp'),
    sleeping: require('../../assets/pet/charlie-sleeping-young.webp'),
  },
  adult: {
    happy: require('../../assets/pet/charlie-happy.webp'),
    ecstatic: require('../../assets/pet/charlie-ecstatic.webp'),
    worried: require('../../assets/pet/charlie-worried.webp'),
    sad: require('../../assets/pet/charlie-sad.webp'),
    crying: require('../../assets/pet/charlie-crying.webp'),
    hungry: require('../../assets/pet/charlie-hungry.webp'),
    sleeping: require('../../assets/pet/charlie-sleeping.webp'),
  },
};
const BLINKS = {
  kitten: {
    happy: require('../../assets/pet/charlie-happy-blink-kitten.webp'),
    worried: require('../../assets/pet/charlie-worried-blink-kitten.webp'),
    sad: require('../../assets/pet/charlie-sad-blink-kitten.webp'),
    hungry: require('../../assets/pet/charlie-hungry-blink-kitten.webp'),
  },
  young: {
    happy: require('../../assets/pet/charlie-happy-blink-young.webp'),
    worried: require('../../assets/pet/charlie-worried-blink-young.webp'),
    sad: require('../../assets/pet/charlie-sad-blink-young.webp'),
    hungry: require('../../assets/pet/charlie-hungry-blink-young.webp'),
  },
  adult: {
    happy: require('../../assets/pet/charlie-happy-blink.webp'),
    worried: require('../../assets/pet/charlie-worried-blink.webp'),
    sad: require('../../assets/pet/charlie-sad-blink.webp'),
    hungry: require('../../assets/pet/charlie-hungry-blink.webp'),
  },
};
// The champion is the grown-up dog (with a crown)
const faceSet = (stage) => (stage === 'kitten' || stage === 'young' ? stage : 'adult');

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
const STAGE_SCALE = { kitten: 0.7, young: 0.85, adult: 1, champion: 1 };

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
 * head / neck: the outfit (see outfit.js); accessory: a single item from older saves.
 * A "Шампион" wears a crown when nothing else is on his head.
 */
function Pet({ expression = 'happy', stage = 'adult', head, neck, accessory, size = 160, grow = true, animate: animateProp = true, bounceKey = 0, style, accessibilityLabel }) {
  const headItem = head !== undefined ? head : SLOTS[accessory] === 'head' ? accessory : null;
  const neckItem = neck !== undefined ? neck : SLOTS[accessory] === 'neck' ? accessory : null;
  const animate = animateProp && !useReduceMotion();
  const motion = MOTION[expression] || MOTION.happy;
  const bob = useRef(new Animated.Value(0)).current;
  const set = faceSet(stage);
  const face = FACES[set][expression] || FACES[set].happy;
  const blinkFace = animate ? BLINKS[set][expression] : null;
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
  // grow={false}: full size whatever the stage (the widget pictures, where space is tight)
  const k = grow ? STAGE_SCALE[stage] ?? 1 : 1;
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
        {/* Inside the scaled view, so the outfit breathes and grows with him */}
        <Accessories size={size} head={headItem} neck={neckItem} stage={stage} expression={expression} />
      </Animated.View>
      {extrasSvg}
    </Animated.View>
  );
}

// Parents re-render often (store changes, timers); the dog only redraws when its own props change
export default memo(Pet);
