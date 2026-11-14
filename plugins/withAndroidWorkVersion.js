// The Android widget (react-native-android-widget) brings androidx.work:work-runtime-ktx 2.7.1, while Expo
// brings work-runtime 2.8.1. From 2.8 the ktx classes live in work-runtime itself, so both versions together
// fail the build with "Duplicate class androidx.work.OneTimeWorkRequestKt". Forcing ktx to the same version
// leaves one copy of each class.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARK = '// pawket: one androidx.work version';
const BLOCK = `
${MARK}
configurations.all {
    resolutionStrategy.force 'androidx.work:work-runtime-ktx:2.8.1'
}
`;

module.exports = (config) =>
  withAppBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes(MARK)) mod.modResults.contents += BLOCK;
    return mod;
  });
