// Settings live in app.json.
// Builds signed with a free Apple ID (PAWKET_FREE=1, see scripts/phone-refresh.sh) used to drop the widget
// here, on the assumption that a free account can't sign an App Group. It can: the widget extension and its
// App Group sign fine with automatic signing, so every build now keeps the widgets and the Live Activity.
//
// extra.build: which code a build was made from, shown at the bottom of Settings (src/appVersion.js), so it's
// clear whether a phone has the latest version. Read when the app config is evaluated: by Metro in
// development, and by the "Generate app.config" build phase for a Release build, so it's the build's commit.
const { execSync } = require('child_process');

const git = (args) => {
  try {
    return execSync(`git ${args}`, { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
};

module.exports = ({ config }) => {
  const commit = git('rev-parse --short HEAD');
  // Built with changes not committed yet (phone-refresh.sh builds those too): marked so it isn't mistaken for the commit
  const dirty = git('status --porcelain -- . :!ios :!android') !== '';
  return {
    ...config,
    extra: {
      ...config.extra,
      build: { commit: commit ? `${commit}${dirty ? '+' : ''}` : null, date: new Date().toISOString() },
    },
  };
};
