#!/bin/zsh
# Installs a launchd job that runs scripts/phone-refresh.sh every 15 minutes (and at login),
# so the free 7-day signature on the iPhone gets renewed automatically. The short interval
# catches the moments the phone is unlocked near the Mac, which installing needs; runs with
# nothing to do finish in seconds.
# Remove with: launchctl bootout gui/$(id -u)/com.denis.pawket.refresh
set -euo pipefail

ROOT="${0:A:h:h}"
LABEL="com.denis.pawket.refresh"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/pawket-phone.log"
APP="$HOME/Applications/Pawket Refresh.app"
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Applications"

# macOS blocks background jobs from reading ~/Documents. A tiny app wrapper gets its own
# "allow access to Documents" prompt (answered once) instead of granting it to the whole shell.
rm -rf "$APP"
# "|| true" keeps failures in the log only, without an error dialog
osacompile -o "$APP" -e "do shell script \"/bin/zsh '$ROOT/scripts/phone-refresh.sh' >> '$LOG' 2>&1 || true\""

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>$APP/Contents/MacOS/applet</string></array>
  <key>StartInterval</key><integer>900</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Auto-refresh on. Log: $LOG"
