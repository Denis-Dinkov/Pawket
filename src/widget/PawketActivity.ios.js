import { HStack, VStack, Text, Image, Spacer, ProgressView, Link } from '@expo/ui/swift-ui';
import {
  font, foregroundStyle, frame, tint, lineLimit, minimumScaleFactor, opacity, resizable, aspectRatio, padding,
  activityBackgroundTint, monospacedDigit, contentTransition, animation, Animation, multilineTextAlignment, layoutPriority, fixedSize,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity } from 'expo-widgets';

/**
 * Live Activity: Charlie appears in the Dynamic Island only while something is happening
 * (see activityEvent in widgetData.js): a shopping trip, a no-spend day, a payment due, the last days of the month.
 * One layout for all of them: an icon and a title, one big value (an amount that rolls to the new value,
 * or a countdown to midnight), an optional bar, a detail line and an optional action ("Приключи").
 * Like the widget, this function runs in the widget extension and can use only @expo/ui.
 */
const PawketActivity = (props) => {
  'widget';
  const white = '#FFFFFF';
  const soft = '#E8D8CA';
  const color = props.color || '#3FD9A2';
  const countdown = props.timerEnd > 0;
  const big = (size, weight) => [
    font({ size, weight, design: 'rounded' }),
    foregroundStyle(color),
    monospacedDigit(),
    lineLimit(1),
    minimumScaleFactor(0.6),
    contentTransition('numericText', { countsDown: true }),
    animation(Animation.spring(), props.value),
  ];
  // A countdown Text takes all the width it's offered, so it gets a fixed frame
  const value = (size, weight, width) =>
    countdown ? (
      <Text
        timerInterval={{ lower: new Date(Date.now()), upper: new Date(props.timerEnd) }}
        countsDown
        modifiers={[...big(size, weight), multilineTextAlignment('trailing'), frame({ width, alignment: 'trailing' })]}
      />
    ) : (
      <Text modifiers={big(size, weight)}>{props.valueText}</Text>
    );
  const dog = (size) =>
    props.petImage ? (
      <Image uiImage={props.petImage} modifiers={[resizable(), aspectRatio({ contentMode: 'fit' }), frame({ width: size, height: size })]} />
    ) : (
      <Text modifiers={[font({ size: size * 0.7 })]}>{props.emoji}</Text>
    );
  const titleRow = (size) => (
    <HStack spacing={5}>
      <Image systemName={props.symbol} size={size} color={color} />
      <Text modifiers={[font({ size, weight: 'semibold' }), foregroundStyle(white), lineLimit(1)]}>{props.title}</Text>
    </HStack>
  );
  const bar = props.progress >= 0 ? <ProgressView value={props.progress} modifiers={[tint(color)]} /> : null;
  // The action keeps its full width (layoutPriority) and stays clear of the rounded corner
  const action = props.actionUrl ? (
    <Link destination={props.actionUrl} modifiers={[layoutPriority(1)]}>
      <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(color), lineLimit(1), fixedSize()]}>{props.actionLabel}</Text>
    </Link>
  ) : null;
  const label = (size) =>
    props.valueLabel ? (
      <Text modifiers={[font({ size }), foregroundStyle(soft), opacity(0.9), lineLimit(1), minimumScaleFactor(0.7)]}>{props.valueLabel}</Text>
    ) : null;

  return {
    banner: (
      <HStack spacing={12} modifiers={[padding({ all: 14 }), activityBackgroundTint('#1E1510')]}>
        {dog(52)}
        <VStack alignment="leading" spacing={4}>
          <HStack>
            {titleRow(13)}
            <Spacer />
            {action}
          </HStack>
          <HStack spacing={6}>
            {value(24, 'heavy', 110)}
            {label(13)}
          </HStack>
          {bar}
          <Text modifiers={[font({ size: 11 }), foregroundStyle(soft), lineLimit(1)]}>{props.detail}</Text>
        </VStack>
      </HStack>
    ),
    compactLeading: (
      <HStack spacing={3}>
        {dog(22)}
        <Image systemName={props.symbol} size={11} color={color} />
      </HStack>
    ),
    compactTrailing: value(14, 'bold', 58),
    minimal: dog(22),
    expandedLeading: (
      <VStack alignment="leading" spacing={2}>
        {dog(48)}
      </VStack>
    ),
    // The label sits under the title: the trailing corner is too narrow for it next to the amount
    expandedCenter: (
      <VStack spacing={1}>
        {titleRow(14)}
        {label(11)}
      </VStack>
    ),
    expandedTrailing: value(22, 'heavy', 96),
    expandedBottom: (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ horizontal: 8 })]}>
        {bar}
        <HStack>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(soft), lineLimit(1), minimumScaleFactor(0.8)]}>{props.detail}</Text>
          <Spacer />
          {action}
        </HStack>
      </VStack>
    ),
  };
};

export default createLiveActivity('PawketActivity', PawketActivity);
