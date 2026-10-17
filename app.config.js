// Settings live in app.json. Here we only drop the widget for builds signed with a free Apple ID:
// PAWKET_FREE=1 npx expo run:ios --device --configuration Release
// A free account can't sign an App Group, and the iOS widget doesn't work without one.
module.exports = ({ config }) => {
  if (process.env.PAWKET_FREE !== '1') return config;
  return {
    ...config,
    plugins: config.plugins.filter((p) => (Array.isArray(p) ? p[0] : p) !== 'expo-widgets'),
  };
};
