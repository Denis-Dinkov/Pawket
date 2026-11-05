// Settings live in app.json.
// Builds signed with a free Apple ID (PAWKET_FREE=1, see scripts/phone-refresh.sh) used to drop the widget
// here, on the assumption that a free account can't sign an App Group. It can: the widget extension and its
// App Group sign fine with automatic signing, so every build now keeps the widgets and the Live Activity.
module.exports = ({ config }) => config;
