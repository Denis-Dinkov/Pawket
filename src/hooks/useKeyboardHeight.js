import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';

/**
 * How much of the screen the keyboard covers, for screens to leave that room at the bottom themselves.
 * iOS: KeyboardAvoidingView gets the offset wrong inside a pageSheet modal.
 * Android: the app draws edge to edge, and full-screen modals are not resized for the keyboard, so the
 * keyboard would cover the field being typed in. Where Android does shrink the window, only the part the
 * shrinking didn't already make room for is returned, so the room is never left twice.
 */
export default function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    if (!ios && Platform.OS !== 'android') return undefined;
    const fullHeight = Dimensions.get('window').height;
    const covered = (e) => {
      if (ios) return e.endCoordinates.height;
      // From the keyboard's top edge to the bottom of the screen: Android's reported height leaves out the
      // navigation bar below the keyboard, which the edge-to-edge app draws under too
      const kb = Math.max(e.endCoordinates.height, Dimensions.get('screen').height - e.endCoordinates.screenY);
      // Android: what the window already gave up for the keyboard, if anything
      const shrunk = Math.max(0, fullHeight - Dimensions.get('window').height);
      return Math.max(0, kb - shrunk);
    };
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setHeight(covered(e)));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}
