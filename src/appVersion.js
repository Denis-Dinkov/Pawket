import Constants from 'expo-constants';
import { MONTHS, monthLower } from './theme';
import { timeLabel } from './format';
import { getLang } from './i18n';

/**
 * The installed version for the bottom of Settings: "1.0.0 · 83a05fa · 15 ноември, 10:30".
 * The commit and the build time come from app.config.js (extra.build); the time says which build is on the
 * phone even when the version number hasn't changed. A "+" after the commit: built with uncommitted changes.
 */
export function appVersion() {
  const config = Constants.expoConfig || {};
  const { commit, date } = config.extra?.build || {};
  const parts = [config.version || Constants.nativeAppVersion || '?'];
  if (commit) parts.push(commit);
  if (date) {
    const d = new Date(date);
    const day = getLang() === 'en' ? `${MONTHS[d.getMonth()]} ${d.getDate()}` : `${d.getDate()} ${monthLower(d.getMonth())}`;
    parts.push(`${day}, ${timeLabel(date)}`);
  }
  return parts.join(' · ');
}
