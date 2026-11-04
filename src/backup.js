// Backup to a file: the share sheet saves it anywhere (Files → iCloud Drive, Google Drive, e-mail),
// and the document picker reads it back.
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

export const backupAvailable = () => Platform.OS !== 'web';

const fileName = (d = new Date()) =>
  `pawket-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;

export async function shareBackup(backup) {
  const file = new File(Paths.cache, fileName());
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(backup));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Архив на Pawket' });
}

/**
 * Lets the user pick a backup file. Returns the parsed backup, null if cancelled,
 * or throws an Error with a user-facing message.
 */
export async function pickBackup() {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'public.json', '*/*'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return null;
  let parsed;
  try {
    parsed = JSON.parse(await new File(res.assets[0].uri).text());
  } catch {
    throw new Error('Файлът не може да се прочете. Избери архив, запазен от Pawket (.json).');
  }
  if (parsed?.app !== 'pawket' || !Array.isArray(parsed?.data?.expenses)) {
    throw new Error('Това не е архив на Pawket. Избери файл, запазен с „Запази архив“.');
  }
  return parsed;
}
