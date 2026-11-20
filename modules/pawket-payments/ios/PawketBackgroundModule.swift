import ExpoModulesCore
import UIKit

// Asks iOS for extra time once the app goes to the background (about 30 seconds), so a chat reply that is
// still arriving can finish instead of the connection being cut when the app is suspended.
public class PawketBackgroundModule: Module {
  private var task: UIBackgroundTaskIdentifier = .invalid

  public func definition() -> ModuleDefinition {
    Name("PawketBackground")
    Function("begin") {
      DispatchQueue.main.async { self.begin() }
    }
    Function("end") {
      DispatchQueue.main.async { self.end() }
    }
  }

  private func begin() {
    guard task == .invalid else { return }
    // iOS calls this when the time is up; the task must end then or the app is killed
    task = UIApplication.shared.beginBackgroundTask(withName: "PawketChatReply") { [weak self] in self?.end() }
  }

  private func end() {
    guard task != .invalid else { return }
    UIApplication.shared.endBackgroundTask(task)
    task = .invalid
  }
}
