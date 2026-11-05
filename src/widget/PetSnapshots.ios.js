import React, { memo, useEffect, useRef, useState } from 'react';
import { View, PixelRatio } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { Directory, File } from 'expo-file-system';
import Pet from '../pet/Pet';
import { EXPRESSIONS } from '../pet/logic';
import { lookKey } from '../pet/outfit';
import { widgetsAvailable, getWidgetsDirectory, setPetImages } from './nativeWidget';

// Size of the hidden view (points). The dog fills the lower 70%, so a hat or crown isn't cut off at the top.
const VIEW = 160;
// Real pixel sizes of the saved pictures. Widgets and the Dynamic Island refuse big images
// (they draw a grey box instead), so these stay small: the widget shows the dog at ~60 pt,
// the Dynamic Island at 24–48 pt.
const WIDGET_PX = 192;
const ISLAND_PX = 120;
const EXPRESSION_KEYS = Object.keys(EXPRESSIONS);
// Each capture draws on the main thread; a pause between them keeps scrolling and animations smooth
const GAP_MS = 250;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Starts when JS is idle (or after the timeout at the latest), not in the middle of a launch or transition
const whenIdle = (fn) =>
  typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 0);

// captureRef's width/height are in points; this gives an exact pixel size
const px = (n) => n / PixelRatio.get();

async function save(ref, dir, name, size) {
  const tmp = await captureRef(ref, { format: 'png', result: 'tmpfile', width: px(size), height: px(size) });
  const dest = new File(dir, name);
  if (dest.exists) dest.delete();
  new File(tmp).moveSync(dest);
}

// Old pictures (another stage or outfit) are deleted, so the shared folder doesn't keep growing
function removeStale(dir, key) {
  try {
    for (const item of new Directory(dir).list()) {
      if (item instanceof File && item.name.startsWith('pet-') && !item.name.startsWith(`pet-${key}-`)) item.delete();
    }
  } catch {
    // not important
  }
}

/**
 * Renders every expression for the current stage and outfit off-screen and saves them as PNGs in the
 * shared App Group folder, where the widget and the Live Activity read them. onDone() — to refresh both.
 */
function PetSnapshots({ stageKey, head = null, neck = null, onDone }) {
  const refs = useRef({});
  const dir = getWidgetsDirectory();
  const key = stageKey ? lookKey(stageKey, { head, neck }) : null;
  // The look whose snapshots are saved; the hidden dogs unmount once that matches
  const [doneKey, setDoneKey] = useState(null);

  useEffect(() => {
    if (!widgetsAvailable || !dir || !key) return undefined;
    let cancelled = false;
    // Wait for the hidden dogs to render first
    const timer = setTimeout(() => whenIdle(async () => {
      if (cancelled) return;
      try {
        for (const expr of EXPRESSION_KEYS) {
          if (cancelled) return;
          await wait(GAP_MS);
          await save(refs.current[expr], dir, `pet-${key}-${expr}.png`, WIDGET_PX);
          await save(refs.current[expr], dir, `pet-${key}-${expr}-sm.png`, ISLAND_PX);
        }
        if (!cancelled) {
          setPetImages({ key, dir: dir.replace(/\/$/, '') });
          removeStale(dir, key);
          onDone?.();
          setDoneKey(key);
        }
      } catch {
        // Without snapshots the widget shows an emoji
      }
    }), 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dir, key, onDone]);

  if (!widgetsAvailable || !dir || !key || doneKey === key) return null;
  const dog = VIEW * 0.7;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: -10000, top: 0, flexDirection: 'row' }}>
      {EXPRESSION_KEYS.map((expr) => (
        <View
          key={expr}
          ref={(r) => (refs.current[expr] = r)}
          collapsable={false}
          style={{ width: VIEW, height: VIEW, alignItems: 'center', justifyContent: 'flex-end' }}
        >
          <Pet expression={expr} stage={stageKey} head={head} neck={neck} size={dog} grow={false} animate={false} />
        </View>
      ))}
    </View>
  );
}

// Main re-renders on every store change; the seven hidden dogs shouldn't
export default memo(PetSnapshots);
