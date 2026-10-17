import React, { forwardRef } from 'react';
import { Text as RNText, TextInput as RNTextInput, StyleSheet } from 'react-native';

// Onest has no "Bulgarian" letterforms (т → m, д → g), which the iOS system font applies
// to only some texts when the language is Bulgarian — this way the letters look the same everywhere.
// Each weight is a separate file, so fontWeight is turned into the matching fontFamily.
export const FONT_FAMILIES = {
  400: 'Onest_400Regular',
  500: 'Onest_500Medium',
  600: 'Onest_600SemiBold',
  700: 'Onest_700Bold',
  800: 'Onest_800ExtraBold',
};

function fontFor(style) {
  const { fontWeight } = StyleSheet.flatten(style) || {};
  const w = fontWeight === 'bold' ? 700 : Number(fontWeight) || 400;
  const key = Object.keys(FONT_FAMILIES).reduce((best, k) => (Math.abs(k - w) < Math.abs(best - w) ? k : best), 400);
  // fontWeight: 'normal' — otherwise iOS synthesizes bold on top of an already bold font
  return { fontFamily: FONT_FAMILIES[key], fontWeight: 'normal' };
}

export const Text = forwardRef(function Text({ style, ...rest }, ref) {
  return <RNText ref={ref} maxFontSizeMultiplier={1.3} style={[style, fontFor(style)]} {...rest} />;
});

export const TextInput = forwardRef(function TextInput({ style, ...rest }, ref) {
  return <RNTextInput ref={ref} maxFontSizeMultiplier={1.3} style={[style, fontFor(style)]} {...rest} />;
});
