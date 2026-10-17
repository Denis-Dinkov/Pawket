import * as Haptics from 'expo-haptics';

// Haptics aren't critical — errors (e.g. on web) are ignored
const KINDS = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  select: () => Haptics.selectionAsync(),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};

export const feedback = (kind = 'light') => {
  try {
    KINDS[kind]?.().catch(() => {});
  } catch {
    // no haptics on this platform
  }
};

export const tapFeedback = () => feedback('light');
export const successFeedback = () => feedback('success');
