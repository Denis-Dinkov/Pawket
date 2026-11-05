// expo-widgets and expo-notifications add aps-environment, but the app only uses local notifications.
// A free Apple ID can't sign an app with the push entitlement, so we remove it.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });
};
