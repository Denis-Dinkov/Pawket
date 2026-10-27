#!/bin/zsh
# Builds Pawket (Release, free Apple ID) and installs it on the iPhone over cable or Wi-Fi.
# A free Apple ID signs apps for 7 days only, so launchd runs this every few hours
# (see scripts/phone-auto-setup.sh). It reinstalls only when needed:
#   - the signing profile expires in less than 3 days, or
#   - the code changed since the last install, or
#   - FORCE=1 is set.
# If the phone isn't reachable (Mac and iPhone on different networks), it quietly does nothing.
set -euo pipefail

export PATH="$HOME/.npm-global/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export LANG=en_US.UTF-8 PAWKET_FREE=1

ROOT="${0:A:h:h}"
DEVICE="${PAWKET_DEVICE:-00008130-000E1CC002C2001C}"
BUNDLE_ID="com.denis.pawket"
STATE_DIR="$HOME/Library/Application Support/Pawket"
STAMP="$STATE_DIR/installed-revision"
PROFILES="$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"
mkdir -p "$STATE_DIR"
cd "$ROOT"

log() { print -r -- "$(date '+%F %T') $*"; }

if ! xcrun devicectl list devices 2>/dev/null | grep "$DEVICE" | grep -qE 'available|connected'; then
  log "iPhone $DEVICE not reachable, skipping"
  exit 0
fi

# Profile for our bundle id and how many seconds it has left (0 if none)
profile_file="" ; seconds_left=0
for f in "$PROFILES"/*.mobileprovision(N); do
  plist=$(security cms -D -i "$f" 2>/dev/null) || continue
  appid=$(plutil -extract Entitlements.application-identifier raw -o - - <<<"$plist" 2>/dev/null) || continue
  [[ "$appid" == *".$BUNDLE_ID" ]] || continue
  expires=$(plutil -extract ExpirationDate raw -o - - <<<"$plist")
  left=$(( $(date -j -u -f '%Y-%m-%dT%H:%M:%SZ' "$expires" +%s) - $(date +%s) ))
  if (( left > seconds_left )); then profile_file="$f"; seconds_left=$left; fi
done

revision="$(git rev-parse HEAD)-$(git status --porcelain -- . ':!ios' ':!android' | shasum | cut -c1-12)"
reason=""
if [[ "${FORCE:-0}" == 1 ]]; then reason="forced"
elif (( seconds_left < 3 * 86400 )); then reason="profile expires in $(( seconds_left / 3600 ))h"
elif [[ "$(cat "$STAMP" 2>/dev/null)" != "$revision" ]]; then reason="code changed"
fi
if [[ -z "$reason" ]]; then
  log "up to date, profile valid for $(( seconds_left / 86400 )) more days"
  exit 0
fi
log "reinstalling: $reason"

# Remove the nearly expired profile so Xcode asks Apple for a fresh 7-day one
if [[ -n "$profile_file" ]] && (( seconds_left < 3 * 86400 )); then
  rm -f "$profile_file"
fi

if [[ ! -d ios || app.json -nt ios/Pawket.xcodeproj/project.pbxproj || package.json -nt ios/Podfile.lock ]]; then
  log "regenerating ios/"
  npx expo prebuild --platform ios --clean
fi

xcodebuild -workspace ios/Pawket.xcworkspace -scheme Pawket -configuration Release \
  -destination "id=$DEVICE" -derivedDataPath ios/build -allowProvisioningUpdates -quiet build

xcrun devicectl device install app --device "$DEVICE" ios/build/Build/Products/Release-iphoneos/Pawket.app
print -r -- "$revision" > "$STAMP"
log "installed"
