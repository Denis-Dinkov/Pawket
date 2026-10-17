import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput } from './ui/AppText';
import Sheet from './ui/Sheet';
import IconBadge from './ui/IconBadge';
import Segmented from './ui/Segmented';
import Touch from './ui/Touch';
import { colors, radius, BUCKETS, CATEGORY_ICONS, tint } from '../theme';

const BUCKET_OPTIONS = Object.entries(BUCKETS).map(([key, b]) => ({ key, label: b.label }));

// New custom category: name, 50/30/20 bucket and icon
export default function NewCategorySheet({ visible, initialBucket = 'wants', onClose, onCreate }) {
  const [name, setName] = useState('');
  const [bucket, setBucket] = useState(initialBucket);
  const [icon, setIcon] = useState(CATEGORY_ICONS[0]);

  useEffect(() => {
    if (visible) {
      setName('');
      setBucket(initialBucket);
      setIcon(CATEGORY_ICONS[0]);
    }
  }, [visible, initialBucket]);

  const color = BUCKETS[bucket].color;
  const valid = name.trim().length > 0;

  const create = () => valid && onCreate({ name, icon, bucket });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      footer={
        <Touch haptic="success" disabled={!valid} onPress={create} style={[s.save, !valid && { opacity: 0.3 }]}>
          <Text style={s.saveText}>Създай категория</Text>
        </Touch>
      }
    >
      <Text style={s.title}>Нова категория</Text>

      <View style={s.preview}>
        <IconBadge icon={icon} color={color} size={56} solid />
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Име, напр. Кафе"
          placeholderTextColor={colors.muted}
          style={s.name}
          maxLength={24}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={create}
          accessibilityLabel="Име на категорията"
        />
      </View>

      <Text style={s.label}>Към коя част от 50/30/20?</Text>
      <Segmented options={BUCKET_OPTIONS} value={bucket} onChange={setBucket} />

      <Text style={s.label}>Икона</Text>
      <View style={s.grid}>
        {CATEGORY_ICONS.map((ic) => (
          <Touch
            key={ic}
            haptic="select"
            onPress={() => setIcon(ic)}
            style={[s.icon, ic === icon && { borderColor: color, backgroundColor: tint(color, 0.1) }]}
          >
            <IconBadge icon={ic} color={color} size={34} solid={ic === icon} />
          </Touch>
        ))}
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  title: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.card, padding: 14, marginTop: 16 },
  name: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: '700', color: colors.text, paddingVertical: 6 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  icon: { width: '11.4%', minWidth: 40, aspectRatio: 1, borderRadius: 14, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  save: { backgroundColor: colors.ink, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
