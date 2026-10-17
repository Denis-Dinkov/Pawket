import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { File } from 'expo-file-system';
import Pet from '../pet/Pet';
import { EXPRESSIONS } from '../pet/logic';
import { widgetsAvailable, getWidgetsDirectory, setPetImages } from './nativeWidget';

const SIZE = 160;
const EXPRESSION_KEYS = Object.keys(EXPRESSIONS);

/**
 * Renders every expression for the current stage off-screen and saves them as PNGs in the shared
 * App Group folder, where the iOS widget reads them. onDone() — to refresh again.
 */
export default function PetSnapshots({ stageKey, onDone }) {
  const refs = useRef({});
  const dir = getWidgetsDirectory();

  useEffect(() => {
    if (!widgetsAvailable || !dir || !stageKey) return undefined;
    let cancelled = false;
    // Wait for the hidden dogs to render first
    const timer = setTimeout(async () => {
      try {
        for (const expr of EXPRESSION_KEYS) {
          const tmp = await captureRef(refs.current[expr], { format: 'png', result: 'tmpfile', width: SIZE, height: SIZE });
          const dest = new File(dir, `pet-${stageKey}-${expr}.png`);
          if (dest.exists) dest.delete();
          new File(tmp).moveSync(dest);
        }
        if (!cancelled) {
          setPetImages({ stageKey, dir: dir.replace(/\/$/, '') });
          onDone?.();
        }
      } catch {
        // Without snapshots the widget shows an emoji
      }
    }, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dir, stageKey, onDone]);

  if (!widgetsAvailable || !dir) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: -10000, top: 0, flexDirection: 'row' }}>
      {EXPRESSION_KEYS.map((expr) => (
        <View key={expr} ref={(r) => (refs.current[expr] = r)} collapsable={false} style={{ width: SIZE, height: SIZE }}>
          <Pet expression={expr} stage={stageKey} size={SIZE} animate={false} />
        </View>
      ))}
    </View>
  );
}
