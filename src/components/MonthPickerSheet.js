import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './ui/AppText';
import Sheet from './ui/Sheet';
import { colors, radius, MONTHS, moneyShort } from '../theme';
import { monthKey } from '../budget';
import Touch from './ui/Touch';

// Month picker: years with expenses, months with their totals
export default function MonthPickerSheet({ visible, onClose, expenses, year, month, onSelect }) {
  const now = new Date();
  const totals = useMemo(() => {
    const t = {};
    for (const e of expenses) {
      const d = new Date(e.date);
      const k = monthKey(d.getFullYear(), d.getMonth());
      t[k] = (t[k] || 0) + e.amount;
    }
    return t;
  }, [expenses]);

  const years = useMemo(() => {
    const ys = new Set([now.getFullYear()]);
    Object.keys(totals).forEach((k) => ys.add(Number(k.slice(0, 4))));
    return [...ys].sort((a, b) => b - a);
  }, [totals]);

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={s.title}>Избери месец</Text>
      {years.map((y) => (
        <View key={y} style={{ marginTop: 14 }}>
          <Text style={s.year}>{y}</Text>
          <View style={s.grid}>
            {MONTHS.map((name, m) => {
              const future = y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth());
              const active = y === year && m === month;
              const total = totals[monthKey(y, m)];
              return (
                <Touch
                  haptic="select"
                  key={m}
                  disabled={future}
                  onPress={() => {
                    onSelect(y, m);
                    onClose();
                  }}
                  style={[s.cell, active && s.active, future && { opacity: 0.35 }]}
                >
                  <Text style={[s.month, active && { color: '#fff' }]}>{name.slice(0, 3)}</Text>
                  <Text style={[s.total, active && { color: 'rgba(255,255,255,0.8)' }]}>{total ? moneyShort(total) : '—'}</Text>
                </Touch>
              );
            })}
          </View>
        </View>
      ))}
    </Sheet>
  );
}

const s = StyleSheet.create({
  title: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  year: { color: colors.muted, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '23%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.badge, paddingVertical: 12, alignItems: 'center' },
  active: { backgroundColor: colors.primary },
  month: { color: colors.text, fontSize: 14, fontWeight: '700' },
  total: { color: colors.muted, fontSize: 11, marginTop: 3 },
});
