#!/usr/bin/env node
// Raises the app version in app.json: the patch number by default (1.0.2 → 1.0.3), or the part given
// (node scripts/bump-version.js minor → 1.1.0, major → 2.0.0), or sets an exact one (… 1.4.0).
// Called by .githooks/pre-commit on every commit; the version shows at the bottom of Settings.
// Only the "version" line is rewritten, so the rest of app.json keeps its formatting.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'app.json');
const text = fs.readFileSync(file, 'utf8');
const current = JSON.parse(text).expo.version;
const [major, minor, patch] = current.split('.').map(Number);
const arg = process.argv[2] || 'patch';

let next;
if (/^\d+\.\d+\.\d+$/.test(arg)) next = arg;
else if (arg === 'major') next = `${major + 1}.0.0`;
else if (arg === 'minor') next = `${major}.${minor + 1}.0`;
else if (arg === 'patch') next = `${major}.${minor}.${patch + 1}`;
else {
  console.error(`Unknown part "${arg}": use patch, minor, major or an exact version like 1.4.0`);
  process.exit(1);
}

const updated = text.replace(/("version"\s*:\s*")[^"]*(")/, `$1${next}$2`);
if (JSON.parse(updated).expo.version !== next) {
  console.error('Could not find the version in app.json');
  process.exit(1);
}
fs.writeFileSync(file, updated);
console.log(`Pawket ${current} → ${next}`);
