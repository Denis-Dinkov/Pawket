import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui/AppText';
import Sheet from './ui/Sheet';
import Touch from './ui/Touch';
import { colors, radius, MONTHS } from '../theme';
import { shiftMonth } from '../budget';
import { sameDay } from '../format';
import { themed } from '../themed';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

/**
 * A calendar for any past day (future days are disabled — expenses are recorded after they happen).
 * value / onSelect work with a Date; the time of day is left to the caller.
 */
export default function DatePickerSheet({ visible, value, onSelect, onClose }) {
  const now = new Date();
  const [shown, setShown] = useState({ year: value.getFullYear(), month: value.getMonth() });
  // Opening again starts at the selected day's month
  useEffect(() => {
    if (visible) setShown({ year: value.getFullYear(), month: value.getMonth() });
  }, [visible]);

  const { year, month } = shown;
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={s.head}>
        <Touch style={s.nav} onPress={() => setShown(shiftMonth(year, month, -1))} accessibilityLabel="Предишен месец">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Touch>
        <Text style={s.title} accessibilityRole="header">
          {MONTHS[month]} {year}
        </Text>
        <Touch
          style={[s.nav, isCurrentMonth && { opacity: 0.3 }]}
          disabled={isCurrentMonth}
          onPress={() => setShown(shiftMonth(year, month, 1))}
          accessibilityLabel="Следващ месец"
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Touch>
      </View>
      <View style={s.grid}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={[s.cell, s.weekday]}>
            {d}
          </Text>
        ))}
        {cells.map((d, i) => {
          if (!d) return <View key={`e${i}`} style={s.cell} />;
          const date = new Date(year, month, d);
          const future = date > now;
          const active = sameDay(date, value);
          const today = sameDay(date, now);
          return (
            <Touch
              key={d}
              haptic="select"
              disabled={future}
              onPress={() => {
                onSelect(date);
                onClose();
              }}
              style={[s.cell, s.day, active && s.active, today && !active && s.today, future && { opacity: 0.3 }]}
              accessibilityLabel={`${d} ${MONTHS[month].toLowerCase()} ${year}`}
              accessibilityState={{ selected: active, disabled: future }}
            >
              <Text style={[s.dayText, active && { color: colors.onAccent, fontWeight: '800' }]}>{d}</Text>
            </Touch>
          );
        })}
      </View>
    </Sheet>
  );
}

const s = themed((c) => ({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  nav: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
  title: { color: c.text, fontSize: 18, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' },
  weekday: { color: c.muted, fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 44 },
  day: { borderRadius: radius.badge },
  active: { backgroundColor: c.primary },
  today: { borderWidth: 1.5, borderColor: c.primary },
  dayText: { color: c.text, fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
}));
