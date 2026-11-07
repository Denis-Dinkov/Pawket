import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// Android home-screen widget: the same content as the iOS one (see BudgetWidget.ios.js).
// It's drawn by the launcher from this description, so only the library's Flex/Text widgets work here.
// props come from widgetProps(); wide = the 4x2 size with the quick-add buttons.
const C = {
  bgFrom: '#FFEBD6',
  bgTo: '#FFD4AC',
  ink: '#1E1510',
  muted: '#6E4E38',
  accent: '#A3531F',
  good: '#0A7550',
  bad: '#C8323A',
  chip: '#FFFFFF99',
};

const open = (uri) => ({ clickAction: 'OPEN_URI', clickActionData: { uri } });

function Quick({ id, emoji, name }) {
  if (!id) return null;
  return (
    <FlexWidget
      {...open(`pawket://add?source=widget&category=${id}`)}
      accessibilityLabel={name}
      style={{ flex: 1, height: 'match_parent', backgroundColor: C.chip, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 }}
    >
      <TextWidget text={emoji} style={{ fontSize: 16 }} />
      <TextWidget text={name} maxLines={1} truncate="END" style={{ fontSize: 10, color: C.ink, fontWeight: '600' }} />
    </FlexWidget>
  );
}

export default function BudgetWidgetAndroid({ props, wide }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'pawket://home' }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        flexGap: 12,
        borderRadius: 22,
        backgroundGradient: { from: C.bgFrom, to: C.bgTo, orientation: 'TOP_BOTTOM' },
      }}
    >
      <FlexWidget style={{ alignItems: 'center', width: 72 }}>
        <TextWidget text={props.emoji} style={{ fontSize: 40 }} />
        <TextWidget text={props.petName} maxLines={1} truncate="END" style={{ fontSize: 13, color: C.ink, fontWeight: '700' }} />
        <TextWidget text={props.moodLabel} maxLines={1} truncate="END" style={{ fontSize: 11, color: C.muted }} />
      </FlexWidget>
      <FlexWidget style={{ flex: 1, height: 'match_parent', justifyContent: 'center', flexGap: 4 }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
          <FlexWidget style={{ flex: 1 }}>
            <TextWidget text={props.remainingLabel} style={{ fontSize: 12, color: C.muted, fontWeight: '600' }} />
            <TextWidget text={props.remainingText} maxLines={1} style={{ fontSize: 24, color: props.over ? C.bad : C.ink, fontWeight: '800' }} />
          </FlexWidget>
          <FlexWidget
            {...open('pawket://add?source=widget')}
            accessibilityLabel="+"
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}
          >
            <TextWidget text="+" style={{ fontSize: 22, color: '#FFFFFF', fontWeight: '700' }} />
          </FlexWidget>
        </FlexWidget>
        <TextWidget text={props.todayText} maxLines={1} style={{ fontSize: 12, color: props.todayOver ? C.bad : C.good, fontWeight: '600' }} />
        {wide && props.q1Id ? (
          <FlexWidget style={{ flexDirection: 'row', flexGap: 6, width: 'match_parent', height: 42 }}>
            <Quick id={props.q1Id} emoji={props.q1Emoji} name={props.q1Name} />
            <Quick id={props.q2Id} emoji={props.q2Emoji} name={props.q2Name} />
            <Quick id={props.q3Id} emoji={props.q3Emoji} name={props.q3Name} />
          </FlexWidget>
        ) : null}
        {wide && props.nextPayment ? <TextWidget text={`📅 ${props.nextPayment}`} maxLines={1} truncate="END" style={{ fontSize: 11, color: C.muted }} /> : null}
      </FlexWidget>
    </FlexWidget>
  );
}
