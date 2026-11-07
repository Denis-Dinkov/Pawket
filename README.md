# Pawket

A 50/30/20 expense tracker with a digital tamagotchi puppy (a Cavalier King Charles Spaniel). React Native (Expo SDK 57) for iPhone and Android. The app's UI is in Bulgarian.

## Features
- **Home**
  - Charlie's room on top: the dog, a speech bubble with the most important advice, and chips for mood, fullness and level. The room shows his state too: an empty bowl when he's hungry, a dark window at night.
  - One money card without scrolling: what's free to spend this month (income minus spending, savings, recurring payments still due and the part of the 20% not saved yet — the same money the daily limit spreads over the days left), **the limit per day** (what's free ÷ the days left, today included; recalculated after every expense, so a big purchase lowers it for every day left; rent and bills lower it too but never count as going over it). Spending by the limit leaves 20% of the income for savings at the end of the month. Tapping the limit opens a short explanation with the user's own numbers, one 50/30/20 bar with "X of Y €" per part, income and spent.
  - Below it: the next recurring payment and a goal, this week's missions, the latest expenses. The order and visibility are set with "Подреди началото".
  - When scrolling, the room shrinks into a header bar with the dog, so he's always visible.
  - Month picker, defaulting to the current month.
- **New expense / income**
  - The app's own keypad: the amount first, then the most used categories (one tap), "Всички" for the full 50/30/20 grid, "Where", "What for", date.
  - "Всеки месец" turns the expense into a recurring payment.
  - **Editing:** "Редактирай" in an expense's details opens the same screen.
  - **Undo:** deleting is immediate, and a toast offers "Отмени" for 5 seconds.
  - Custom categories, income kinds (salary replaces the monthly income; the rest are added) as before.
- **Plans** (tab)
  - **Savings goals:** name, icon, amount and an optional deadline (with "≈ X € per month"). "Сложи пари" books an expense in "Savings", so it counts towards the 20%.
  - **Recurring payments:** booked automatically on their day each month (the last day in shorter months). Change the amount or day, pause or remove.
- **Charlie** (tab)
  - The streak (days with an entry) for this week, three weekly missions (+25 XP each), rewards (collar, bandana, bow tie, party hat, sunglasses) unlocked by habits and worn by the dog, growth stages, advice.
  - **Year in review:** the best month, average score, top category and merchant, most expensive month, longest streak. Also in "Отчети".
- **The dog** (tamagotchi): mood from the 50/30/20 score, fullness that drops over 72 hours, XP per active day and per closed month, stages Puppy → Young dog → Cavalier → Champion.
- **Reports:** spending by category (donut), comparison with last month, days, weekdays, merchants, 50/30/20, "What to improve".
- **Settings:** monthly income, the dog's name, custom categories, theme (system / light / dark), the evening reminder, backup.
- **Evening reminder:** a local notification at 19–22 h, only on days without an entry, with "Без разходи днес" and "Запиши разход" buttons. Permission is asked when it's turned on.
- **Backup:** "Запази архив" shares a JSON file (save it to Files → iCloud Drive or Google Drive); "Възстанови" reads it back.
- **Accessibility:** all text has at least 4.5:1 contrast in both themes, the minimum font size is 11 pt, text follows the system size up to 200%, VoiceOver labels on bars, charts, rows and the dog, Reduce Motion stops the dog's animation.
- **Apple Pay → entry:** a Shortcuts automation records every payment by itself, even on a locked phone, and Pawket highlights the new ones. A guide is in Settings.
- **Widgets:** iOS home and lock screen, Android home screen. The medium one has quick-add buttons for the three most used categories (one tap opens "New expense" with the category picked) and the next recurring payment.
- **No-spend day:** a challenge started on Home on a day with nothing spent yet. It runs until midnight; any needs or wants expense that day breaks it. Kept (and started before noon): +20 XP.
- **Savings alert:** the first time in a day that spending eats into the savings the daily limit keeps, a notification says so right away (a message in the app when notifications aren't allowed). Can be turned off in Settings.
- **Dynamic Island (Live Activity):** Charlie appears only while something is happening, most important first: a no-spend day (countdown to midnight, "Stop"), spending from the savings today, spending that pushed the limit down (today's spending past this morning's limit), a recurring payment due today (or tomorrow, from 18:00), the last 3 days of the month. Nothing happening, no activity. iOS lets an app start one only while it's open, so the automatic ones appear after the app is opened that day. A swiped-away one doesn't come back for the same event. It can be turned off in Settings.
- **Quick action:** long-press the app icon → "New expense".
- **Data:** stored locally (AsyncStorage). Old data is migrated automatically.

## Getting started

### Quick preview (no widgets or Apple Pay)
```bash
npm install
npm run go        # Expo Go: scan the QR code with your phone
npm run web       # in the browser
```

### Full app (dev build)
Widgets, the Apple Pay entry and quick actions need a native build.

- **iOS:** full Xcode from the App Store and CocoaPods. If CocoaPods is installed for the user only (`gem install --user-install cocoapods`), add it to PATH:
  ```bash
  export PATH="$HOME/.gem/ruby/2.6.0/bin:$PATH" LANG=en_US.UTF-8
  ```
  - The widget on a real iPhone needs a paid Apple Developer account, because App Groups aren't available with a free Apple ID.
  - In the simulator the widget works without one.
  ```bash
  npx expo run:ios            # simulator
  npx expo run:ios --device   # connected iPhone
  ```
- **Android:** Android Studio (or `eas build -p android --profile preview` for an APK).
  ```bash
  npx expo run:android
  ```

The `ios/` and `android/` folders are generated from `app.json` (`npx expo prebuild`) and aren't committed. Don't edit them by hand.

### Testing the deep link in the simulator
```bash
xcrun simctl openurl booted "pawket://add?source=applepay&amount=12,50&merchant=Lidl"
```

## Installing on your own iPhone (free Apple ID)
A Release build that runs without the Mac. A free Apple ID can't sign an App Group, so the widget is left out (`PAWKET_FREE=1`, see `app.config.js`). Everything else works.

One-time setup:
1. Xcode → Settings → Accounts → "+" → Apple ID → sign in.
2. Connect the iPhone with a cable and tap "Trust".
3. On the iPhone: Settings → Privacy & Security → Developer Mode → turn on (it restarts).

Install:
```bash
npm run phone:prepare
```
```bash
npm run phone
```
When asked for a device, pick the iPhone; when asked for a team, pick your "Personal Team".

On first launch on the phone: Settings → General → VPN & Device Management → your Apple ID → Trust.

A free Apple ID signature lasts 7 days. Then run `npm run phone` again; your data is kept.

To go back to the version with widgets (paid account or simulator): `npx expo prebuild --platform ios --clean`.

## Apple Pay automation
Settings → "Entry after Apple Pay" shows the steps. The Wallet "Transaction" automation runs Pawket's
**„Запиши плащане“** action (an App Intent, `plugins/RecordPaymentIntent.swift`, added by `plugins/withRecordPaymentIntent.js`) with the trigger's Amount and
Merchant. It doesn't open the app, so it also works while the iPhone is locked (iOS refuses "Open URLs" then).
Each payment lands as a JSON file in the App Group (`group.com.denis.pawket/PendingPayments`); the next time
Pawket comes to the front it books them (`src/pendingPayments.js`), with the category remembered for the
merchant or guessed from its name (`src/categoryGuess.js`: Lidl → groceries, OMV → transport…), and
highlights them until they are opened. Merchants nothing matches are booked without a category.
The action also subtracts the payment from the widget's budget straight away (the inputs come from
`liveBudgetProps` in `src/widget/widgetData.js`) and posts a notification with what's left per day.

The older way still works on an unlocked phone — "Open URLs" with:
```
pawket://add?source=applepay&amount=[Сума]&merchant=[Търговец]
```
`[Сума]` and `[Търговец]` are the Amount and Merchant variables of the Shortcuts transaction trigger, as named on an iPhone set to Bulgarian. Requires iOS 17+.

## Structure
```
App.js                        tabs, theme (light/dark), modals, deep links, reminders, widget + Live Activity sync
index.js                      entry point + Android widget task handler
src/theme.js                  light/dark palettes, categories, money formatting
src/themed.js                 style sheets that follow the live palette
src/motion.js                 shared animation timings, rolling numbers, Reduce Motion
src/budget.js                 monthly summaries, 50/30/20 score, today's limit (keeps the savings)
src/sessions.js               the no-spend day
src/plans.js                  recurring payments, goals, sinking funds, emergency fund, wishlist, forecast
src/store.js                  saved data + migration, actions, undo, weekly missions
src/reminders.js, backup.js   evening notification, savings alert, backup file
src/yearReview.js             the year in review
src/pet/                      the dog: logic, advice, speech lines, missions and rewards, SVG shapes
src/screens/                  Home, Reports, Plans, Charlie, New expense, Settings, Onboarding, Apple Pay guide
src/components/               the room, sheets, lists, toast, charts, UI primitives (ui/)
src/widget/                   widget data, the Live Activity's events, iOS widget + Live Activity (expo-widgets), Android widget
plugins/                      local config plugins (UIScene lifecycle for iOS 27, removing the push entitlement)
```

### Automatic reinstall
A free Apple ID signs the app for 7 days only. To keep it working without reinstalling by hand:
```bash
npm run phone:auto
```
This adds a background job on the Mac (every 15 minutes and at login) that rebuilds the app when the signature has less than 3 days left or the code changed, and installs it over Wi-Fi on every iPhone in the signing profile (every phone the app was installed on from this Mac). A phone that is away gets the new build the next time it is on the same network as the Mac, which has to happen at least once every few days. To add a phone that isn't in the profile, connect it once and run `PAWKET_DEVICES=<udid> npm run phone:update`. Log: `~/Library/Logs/pawket-phone.log`. Install right now: `npm run phone:update`.
