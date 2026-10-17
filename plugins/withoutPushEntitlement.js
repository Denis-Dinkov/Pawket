// expo-widgets always adds aps-environment, but the app doesn't use push notifications.
// A free Apple ID can't sign an app with the push entitlement, so we remove it.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });
};
