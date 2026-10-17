import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Keyboard height (iOS only). KeyboardAvoidingView gets the offset wrong
 * inside a pageSheet modal, so screens leave room at the bottom themselves.
 * On Android the window resizes by itself (adjustResize) and the hook returns 0.
 */
export default function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;
    const show = Keyboard.addListener('keyboardWillShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}
