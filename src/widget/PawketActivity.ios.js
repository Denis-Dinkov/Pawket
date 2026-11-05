import { HStack, VStack, Text, Image, Spacer, ProgressView } from '@expo/ui/swift-ui';
import {
  font, foregroundStyle, frame, tint, lineLimit, minimumScaleFactor, opacity, resizable, aspectRatio, padding,
  activityBackgroundTint, monospacedDigit, contentTransition, animation, Animation,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity } from 'expo-widgets';

/**
 * Live Activity: Charlie and today's limit in the Dynamic Island and on the Lock Screen.
 * Compact: the dog on the left of the camera, what's left for today on the right.
 * Expanded (long press): the mood, a bar of today's spending and what's left of the month.
 * The amounts roll to the new value (numericText) whenever an expense is recorded.
 * Like the widget, this function runs in the widget extension and can use only @expo/ui.
 */
const PawketActivity = (props) => {
  'widget';
  const white = '#FFFFFF';
  const soft = '#E8D8CA';
  const color = props.over ? '#FF7A7E' : '#3FD9A2';
  const rolling = (size, weight) => [
    font({ size, weight, design: 'rounded' }),
    foregroundStyle(color),
    monospacedDigit(),
    lineLimit(1),
    minimumScaleFactor(0.6),
    contentTransition('numericText', { countsDown: true }),
    animation(Animation.spring(), props.todayLeft),
  ];
  const dog = (size) =>
    props.petImage ? (
      <Image uiImage={props.petImage} modifiers={[resizable(), aspectRatio({ contentMode: 'fit' }), frame({ width: size, height: size })]} />
    ) : (
      <Text modifiers={[font({ size: size * 0.7 })]}>{props.emoji}</Text>
    );

  return {
    banner: (
      <HStack spacing={12} modifiers={[padding({ all: 14 }), activityBackgroundTint('#1E1510')]}>
        {dog(52)}
        <VStack alignment="leading" spacing={4}>
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(soft), lineLimit(1)]}>
            {props.petName} · {props.moodLabel}
          </Text>
          <HStack spacing={6}>
            <Text modifiers={[font({ size: 13 }), foregroundStyle(soft)]}>{props.over ? 'Днес над лимита' : 'Днес остават'}</Text>
            <Text modifiers={rolling(24, 'heavy')}>{props.todayLeftText}</Text>
          </HStack>
          <ProgressView value={props.spentRatio} modifiers={[tint(color)]} />
          <Text modifiers={[font({ size: 11 }), foregroundStyle(soft), lineLimit(1)]}>{props.remainingText}</Text>
        </VStack>
      </HStack>
    ),
    compactLeading: dog(24),
    compactTrailing: <Text modifiers={rolling(14, 'bold')}>{props.todayLeftText}</Text>,
    minimal: dog(22),
    expandedLeading: (
      <VStack alignment="leading" spacing={2}>
        {dog(48)}
      </VStack>
    ),
    expandedCenter: (
      <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(white), lineLimit(1)]}>
        {props.petName} · {props.moodLabel}
      </Text>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={0}>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(soft), opacity(0.9)]}>днес</Text>
        <Text modifiers={rolling(22, 'heavy')}>{props.todayLeftText}</Text>
      </VStack>
    ),
    expandedBottom: (
      <VStack alignment="leading" spacing={6}>
        <ProgressView value={props.spentRatio} modifiers={[tint(color)]} />
        <HStack>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(soft), lineLimit(1)]}>{props.tip}</Text>
          <Spacer />
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(white), lineLimit(1)]}>{props.remainingShort}</Text>
        </HStack>
      </VStack>
    ),
  };
};

export default createLiveActivity('PawketActivity', PawketActivity);
