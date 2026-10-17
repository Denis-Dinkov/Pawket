import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Easing, Platform } from 'react-native';
import Svg, { G, Path, Circle, Ellipse, Text as SvgText } from 'react-native-svg';
import { petShapes } from './petShapes';

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

// Motion per mood: bobbing, tail wagging (the dog wags wider and faster when happy), blinking
const MOTION = {
  ecstatic: { bob: 6, bobMs: 420, wag: 22, wagMs: 160, blinks: false },
  happy: { bob: 4, bobMs: 900, wag: 16, wagMs: 320, blinks: true },
  worried: { bob: 2, bobMs: 1200, wag: 5, wagMs: 900, blinks: true },
  sad: { bob: 1.5, bobMs: 1800, wag: 2, wagMs: 1600, blinks: true },
  crying: { bob: 1.5, bobMs: 260, wag: 0, wagMs: 1000, blinks: false },
  hungry: { bob: 3, bobMs: 700, wag: 8, wagMs: 500, blinks: true },
  sleeping: { bob: 2.5, bobMs: 2200, wag: 0, wagMs: 1000, blinks: false },
};

function useLoop(value, duration, enabled, from = 0, to = 1) {
  useEffect(() => {
    if (!enabled) {
      value.setValue((from + to) / 2);
      return undefined;
    }
    value.setValue(from);
    const ease = Easing.inOut(Easing.sin);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: to, duration, easing: ease, useNativeDriver: native }),
        Animated.timing(value, { toValue: from, duration, easing: ease, useNativeDriver: native }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [value, duration, enabled, from, to]);
}

/**
 * Animated dog. bounceKey — change the value to make it jump (e.g. after feeding).
 */
export default function Pet({ expression = 'happy', stage = 'adult', size = 160, animate = true, bounceKey = 0, style }) {
  const motion = MOTION[expression] || MOTION.happy;
  const [blink, setBlink] = useState(false);
  const bob = useRef(new Animated.Value(0)).current;
  const wag = useRef(new Animated.Value(0)).current;
  const jump = useRef(new Animated.Value(0)).current;
  const first = useRef(true);

  useLoop(bob, motion.bobMs, animate);
  useLoop(wag, motion.wagMs, animate && motion.wag > 0, -1, 1);

  useEffect(() => {
    if (!animate || !motion.blinks) return undefined;
    let timer;
    let alive = true;
    const next = () => {
      timer = setTimeout(() => {
        if (!alive) return;
        setBlink(true);
        timer = setTimeout(() => {
          setBlink(false);
          next();
        }, 140);
      }, 2200 + Math.random() * 3000);
    };
    next();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [animate, motion.blinks]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    jump.setValue(0);
    Animated.sequence([
      Animated.timing(jump, { toValue: -size * 0.14, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: native }),
      Animated.spring(jump, { toValue: 0, friction: 4, tension: 120, useNativeDriver: native }),
    ]).start();
  }, [bounceKey, jump, size]);

  const { main, tail, pivot, tailScale, tailAngle } = petShapes({ expression, stage, blink });
  const unit = size / 200;
  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -motion.bob * unit * 1.25] });
  const rotate = wag.interpolate({
    inputRange: [-1, 1],
    outputRange: [`${tailAngle - motion.wag}deg`, `${tailAngle + motion.wag}deg`],
  });

  return (
    <Animated.View style={[{ width: size, height: size, transform: [{ translateY: Animated.add(bobY, jump) }] }, style]}>
      {/* The tail is a separate layer, centered on its base, so it rotates around it */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          left: pivot.x * unit - size / 2,
          top: pivot.y * unit - size / 2,
          transform: [{ rotate }],
        }}
      >
        <Svg width={size} height={size} viewBox="-100 -100 200 200">
          <G transform={`scale(${tailScale})`}>{render(tail)}</G>
        </Svg>
      </Animated.View>
      <Svg width={size} height={size} viewBox="0 0 200 200" style={{ position: 'absolute' }}>
        {render(main)}
      </Svg>
    </Animated.View>
  );
}
