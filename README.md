# Pawket

A 50/30/20 expense tracker with a digital tamagotchi puppy (a Cavalier King Charles Spaniel). React Native (Expo SDK 57) for iPhone and Android. The app's UI is in Bulgarian.

## Features
- **Home**
  - Month picker, defaulting to the current month.
  - How much of the income is left and ≈ €/day until the end of the month.
  - "Income" and "Spent" cards, 50/30/20 bars.
  - The latest 10 payments or "All", grouped by day, with filters by bucket and category.
  - Details for every expense: where, what for, when and how it was paid. Delete.
- **The dog** (tamagotchi)
  - **Mood:** from the 50/30/20 score for the current month. Needs are measured against the whole month, wants against the days that have passed.
  - **Fullness:** drops over 72 hours. Fed by logging an expense or tapping "No spending today".
  - **Growth:** +10 XP per active day, plus a bonus for every closed month. Stages: Puppy → Young dog → Cavalier → Champion (with a crown).
  - **Advice:** the dog suggests what to improve, e.g. the pace of wants, growth compared to last month, frequent purchases at one merchant, subscriptions, the daily limit.
- **Statistics:** spending by category (donut), comparison with last month, per-category details, 50/30/20, "What to improve".
- **New expense / income** (an "Expense | Income" switch; the "Save" button is pinned to the bottom)
  - Expense: amount, merchant ("Where"), note ("What for"), date and category. The category is remembered per merchant.
  - **Custom categories:** a "New" tile in every part of 50/30/20 (name, icon, bucket). Managed from Settings.
  - **Income:** salary, bonus, freelance, gift, refund, other. Salary replaces the monthly income from Settings (it isn't counted twice); the rest are added to the month's budget. Tap the "Income" card on Home for the list.
- **Haptics** on button taps, category selection, switches, saving and deleting.
- **Apple Pay → entry:** a Shortcuts automation opens "New expense" with the amount and merchant filled in. A guide is in Settings.
- **Widgets:**
  - iOS home screen: small and medium (remaining budget, the dog, mood, 50/30/20 bars, "+" button).
  - iOS lock screen: circular (remaining as a gauge), rectangular (dog, mood, remaining, €/day) and an inline line above the clock.
  - Android home screen: remaining budget, the dog, bars and a "+" button (Android has no lock screen widgets).
- **Quick action:** long-press the app icon → "New expense".
- **Data:** stored locally (AsyncStorage). Old v1 data is migrated automatically.

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
Settings → "Entry after Apple Pay" shows the steps and the template:
```
pawket://add?source=applepay&amount=[Сума]&merchant=[Търговец]
```
`[Сума]` and `[Търговец]` are the Amount and Merchant variables of the Shortcuts transaction trigger, as named on an iPhone set to Bulgarian. Requires iOS 17+.

## Structure
```
App.js                        tabs, modals, deep links, widget sync
index.js                      entry point + Android widget task handler
src/theme.js                  design tokens, categories, money formatting
src/budget.js                 monthly summaries, 50/30/20 score (budgetScore)
src/store.js                  v2 data + migration from v1, actions
src/deeplink.js               pawket://add and amount parsing
src/pet/logic.js              mood, fullness, growth, closing months
src/pet/advice.js             the dog's advice
src/pet/petShapes.js, Pet.js  the SVG dog (+ SVG string for the Android widget and the icon)
src/screens/                  Home, Statistics, New expense, Settings, Onboarding, Apple Pay guide
src/components/               lists, sheets, PetCard, donut chart, UI primitives (ui/)
src/widget/                   widget data, iOS (expo-widgets), Android (react-native-android-widget)
plugins/                      local config plugins (UIScene lifecycle for iOS 27, removing the unused push entitlement)
```
