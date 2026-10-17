import { HStack, VStack, Text, Image, Spacer, ProgressView, Link, Gauge } from '@expo/ui/swift-ui';
import {
  font, foregroundStyle, frame, containerBackground, widgetURL, tint, lineLimit, minimumScaleFactor, opacity, gaugeStyle,
  resizable, aspectRatio,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

// iOS widget: remaining budget + the dog. The function runs separately from the app —
// it can't use anything outside itself except the @expo/ui components (see the expo-widgets docs).
const BudgetWidget = (props, environment) => {
  'widget';
  const bg = { type: 'linearGradient', colors: ['#C46D2D', '#EBA15E'], startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } };
  const white = '#FFFFFF';
  const soft = '#FFF1E4';
  const family = environment.widgetFamily;

  // Lock screen: the system tints everything monochrome, so only text, emoji and Gauge
  if (family === 'accessoryInline') {
    return (
      <Text modifiers={[widgetURL('pawket://home')]}>
        {props.emoji} {props.remainingLabel} {props.remainingText}
      </Text>
    );
  }
  if (family === 'accessoryCircular') {
    return (
      <Gauge
        value={props.leftRatio}
        min={0}
        max={1}
        currentValueLabel={<Text modifiers={[font({ size: 13, weight: 'bold', design: 'rounded' }), minimumScaleFactor(0.6)]}>{props.remainingShort}</Text>}
        modifiers={[gaugeStyle('circular'), containerBackground('#00000000', 'widget'), widgetURL('pawket://home')]}
      >
        <Text modifiers={[font({ size: 11 })]}>{props.emoji}</Text>
      </Gauge>
    );
  }
  if (family === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={1} modifiers={[containerBackground('#00000000', 'widget'), widgetURL('pawket://home')]}>
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), lineLimit(1)]}>
          {props.emoji} {props.petName} · {props.moodLabel}
        </Text>
        <Text modifiers={[font({ size: 20, weight: 'heavy', design: 'rounded' }), lineLimit(1), minimumScaleFactor(0.6)]}>
          {props.remainingText}
        </Text>
        <Text modifiers={[font({ size: 12 }), lineLimit(1), opacity(0.8)]}>{props.perDayText || props.remainingLabel}</Text>
      </VStack>
    );
  }
  const pet = props.petImage ? (
    // resizable() is required, otherwise SwiftUI draws the image at its original size
    <Image uiImage={props.petImage} modifiers={[resizable(), aspectRatio({ contentMode: 'fit' }), frame({ width: 58, height: 58 })]} />
  ) : (
    <Text modifiers={[font({ size: 38 })]}>{props.emoji}</Text>
  );

  const money = (
    <VStack alignment="leading" spacing={0}>
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(soft)]}>{props.remainingLabel}</Text>
      <Text modifiers={[font({ size: 26, weight: 'heavy', design: 'rounded' }), foregroundStyle(white), lineLimit(1), minimumScaleFactor(0.6)]}>
        {props.remainingText}
      </Text>
    </VStack>
  );

  if (family === 'systemMedium') {
    const bar = (label, value, color) => (
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ size: 10, weight: 'semibold' }), foregroundStyle(soft)]}>{label}</Text>
        <ProgressView value={value} modifiers={[tint(color)]} />
      </VStack>
    );
    return (
      <HStack spacing={12} modifiers={[containerBackground(bg, 'widget'), widgetURL('pawket://home')]}>
        <VStack alignment="leading" spacing={6}>
          {pet}
          <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(white)]}>{props.petName}</Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(soft)]}>{props.moodLabel}</Text>
        </VStack>
        <VStack alignment="leading" spacing={6}>
          <HStack>
            {money}
            <Spacer />
            <Link destination="pawket://add?source=widget">
              <Image systemName="plus.circle.fill" size={26} color={white} />
            </Link>
          </HStack>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(soft), lineLimit(1)]}>{props.perDayText}</Text>
          {bar(props.needsLabel, props.needs, '#3D7BFF')}
          {bar(props.wantsLabel, props.wants, '#D6479A')}
          {bar(props.savingsLabel, props.savings, '#1FBF87')}
        </VStack>
      </HStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={4} modifiers={[containerBackground(bg, 'widget'), widgetURL('pawket://home')]}>
      <HStack>
        {pet}
        <Spacer />
        <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(white), opacity(0.9)]}>{props.moodLabel}</Text>
      </HStack>
      <Spacer />
      {money}
      <Text modifiers={[font({ size: 10 }), foregroundStyle(soft), lineLimit(1)]}>{props.perDayText}</Text>
    </VStack>
  );
};

export default createWidget('BudgetWidget', BudgetWidget);
