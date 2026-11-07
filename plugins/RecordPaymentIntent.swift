// Copied into the app target by plugins/withRecordPaymentIntent.js.
//
// "Запиши плащане": a Shortcuts action that records an Apple Pay payment without opening Pawket, so the
// Wallet "Transaction" automation works even while the iPhone is locked (iOS refuses "Open URLs" then).
// It does three things, all without starting React Native:
//   1. drops one JSON file per payment into the App Group; the app books them when it next comes to the
//      front (src/pendingPayments.js), with the category remembered for the merchant or guessed from it;
//   2. subtracts the amount from the widget's budget numbers, so "Свободни" and what's left of today's limit
//      are right straight away (the inputs come from liveBudgetProps in src/widget/widgetData.js);
//   3. posts a notification with the amount, the category and what is left for today;
//   4. when the shop can't be placed (no category remembered for it and no name rule matches, see
//      src/categoryGuess.js), puts Ванко in the Dynamic Island asking for a category, so the user knows
//      to open the payment. The rules come from categorizer.json, written by the app (writeCategorizer).
import ActivityKit
import AppIntents
import Foundation
import UserNotifications
import WidgetKit

// Keep in sync with src/pendingPayments.js and app.json (expo-widgets)
private let appGroup = "group.com.denis.pawket"
private let folderName = "PendingPayments"
private let timelineKey = "__expo_widgets_BudgetWidget_timeline"

// LiveActivityIntent: run from a locked phone, the action may still start the "pick a category" Live Activity
@available(iOS 17.0, *)
struct RecordPaymentIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Запиши плащане"
  static var description = IntentDescription("Записва плащане в Pawket, без да отваря приложението. Работи и при заключен телефон.")
  static var openAppWhenRun: Bool = false
  // A Wallet automation runs while the phone is locked; recording a payment must not wait for Face ID
  static var authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed

  // Text, so any format the Wallet trigger hands over works ("€8.83", "8,83 €")
  @Parameter(title: "Сума")
  var amount: String

  @Parameter(title: "Търговец")
  var merchant: String?

  static var parameterSummary: some ParameterSummary {
    Summary("Запиши \(\.$amount) от \(\.$merchant) в Pawket")
  }

  func perform() async throws -> some IntentResult {
    // Run by hand from Shortcuts there is no transaction, so the Wallet variables are empty: say so
    // instead of silently doing nothing
    guard let value = parseAmount(amount), value > 0 else { throw RecordPaymentError.noAmount }
    guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup) else {
      return .result()
    }
    let shop = (merchant ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    let id = UUID().uuidString
    try savePending(id: id, amount: amount, merchant: shop, in: container)
    let category = Categorizer.load(from: container)?.category(for: shop)
    let budget = updateWidget(spent: value, kind: category?.kind ?? .everyday)
    if category == nil { startPickActivity(paymentId: id, amount: value, merchant: shop, budget: budget) }
    await notify(amount: value, merchant: shop, categoryName: category?.name, placed: category != nil, budget: budget)
    return .result()
  }

  private func savePending(id: String, amount: String, merchant: String, in container: URL) throws {
    let folder = container.appendingPathComponent(folderName, isDirectory: true)
    try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    let payment: [String: String] = [
      "id": id,
      "amount": amount,
      "merchant": merchant,
      "date": ISO8601DateFormatter().string(from: Date()),
    ]
    let json = try JSONSerialization.data(withJSONObject: payment)
    // One file per payment: the app deletes the files it has read, so two writers never touch the same file.
    // Readable while locked (after the first unlock since boot), which is when automations run.
    try json.write(
      to: folder.appendingPathComponent("\(id).json"),
      options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication]
    )
  }

  // MARK: - Widget

  /// Subtracts the payment from every widget entry of this month and recomputes the budget texts with the
  /// same formula as dailyLimit in src/budget.js. Returns the numbers of the entry shown now, for the notification.
  private func updateWidget(spent: Double, kind: SpendKind) -> LiveBudget? {
    guard let defaults = UserDefaults(suiteName: appGroup),
          var entries = defaults.array(forKey: timelineKey) as? [[String: Any]] else { return nil }
    let month = monthKey(Date())
    let today = dayKey(Date())
    let now = Date().timeIntervalSince1970
    var current: LiveBudget?
    var currentProps: [String: Any]?
    for i in entries.indices {
      guard var props = entries[i]["props"] as? [String: Any],
            props["budMonth"] as? String == month,
            let room = number(props["budRoom"]), let reserve = number(props["budReserve"]),
            let total = number(props["budBudget"]), let days = number(props["budDays"]), days > 0 else { continue }
      // The payment is today's spending in the entries for today; later days start from the smaller room
      // As in dailyLimit: everyday spending counts against today's limit; rent and bills lower the limit without
      // counting as today's spending; money put into savings fills the 20% still to be put aside
      let spentBefore = number(props["budSpentToday"]) ?? 0
      let spentToday = kind == .everyday && props["budDay"] as? String == today ? spentBefore + spent : spentBefore
      let newReserve = kind == .savings ? max(0, reserve - spent) : reserve
      let b = LiveBudget(room: room - spent, reserve: newReserve, budget: total, days: days, spentToday: spentToday, props: props)
      props["budRoom"] = b.room
      props["budReserve"] = b.reserve
      props["budSpentToday"] = b.spentToday
      props["remainingLabel"] = b.free < 0 ? b.text("lblOver") : b.text("lblFree")
      props["remainingText"] = b.moneyShort(abs(b.free))
      props["remainingShort"] = b.shortAmount(b.free)
      props["leftRatio"] = max(0, min(1, b.free / max(b.budget, 1)))
      props["over"] = b.free < 0 ? 1 : 0
      props["perDayText"] = b.fill("tplPerDay", b.money(b.todayLimit))
      props["todayText"] = b.eatenSavings > 0
        ? b.fill("tplFromSavings", b.moneyShort(b.eatenSavings))
        : b.leftToday < 0
          ? b.fill("tplOverToday", b.limitMoney(-b.leftToday))
          : b.fill("tplToday", b.limitMoney(b.leftToday))
      props["todayOver"] = b.eatenSavings > 0 || b.leftToday < -0.005 ? 1 : 0
      entries[i]["props"] = props
      // The entry on screen now: the last one that has started
      if current == nil || seconds(entries[i]["timestamp"]) <= now { current = b }
      if currentProps == nil || seconds(entries[i]["timestamp"]) <= now { currentProps = props }
    }
    defaults.set(entries, forKey: timelineKey)
    WidgetCenter.shared.reloadAllTimelines()
    // Without this month's numbers (no income set) the texts and the dog still come from the widget
    if current == nil, let props = entries.last?["props"] as? [String: Any] {
      return LiveBudget(room: 0, reserve: 0, budget: 0, days: 0, spentToday: 0, props: props)
    }
    return current.map { LiveBudget(room: $0.room, reserve: $0.reserve, budget: $0.budget, days: $0.days, spentToday: $0.spentToday, props: currentProps ?? $0.props) }
  }

  // MARK: - Live Activity

  /// Ванко in the Dynamic Island: "Избери категория · 8,83 € · Магазин Мазалам", tapping opens that payment
  /// (pawket://review). Same layout and props as the app's activities (PawketActivity, activityEvent in
  /// src/widget/widgetData.js); the app takes it over, and ends it, once the payment has a category.
  private func startPickActivity(paymentId: String, amount: Double, merchant: String, budget: LiveBudget?) {
    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
    let format = budget ?? LiveBudget(room: 0, reserve: 0, budget: 0, days: 0, spentToday: 0, props: [:])
    let p = format.props
    let url = "pawket://review?id=\(paymentId)"
    // The small picture of the dog for the Dynamic Island (getPetImagePath(…, small) in nativeWidget.ios.js)
    let image = (p["petImage"] as? String ?? "").replacingOccurrences(of: ".png", with: "-sm.png")
    let props: [String: Any] = [
      "petName": p["petName"] as? String ?? "",
      "lookKey": p["lookKey"] as? String ?? "",
      "expression": p["expression"] as? String ?? "happy",
      "emoji": p["emoji"] as? String ?? "🐶",
      "petImage": image.hasSuffix("-sm.png") ? image : "",
      "kind": "pick",
      "symbol": "questionmark.circle.fill",
      "title": format.text("tplPickTitle", fallback: "Избери категория"),
      "value": Int((amount * 100).rounded()),
      "valueText": format.money(amount),
      "valueLabel": merchant,
      "color": "#FFC15E",
      "progress": -1,
      "timerEnd": 0,
      "detail": format.text("tplPickDetail", fallback: "Не познах магазина — докосни, за да избереш"),
      "actionUrl": url,
      "actionLabel": format.text("tplPickAction", fallback: "Избери"),
    ]
    guard let data = try? JSONSerialization.data(withJSONObject: props),
          let json = String(data: data, encoding: .utf8) else { return }
    let state = LiveActivityAttributes.ContentState(name: "PawketActivity", props: json)
    // One activity at a time, like the app does
    for activity in Activity<LiveActivityAttributes>.activities {
      Task { await activity.end(nil, dismissalPolicy: .immediate) }
    }
    _ = try? Activity.request(
      attributes: LiveActivityAttributes(url: url),
      content: .init(state: state, staleDate: Date().addingTimeInterval(8 * 3600)),
      pushType: nil
    )
  }

  // MARK: - Notification

  private func notify(amount: Double, merchant: String, categoryName: String?, placed: Bool, budget: LiveBudget?) async {
    let center = UNUserNotificationCenter.current()
    let settings = await center.notificationSettings()
    guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }
    // Without the widget's labels (no income set yet) the notification is in Bulgarian, like the action
    let format = budget ?? LiveBudget(room: 0, reserve: 0, budget: 0, days: 0, spentToday: 0, props: [:])
    let content = UNMutableNotificationContent()
    let title = format.fill("tplNotifTitle", format.money(amount), fallback: "Записах {0}")
    content.title = merchant.isEmpty ? title : "\(title) · \(merchant)"
    var lines: [String] = []
    if !placed {
      lines.append(format.text("tplNotifPick", fallback: "Не познах категорията — избери я в Pawket."))
    } else if let name = categoryName {
      lines.append(name)
    }
    if let b = budget, b.days > 0 {
      lines.append(b.eatenSavings > 0
        ? b.fill("tplNotifSavings", b.moneyShort(b.eatenSavings))
        : b.leftToday < 0
          ? b.fill("tplNotifOver", b.limitMoney(-b.leftToday))
          : b.fill("tplNotifToday", b.limitMoney(b.leftToday)))
    }
    // "Храна · Остават 14 € за днес."
    content.body = lines.joined(separator: " · ")
    content.sound = nil
    content.threadIdentifier = "pawket-payments"
    let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
    try? await center.add(request)
  }

  // Same as dayKey in src/pet/logic.js
  private func dayKey(_ date: Date) -> String {
    let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
    return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
  }

  private func monthKey(_ date: Date) -> String {
    let c = Calendar.current.dateComponents([.year, .month], from: date)
    return String(format: "%04d-%02d", c.year ?? 0, c.month ?? 0)
  }
}

private enum RecordPaymentError: Error, CustomLocalizedStringResourceConvertible {
  case noAmount

  var localizedStringResource: LocalizedStringResource {
    "Няма сума за записване. Автоматизацията получава сумата и магазина сама след плащане с Apple Pay — при ръчно пускане няма транзакция. За проба въведи сума на ръка."
  }
}

/// The daily-limit numbers after a payment (dailyLimit in src/budget.js), and the app's money format
/// (src/theme.js money / moneyShort).
private struct LiveBudget {
  let room: Double
  let reserve: Double
  let budget: Double
  let days: Double
  let spentToday: Double
  let props: [String: Any]

  var free: Double { room - reserve }
  // Set before today's spending: the money free this morning over the days left, today included
  var todayLimit: Double { days > 0 ? max(0, room + spentToday - reserve) / days : 0 }
  var leftToday: Double { todayLimit - spentToday }
  var eatenSavings: Double { min(reserve, max(0, reserve - room)) }
  var english: Bool { (number(props["fmtEn"]) ?? 0) == 1 }

  func text(_ key: String, fallback: String = "") -> String { props[key] as? String ?? fallback }

  func fill(_ key: String, _ value: String, fallback: String = "{0}") -> String {
    let template = props[key] as? String ?? fallback
    return template.replacingOccurrences(of: "{0}", with: value)
  }

  // 1240.5 → "1240,50 €" / "€1,240.50"; whole amounts without decimals
  func money(_ n: Double) -> String {
    let cents = Int((abs(n) * 100).rounded())
    let int = group(String(cents / 100))
    let dec = cents % 100
    let amount = dec == 0 ? int : "\(int)\(english ? "." : ",")\(String(format: "%02d", dec))"
    return withEuro(amount, negative: n <= -0.005)
  }

  // limitMoney in src/theme.js: with cents under 100 €, whole above — the way Home shows the limit
  func limitMoney(_ n: Double) -> String { abs(n) < 100 ? money(n) : moneyShort(n) }

  func moneyShort(_ n: Double) -> String {
    let v = n.rounded()
    return withEuro(group(String(Int(abs(v)))), negative: v < 0)
  }

  // The round lock-screen widget: 850, 1,2k, −42 (shortAmount in widgetData.js)
  func shortAmount(_ n: Double) -> String {
    let sign = n < 0 ? "−" : ""
    let v = abs(n)
    if v < 1000 { return "\(sign)\(Int(v.rounded()))" }
    let k: String
    if v < 10000 {
      let tenths = Int(floor(v / 100))
      k = tenths % 10 == 0 ? "\(tenths / 10)" : "\(tenths / 10)\(english ? "." : ",")\(tenths % 10)"
    } else {
      k = "\(Int(floor(v / 1000)))"
    }
    return "\(sign)\(k)k"
  }

  private func withEuro(_ amount: String, negative: Bool) -> String {
    let sign = negative ? "−" : ""
    return english ? "\(sign)€\(amount)" : "\(sign)\(amount)\u{00A0}€"
  }

  // Thousands: "," in English; a no-break space in Bulgarian, from five digits on
  private func group(_ int: String) -> String {
    if !english && int.count < 5 { return int }
    var out = ""
    for (i, ch) in int.reversed().enumerated() {
      if i > 0 && i % 3 == 0 { out.append(english ? "," : "\u{00A0}") }
      out.append(ch)
    }
    return String(out.reversed())
  }
}

private func number(_ v: Any?) -> Double? {
  (v as? NSNumber)?.doubleValue
}

// Timeline timestamps are milliseconds
private func seconds(_ v: Any?) -> Double {
  let t = number(v) ?? 0
  return t > 100_000_000_000 ? t / 1000 : t
}

/// "€12.50", "12,50 €", "1 234,56", "1,234.56" → 12.5 … (parseAmount in src/deeplink.js)
private func parseAmount(_ raw: String) -> Double? {
  var s = raw.filter { $0.isNumber || $0 == "." || $0 == "," }
  s = s.trimmingCharacters(in: CharacterSet(charactersIn: ".,"))
  let lastComma = s.lastIndex(of: ",")
  let lastDot = s.lastIndex(of: ".")
  if let c = lastComma, let d = lastDot {
    let decimal: Character = c > d ? "," : "."
    let thousands: Character = decimal == "," ? "." : ","
    s = s.filter { $0 != thousands }.replacingOccurrences(of: String(decimal), with: ".")
  } else if let sep = lastComma ?? lastDot {
    let parts = s.split(separator: s[sep], omittingEmptySubsequences: false)
    let tail = parts.last ?? ""
    if parts.count > 2 || tail.count == 3 {
      s = parts.joined()
    } else {
      s = parts.dropLast().joined() + "." + tail
    }
  }
  guard let n = Double(s) else { return nil }
  return (abs(n) * 100).rounded() / 100
}

@available(iOS 17.0, *)
struct PawketShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: RecordPaymentIntent(),
      phrases: ["Запиши плащане в \(.applicationName)", "Record a payment in \(.applicationName)"],
      shortTitle: "Запиши плащане",
      systemImageName: "creditcard"
    )
  }
}

/// How a payment counts in today's limit (dailyLimit in src/budget.js). A shop with no category counts as
/// everyday spending, like the app counts it as a want until one is picked.
private enum SpendKind { case everyday, fixed, savings }

// MARK: - Live Activity attributes

/// The same type as expo-widgets' LiveActivityAttributes (node_modules/expo-widgets/ios/Widgets/WidgetLiveActivity.swift),
/// which draws Pawket's activities in the widget extension: ActivityKit matches the two by name and fields.
struct LiveActivityAttributes: ActivityAttributes {
  var url: String?

  public struct ContentState: Codable, Hashable {
    var name: String
    var props: String
  }
}

// MARK: - Category

/// The app's category rules, read from categorizer.json (writeCategorizer in src/pendingPayments.js) and applied
/// like src/categoryGuess.js: the category the user picked for the merchant (exact name, then the name without
/// numbers and legal forms, then the same distinctive first word), else the first name rule that matches.
private struct Categorizer {
  let merchants: [String: String]
  let rules: [(id: String, words: [String])]
  let legal: Set<String>
  let processors: [String]
  let generic: Set<String>
  let names: [String: String]
  let buckets: [String: String]
  let fixed: Set<String>

  static func load(from container: URL) -> Categorizer? {
    guard let data = try? Data(contentsOf: container.appendingPathComponent("categorizer.json")),
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
    let rules = (json["rules"] as? [[Any]] ?? []).compactMap { rule -> (id: String, words: [String])? in
      guard rule.count == 2, let id = rule[0] as? String, let words = rule[1] as? [String] else { return nil }
      return (id, words)
    }
    return Categorizer(
      merchants: json["merchants"] as? [String: String] ?? [:],
      rules: rules,
      legal: Set(json["legal"] as? [String] ?? []),
      processors: json["processors"] as? [String] ?? [],
      generic: Set(json["generic"] as? [String] ?? []),
      names: json["names"] as? [String: String] ?? [:],
      buckets: json["buckets"] as? [String: String] ?? [:],
      fixed: Set(json["fixed"] as? [String] ?? [])
    )
  }

  func category(for merchant: String) -> (id: String, name: String?, kind: SpendKind)? {
    guard let id = remembered(merchant) ?? guess(merchant) else { return nil }
    let kind: SpendKind = buckets[id] == "savings" ? .savings : fixed.contains(id) ? .fixed : .everyday
    return (id, names[id], kind)
  }

  private func exactKey(_ m: String) -> String { m.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }

  private func replacing(_ s: String, chars: String) -> String {
    String(s.map { chars.contains($0) ? " " : $0 })
  }

  // merchantKey in categoryGuess.js: "LIDL BULGARIA EOOD*SOFIA 1234" → "lidl bulgaria sofia"
  private func merchantKey(_ m: String) -> String {
    var s = exactKey(m)
    for p in processors {
      if let r = s.range(of: "^\\Q\(p)\\E\\s*\\*\\s*", options: .regularExpression) {
        s.removeSubrange(r)
        break
      }
    }
    s = String(s.map { $0.isNumber ? " " : $0 })
    s = replacing(s, chars: "*_/\\|,.;:()\"'„“”#№-")
    return s.split(separator: " ").map(String.init).filter { !legal.contains($0) }.joined(separator: " ")
  }

  private func firstWord(_ key: String) -> String {
    let w = key.split(separator: " ").first.map(String.init) ?? ""
    return w.count >= 3 && !generic.contains(w) ? w : ""
  }

  private func remembered(_ merchant: String) -> String? {
    let exact = exactKey(merchant)
    if exact.isEmpty { return nil }
    if let id = merchants[exact] { return id }
    let key = merchantKey(merchant)
    if key.isEmpty { return nil }
    if let hit = merchants.first(where: { merchantKey($0.key) == key }) { return hit.value }
    let word = firstWord(key)
    if word.isEmpty { return nil }
    return merchants.first(where: { firstWord(merchantKey($0.key)) == word })?.value
  }

  // guessCategory in categoryGuess.js: a rule word at the start of any word of the name
  private func guess(_ merchant: String) -> String? {
    var name = replacing(exactKey(merchant), chars: "*_/\\|,;:()\"'„“”")
    name = " " + name.split(separator: " ").joined(separator: " ") + " "
    if name.trimmingCharacters(in: .whitespaces).count < 2 { return nil }
    return rules.first(where: { rule in rule.words.contains { name.contains(" \($0)") } })?.id
  }
}
