import { HStack, VStack, Text, Image, Spacer, ProgressView, Link, Gauge } from '@expo/ui/swift-ui';
import {
  font, foregroundStyle, frame, containerBackground, widgetURL, tint, lineLimit, minimumScaleFactor, opacity, gaugeStyle,
  resizable, aspectRatio, monospacedDigit, padding, background, shapes,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

// iOS widget: remaining budget + the dog. The function runs separately from the app —
// it can't use anything outside itself except the @expo/ui components (see the expo-widgets docs).
const BudgetWidget = (props, environment) => {
  'widget';
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
        <Text modifiers={[font({ size: 12 }), lineLimit(1), opacity(0.8)]}>{props.todayText || props.remainingLabel}</Text>
      </VStack>
    );
  }
  // Home screen: Charlie's room colours (light or dark), so the brown dog stands out against them
  const dark = environment.colorScheme === 'dark';
  const room = {
    type: 'linearGradient',
    colors: dark ? ['#2A1D15', '#3A2719'] : ['#FFEBD6', '#FFD4AC'],
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 0, y: 1 },
  };
  const ink = dark ? '#F4ECE4' : '#1E1510';
  const muted = dark ? '#C9B4A2' : '#6E4E38';
  const accent = dark ? '#F0A066' : '#A3531F';
  const good = dark ? '#3FD9A2' : '#0A7550';
  const bad = dark ? '#FF7A7E' : '#C8323A';
  const chip = dark ? '#FFFFFF1A' : '#FFFFFF8C';

  const pet = (size) =>
    props.petImage ? (
      // resizable() is required, otherwise SwiftUI draws the image at its original size
      <Image uiImage={props.petImage} modifiers={[resizable(), aspectRatio({ contentMode: 'fit' }), frame({ width: size, height: size })]} />
    ) : (
      <Text modifiers={[font({ size: size * 0.6 })]}>{props.emoji}</Text>
    );

  const money = (size) => (
    <VStack alignment="leading" spacing={0}>
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(muted), lineLimit(1)]}>{props.remainingLabel}</Text>
      <Text
        modifiers={[
          font({ size, weight: 'heavy', design: 'rounded' }),
          foregroundStyle(props.over ? bad : ink),
          monospacedDigit(),
          lineLimit(1),
          minimumScaleFactor(0.6),
        ]}
      >
        {props.remainingText}
      </Text>
    </VStack>
  );
  const today = (
    <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(props.todayOver ? bad : good), lineLimit(1), minimumScaleFactor(0.8)]}>
      {props.todayText}
    </Text>
  );

  if (family === 'systemMedium') {
    // Quick add: one tap opens "New expense" with the category already picked
    const quick = (id, symbol, name) =>
      id ? (
        <Link destination={`pawket://add?source=widget&category=${id}`}>
          <VStack spacing={3} modifiers={[frame({ maxWidth: 1000 }), padding({ vertical: 7 }), background(chip, shapes.roundedRectangle({ cornerRadius: 12 }))]}>
            <Image systemName={symbol} size={16} color={accent} />
            <Text modifiers={[font({ size: 10, weight: 'semibold' }), foregroundStyle(ink), lineLimit(1), minimumScaleFactor(0.7)]}>{name}</Text>
          </VStack>
        </Link>
      ) : null;
    return (
      <HStack spacing={12} modifiers={[containerBackground(room, 'widget'), widgetURL('pawket://home')]}>
        <VStack alignment="center" spacing={2} modifiers={[frame({ width: 84 })]}>
          {pet(76)}
          <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(ink), lineLimit(1)]}>{props.petName}</Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(1), minimumScaleFactor(0.8)]}>{props.moodLabel}</Text>
        </VStack>
        <VStack alignment="leading" spacing={5}>
          <HStack alignment="top">
            {money(22)}
            <Spacer />
            <Link destination="pawket://add?source=widget">
              <Image systemName="plus.circle.fill" size={26} color={accent} />
            </Link>
          </HStack>
          {today}
          <HStack spacing={6}>
            {quick(props.q1Id, props.q1Symbol, props.q1Name)}
            {quick(props.q2Id, props.q2Symbol, props.q2Name)}
            {quick(props.q3Id, props.q3Symbol, props.q3Name)}
          </HStack>
          {props.nextPayment ? (
            <HStack spacing={4}>
              <Image systemName="calendar" size={10} color={muted} />
              <Text modifiers={[font({ size: 10, weight: 'medium' }), foregroundStyle(muted), lineLimit(1), minimumScaleFactor(0.8)]}>{props.nextPayment}</Text>
            </HStack>
          ) : null}
        </VStack>
      </HStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={1} modifiers={[containerBackground(room, 'widget'), widgetURL('pawket://home')]}>
      <HStack alignment="top">
        {pet(62)}
        <Spacer />
        <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(muted), lineLimit(1)]}>{props.moodLabel}</Text>
      </HStack>
      <Spacer />
      {money(26)}
      {today}
    </VStack>
  );
};

export default createWidget('BudgetWidget', BudgetWidget);
