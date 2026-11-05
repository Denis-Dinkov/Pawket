import { StyleSheet } from 'react-native';
import { colors, themeVersion } from './theme';

/**
 * A style sheet that follows the live palette.
 * Use it like StyleSheet.create: `const s = themed((c) => ({ title: { color: c.text } }))`, then `s.title`.
 * The styles are rebuilt on the first access after the palette changes (light ↔ dark).
 */
export function themed(build) {
  let builtFor = -1;
  let styles = null;
  const current = () => {
    if (builtFor !== themeVersion()) {
      styles = StyleSheet.create(build(colors));
      builtFor = themeVersion();
    }
    return styles;
  };
  return new Proxy({}, { get: (_, key) => current()[key] });
}
