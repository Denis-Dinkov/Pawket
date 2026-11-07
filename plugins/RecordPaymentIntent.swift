// Copied into the app target by plugins/withRecordPaymentIntent.js.
//
// "Запиши плащане": a Shortcuts action that records an Apple Pay payment without opening Pawket, so the
// Wallet "Transaction" automation works even while the iPhone is locked (iOS refuses "Open URLs" then).
// It does three things, all without starting React Native:
//   1. drops one JSON file per payment into the App Group; the app books them when it next comes to the
//      front (src/pendingPayments.js), with the category remembered for the merchant or guessed from it;
//   2. subtracts the amount from the widget's budget numbers, so "Свободни" and the daily limit are right
//      straight away (the inputs come from liveBudgetProps in src/widget/widgetData.js);
//   3. posts a notification with the amount and what is left per day.
import AppIntents
import Foundation
import UserNotifications
import WidgetKit

// Keep in sync with src/pendingPayments.js and app.json (expo-widgets)
private let appGroup = "group.com.denis.pawket"
private let folderName = "PendingPayments"
private let timelineKey = "__expo_widgets_BudgetWidget_timeline"

@available(iOS 16.0, *)
struct RecordPaymentIntent: AppIntent {
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
    try savePending(amount: amount, merchant: shop, in: container)
    let budget = updateWidget(spent: value)
    await notify(amount: value, merchant: shop, budget: budget)
    return .result()
  }

  private func savePending(amount: String, merchant: String, in container: URL) throws {
    let folder = container.appendingPathComponent(folderName, isDirectory: true)
    try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    let id = UUID().uuidString
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
  private func updateWidget(spent: Double) -> LiveBudget? {
    guard let defaults = UserDefaults(suiteName: appGroup),
          var entries = defaults.array(forKey: timelineKey) as? [[String: Any]] else { return nil }
    let month = monthKey(Date())
    let now = Date().timeIntervalSince1970
    var current: LiveBudget?
    for i in entries.indices {
      guard var props = entries[i]["props"] as? [String: Any],
            props["budMonth"] as? String == month,
            let room = number(props["budRoom"]), let reserve = number(props["budReserve"]),
            let total = number(props["budBudget"]), let days = number(props["budDays"]), days > 0 else { continue }
      let b = LiveBudget(room: room - spent, reserve: reserve, budget: total, days: days, props: props)
      props["budRoom"] = b.room
      props["remainingLabel"] = b.free < 0 ? b.text("lblOver") : b.text("lblFree")
      props["remainingText"] = b.moneyShort(abs(b.free))
      props["remainingShort"] = b.shortAmount(b.free)
      props["leftRatio"] = max(0, min(1, b.free / max(b.budget, 1)))
      props["over"] = b.free < 0 ? 1 : 0
      props["perDayText"] = b.fill("tplPerDay", b.money(b.limit))
      props["todayText"] = b.eatenSavings > 0
        ? b.fill("tplFromSavings", b.moneyShort(b.eatenSavings))
        : b.fill("tplDay", b.moneyShort(b.limit))
      if b.eatenSavings > 0 { props["todayOver"] = 1 }
      entries[i]["props"] = props
      // The entry on screen now: the last one that has started
      if current == nil || seconds(entries[i]["timestamp"]) <= now { current = b }
    }
    defaults.set(entries, forKey: timelineKey)
    WidgetCenter.shared.reloadAllTimelines()
    return current
  }

  // MARK: - Notification

  private func notify(amount: Double, merchant: String, budget: LiveBudget?) async {
    let center = UNUserNotificationCenter.current()
    let settings = await center.notificationSettings()
    guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }
    // Without the widget's labels (no income set yet) the notification is in Bulgarian, like the action
    let format = budget ?? LiveBudget(room: 0, reserve: 0, budget: 0, days: 0, props: [:])
    let content = UNMutableNotificationContent()
    let title = format.fill("tplNotifTitle", format.money(amount), fallback: "Записах {0}")
    content.title = merchant.isEmpty ? title : "\(title) · \(merchant)"
    if let b = budget {
      content.body = b.eatenSavings > 0
        ? b.fill("tplNotifSavings", b.moneyShort(b.eatenSavings))
        : b.fill("tplNotifDay", b.moneyShort(b.limit))
    }
    content.sound = nil
    content.threadIdentifier = "pawket-payments"
    let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
    try? await center.add(request)
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

/// The daily-limit numbers after a payment, and the app's money format (src/theme.js money / moneyShort).
private struct LiveBudget {
  let room: Double
  let reserve: Double
  let budget: Double
  let days: Double
  let props: [String: Any]

  var free: Double { room - reserve }
  var limit: Double { days > 0 ? max(0, free) / days : 0 }
  var eatenSavings: Double { min(reserve, max(0, reserve - room)) }
  var english: Bool { (number(props["fmtEn"]) ?? 0) == 1 }

  func text(_ key: String) -> String { props[key] as? String ?? "" }

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

@available(iOS 16.0, *)
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
