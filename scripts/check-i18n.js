#!/usr/bin/env node
// Checks the English translations against the code: every Bulgarian text passed to t() or tList() must
// have an entry in src/i18n/en.js (the Bulgarian text is the key, so fixing a typo in it silently drops the
// translation). Also lists entries no code uses any more. Run: npm run check:i18n
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const enPath = path.join(root, 'src/i18n/en.js');
const en = vm.runInNewContext(`(${fs.readFileSync(enPath, 'utf8').replace(/^[\s\S]*?export default/, '').replace(/;\s*$/, '')})`);

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : files(p);
    return /\.js$/.test(e.name) && p !== enPath ? [p] : [];
  });
}

const STRING = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\$]|\\.)*)`/y;
const unescape = (s) => s.replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, '\n').replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

const used = new Map(); // key → first place it is used
const note = (key, where) => used.has(key) || used.set(key, where);

for (const file of [path.join(root, 'App.js'), ...files(path.join(root, 'src'))]) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);
  const lineOf = (i) => src.slice(0, i).split('\n').length;
  // t('…') with a literal first argument
  for (const m of src.matchAll(/(?<![\w.$])t\(\s*/g)) {
    STRING.lastIndex = m.index + m[0].length;
    const s = STRING.exec(src);
    if (s) note(unescape(s[1] ?? s[2] ?? s[3]), `${rel}:${lineOf(m.index)}`);
  }
  // tList([ '…', '…' ])
  for (const m of src.matchAll(/tList\(\s*\[([\s\S]*?)\]\s*\)/g)) {
    for (const s of m[1].matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) note(unescape(s[1]), `${rel}:${lineOf(m.index)}`);
  }
}

const cyrillic = /[А-Яа-я]/;
const missing = [...used].filter(([key]) => cyrillic.test(key) && !(key in en));
const unused = Object.keys(en).filter((key) => !used.has(key));

if (unused.length) {
  console.log(`${unused.length} translation(s) no code uses:`);
  unused.forEach((k) => console.log(`  - ${k}`));
}
if (missing.length) {
  console.error(`\n${missing.length} text(s) without an English translation:`);
  missing.forEach(([k, where]) => console.error(`  ${where}  ${k}`));
  process.exit(1);
}
console.log(`\nAll ${used.size} texts have an English translation.`);
