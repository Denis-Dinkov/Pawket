#!/bin/zsh
# Builds Pawket (Release, free Apple ID) and installs it on every iPhone in the signing profile,
# over cable or Wi-Fi. A free Apple ID signs apps for 7 days only, so launchd runs this every
# few hours (see scripts/phone-auto-setup.sh). It rebuilds only when needed:
#   - the signing profile expires in less than 3 days, or
#   - the code changed since the last build, or
#   - FORCE=1 is set.
# The build targets a generic iOS device, so no phone has to be connected or unlocked for it.
# Each phone gets the new build the next time it is reachable (same network as the Mac).
# Phones outside the profile can be added with PAWKET_DEVICES="udid1 udid2".
set -euo pipefail

export PATH="$HOME/.npm-global/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export LANG=en_US.UTF-8 PAWKET_FREE=1

ROOT="${0:A:h:h}"
BUNDLE_ID="com.denis.pawket"
STATE_DIR="$HOME/Library/Application Support/Pawket"
BUILT="$STATE_DIR/built-revision"
PROFILES="$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"
APP="ios/build/Build/Products/Release-iphoneos/Pawket.app"
mkdir -p "$STATE_DIR"
cd "$ROOT"

log() { print -r -- "$(date '+%F %T') $*"; }

# Newest profile for our bundle id: sets profile_file, profile_uuid, seconds_left, profile_devices
read_profile() {
  profile_file="" profile_uuid="" seconds_left=0 profile_devices=()
  local f plist appid expires left
  for f in "$PROFILES"/*.mobileprovision(N); do
    plist=$(security cms -D -i "$f" 2>/dev/null) || continue
    appid=$(plutil -extract Entitlements.application-identifier raw -o - - <<<"$plist" 2>/dev/null) || continue
    [[ "$appid" == *".$BUNDLE_ID" ]] || continue
    expires=$(plutil -extract ExpirationDate raw -o - - <<<"$plist")
    left=$(( $(date -j -u -f '%Y-%m-%dT%H:%M:%SZ' "$expires" +%s) - $(date +%s) ))
    (( left > seconds_left )) || continue
    profile_file="$f" seconds_left=$left
    profile_uuid=$(plutil -extract UUID raw -o - - <<<"$plist")
    profile_devices=(${(f)"$(plutil -extract ProvisionedDevices json -o - - <<<"$plist" | tr -d '[]"' | tr ',' '\n')"})
  done
}

read_profile
revision="$(git rev-parse HEAD)-$(git status --porcelain -- . ':!ios' ':!android' | shasum | cut -c1-12)"
reason=""
if [[ "${FORCE:-0}" == 1 ]]; then reason="forced"
elif (( seconds_left < 3 * 86400 )); then reason="profile expires in $(( seconds_left / 3600 ))h"
elif [[ "$(cat "$BUILT" 2>/dev/null)" != "$revision $profile_uuid" ]]; then reason="code changed"
fi

if [[ -n "$reason" ]]; then
  log "rebuilding: $reason"
  # Remove the nearly expired profile so Xcode asks Apple for a fresh 7-day one
  if [[ -n "$profile_file" ]] && (( seconds_left < 3 * 86400 )); then
    rm -f "$profile_file"
  fi
  if [[ ! -d ios || app.json -nt ios/Pawket.xcodeproj/project.pbxproj || package.json -nt ios/Podfile.lock ]]; then
    log "regenerating ios/"
    npx expo prebuild --platform ios --clean
  fi
  xcodebuild -workspace ios/Pawket.xcworkspace -scheme Pawket -configuration Release \
    -destination "generic/platform=iOS" -derivedDataPath ios/build \
    -allowProvisioningUpdates -quiet build
  read_profile
  print -r -- "$revision $profile_uuid" > "$BUILT"
else
  log "build up to date, profile valid for $(( seconds_left / 86400 )) more days"
fi

# Paired phones on the same network or cable; locked phones count too, since installing works without unlocking
reachable=(${(f)"$(xcrun devicectl list devices 2>/dev/null | grep -E ' (available|connected)' \
  | grep -E '\((iPhone|iPad)[0-9]+,[0-9]+\) +physical' | grep -oE '[0-9A-F]{8}-[0-9A-F]{16}' || true)"})

built=$(cat "$BUILT")
for device in ${(u)profile_devices} ${=PAWKET_DEVICES:-}; do
  stamp="$STATE_DIR/installed-$device"
  [[ "$(cat "$stamp" 2>/dev/null)" == "$built" ]] && continue
  if (( ! ${reachable[(Ie)$device]} )); then
    log "$device not reachable, will install later"
    continue
  fi
  if xcrun devicectl device install app --device "$device" "$APP" >/dev/null; then
    print -r -- "$built" > "$stamp"
    log "installed on $device"
  else
    log "install on $device failed"
  fi
done
