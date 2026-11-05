// Languages: Bulgarian (the source text) and English. No RN imports, so the pure modules can use it too.
//
// t('Bulgarian text') returns the text in the current language. The Bulgarian text is the key, and
// English comes from i18n/en.js (missing keys fall back to Bulgarian). Values are filled in by name:
// t('Остават {0}', { 0: money(left) }).
//
// The language is applied before the app renders (see Themed in App.js) and the screens are remounted
// on a change, the same way as the light / dark palette, so t() can be a plain function.
import en from './i18n/en';

export const LANGUAGES = ['bg', 'en'];
let lang = 'bg';

export const getLang = () => lang;
export function setLang(next) {
  lang = LANGUAGES.includes(next) ? next : 'bg';
}

// The phone's language: Bulgarian phones get Bulgarian, everything else English
export function systemLang() {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    return locale.toLowerCase().startsWith('bg') ? 'bg' : 'en';
  } catch {
    return 'bg';
  }
}

// 'system' | 'bg' | 'en' → 'bg' | 'en'
export const resolveLang = (pref) => (pref === 'bg' || pref === 'en' ? pref : systemLang());

const fill = (text, params) => (params ? text.replace(/\{(\w+)\}/g, (m, k) => (params[k] != null ? String(params[k]) : m)) : text);

export function t(text, params) {
  const out = lang === 'en' ? en[text] ?? text : text;
  return fill(out, params);
}

/**
 * A list of texts that is translated when read (e.g. month or weekday names defined at module level,
 * where a plain t() would run once, before the language is known). It behaves like an array.
 */
export const tList = (texts) =>
  new Proxy(texts, {
    get(arr, key, receiver) {
      if (typeof key === 'string' && /^\d+$/.test(key)) return arr[key] == null ? arr[key] : t(arr[key]);
      return Reflect.get(arr, key, receiver);
    },
  });
