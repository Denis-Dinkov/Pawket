// The user's own API keys for the chat with the dog, one per provider ('anthropic' | 'google' | 'groq'). They live in
// the Keychain / Keystore (expo-secure-store), apart from the saved data, so they never end up in a backup file.
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const nameFor = (provider) => `pawket.key.${provider}`;
// The web preview has no secure storage; there the key stays in the browser's own storage
const WEB = Platform.OS === 'web';

export async function loadApiKey(provider) {
  try {
    return (WEB ? await AsyncStorage.getItem(nameFor(provider)) : await SecureStore.getItemAsync(nameFor(provider))) || null;
  } catch {
    return null;
  }
}

// A pasted key without what copying tends to add: spaces, line breaks, invisible characters, quotes
export const cleanApiKey = (text) => (text || '').replace(/[\s​-‍⁠﻿"'`“”‘’]/g, '');

export async function saveApiKey(provider, key) {
  const value = cleanApiKey(key);
  if (WEB) await AsyncStorage.setItem(nameFor(provider), value);
  else await SecureStore.setItemAsync(nameFor(provider), value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}

export async function removeApiKey(provider) {
  try {
    if (WEB) await AsyncStorage.removeItem(nameFor(provider));
    else await SecureStore.deleteItemAsync(nameFor(provider));
  } catch {
    // nothing stored
  }
}

// Anthropic keys start with "sk-ant-". Google's have changed shape over time ("AIza…", newer "AQ.…" with dots),
// so for them only an obviously broken paste is refused: too short, or with characters no key has.
// Whether a key really works is up to the provider: a wrong one gets a clear message on the first question.
export const looksLikeApiKey = (provider, text) => {
  const key = cleanApiKey(text);
  return provider === 'anthropic' ? /^sk-ant-[\w-]{20,}$/.test(key) : /^[\x21-\x7E]{20,}$/.test(key);
};
