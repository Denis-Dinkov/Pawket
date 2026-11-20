import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from './ui/AppText';
import Sheet from './ui/Sheet';
import Touch from './ui/Touch';
import Pill from './ui/Pill';
import { colors, money, radius, BUCKETS, monthLower } from '../theme';
import { PRESETS, validPercents } from '../split';
import { themed } from '../themed';
import { t } from '../i18n';

const KEYS = ['needs', 'wants', 'savings'];
const STEP = 5;
const clamp = (n) => Math.max(0, Math.min(100, n));

// One part of the split: − / the percent (tap to type) / +, and what it is in money
function PartRow({ k, value, income, onChange, autoFocus }) {
  const b = BUCKETS[k];
  const [text, setText] = useState(String(value));
  const focused = useRef(false);
  // Follows changes from the buttons and presets, but not while the user is typing in it
  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);
  return (
    <View style={s.row}>
      <View style={[s.dot, { backgroundColor: b.color }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.name}>{b.label}</Text>
        {income > 0 && <Text style={s.hint}>{money((income * value) / 100)}</Text>}
      </View>
      <Touch hitSlop={6} style={s.step} onPress={() => onChange(clamp(value - STEP))} accessibilityLabel={t('{0}: по-малко', { 0: b.label })}>
        <Ionicons name="remove" size={18} color={colors.text} />
      </Touch>
      <View style={[s.pctBox, { borderColor: b.color }]}>
        <TextInput
          value={text}
          onChangeText={(v) => {
            let digits = v.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 3);
            if (digits && parseInt(digits, 10) > 100) digits = '100';
            setText(digits);
            if (digits) onChange(parseInt(digits, 10));
          }}
          // Typing replaces the number rather than adding to it (selecting the text on focus isn't reliable
          // on every platform): the field empties, with the current value as its placeholder
          onFocus={() => {
            focused.current = true;
            setText('');
          }}
          onBlur={() => {
            focused.current = false;
            setText(String(value));
          }}
          placeholder={String(value)}
          placeholderTextColor={b.color}
          keyboardType="number-pad"
          autoFocus={autoFocus}
          maxLength={3}
          style={[s.pct, { color: b.color }]}
          accessibilityLabel={t('{0} в проценти', { 0: b.label })}
        />
        <Text style={[s.pctSign, { color: b.color }]}>%</Text>
      </View>
      <Touch hitSlop={6} style={s.step} onPress={() => onChange(clamp(value + STEP))} accessibilityLabel={t('{0}: повече', { 0: b.label })}>
        <Ionicons name="add" size={18} color={colors.text} />
      </Touch>
    </View>
  );
}

/**
 * Edits the split of income between needs, wants and savings. focus: the part whose percent was tapped,
 * so its field opens ready to type. Saving needs the three to make exactly 100%.
 */
export default function SplitSheet({ visible, onClose, current, income, focus, month, year, onSave }) {
  const [p, setP] = useState(current);
  useEffect(() => {
    if (visible) setP(current);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = p.needs + p.wants + p.savings;
  const ok = validPercents(p);
  const isPreset = (x) => KEYS.every((k) => x[k] === p[k]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      footer={
        <Pill
          variant="ink"
          label={ok ? t('Запази') : t('Общо {0}% — трябва да е 100%', { 0: total })}
          onPress={ok ? () => onSave(p) : undefined}
          style={[s.save, !ok && { opacity: 0.5 }]}
          textStyle={{ textAlign: 'center' }}
        />
      }
    >
      <Text style={s.title} accessibilityRole="header">{t('Разпределение на дохода')}</Text>
      <Text style={s.sub}>
        {t('Колко от дохода отива за нужди, желания и спестявания. Важи от {0} {1} нататък — миналите месеци пазят своето.', { 0: monthLower(month), 1: year })}
      </Text>

      <View style={s.presets}>
        {PRESETS.map((x) => {
          const label = `${x.needs}/${x.wants}/${x.savings}`;
          return <Pill key={label} small label={label} variant={isPreset(x) ? 'active' : 'outline'} onPress={() => setP(x)} />;
        })}
      </View>

      <View style={s.card}>
        {KEYS.map((k) => (
          <PartRow key={k} k={k} value={p[k]} income={income} autoFocus={focus === k} onChange={(v) => setP((prev) => ({ ...prev, [k]: v }))} />
        ))}
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>{t('Общо')}</Text>
          <Text style={[s.total, { color: ok ? colors.savings : colors.danger }]}>{total}%</Text>
        </View>
      </View>
      <Text style={s.hint}>
        {t('Дневният лимит пази частта за спестяване, а оценката и съветите на кучето следят новите граници.')}
      </Text>
    </Sheet>
  );
}

const s = themed((c) => ({
  title: { color: c.text, fontSize: 20, fontWeight: '800' },
  sub: { color: c.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  card: { backgroundColor: c.card, borderRadius: radius.card, padding: 16, gap: 12, marginTop: 16, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { color: c.text, fontSize: 15, fontWeight: '700' },
  hint: { color: c.muted, fontSize: 13, lineHeight: 18 },
  step: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.faint, alignItems: 'center', justifyContent: 'center' },
  pctBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderRadius: radius.field, paddingHorizontal: 8, minWidth: 66, justifyContent: 'center' },
  pct: { fontSize: 18, fontWeight: '800', paddingVertical: 8, minWidth: 30, textAlign: 'right', fontVariant: ['tabular-nums'] },
  pctSign: { fontSize: 16, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: c.faint, paddingTop: 12 },
  totalLabel: { color: c.text, fontSize: 15, fontWeight: '700' },
  total: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  save: { alignSelf: 'stretch', justifyContent: 'center', paddingVertical: 16 },
}));
