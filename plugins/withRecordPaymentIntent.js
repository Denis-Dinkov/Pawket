// Adds the "Запиши плащане" Shortcuts action (plugins/RecordPaymentIntent.swift) to the app target.
// It records Apple Pay payments without opening Pawket, so it also works while the iPhone is locked.
const fs = require('fs');
const path = require('path');
const { withDangerousMod, withXcodeProject, IOSConfig } = require('expo/config-plugins');

const FILE = 'RecordPaymentIntent.swift';

const withIntentFile = (config) =>
  withDangerousMod(config, [
    'ios',
    (mod) => {
      const dir = path.join(mod.modRequest.platformProjectRoot, mod.modRequest.projectName);
      fs.copyFileSync(path.join(__dirname, FILE), path.join(dir, FILE));
      return mod;
    },
  ]);

const withIntentInProject = (config) =>
  withXcodeProject(config, (mod) => {
    const name = mod.modRequest.projectName;
    const filepath = `${name}/${FILE}`;
    if (!mod.modResults.hasFile(filepath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({ filepath, groupName: name, project: mod.modResults });
    }
    return mod;
  });

module.exports = (config) => withIntentInProject(withIntentFile(config));
