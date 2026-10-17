import { Platform } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);

// The Android widget is rendered by a headless task, even when the app isn't running
if (Platform.OS === 'android') {
  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    registerWidgetTaskHandler(require('./src/widget/android/widgetTaskHandler').default);
  } catch {
    // Expo Go: no native widget module
  }
}
