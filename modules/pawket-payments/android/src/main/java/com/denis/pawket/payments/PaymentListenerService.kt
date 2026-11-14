package com.denis.pawket.payments

import android.app.Notification
import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject
import java.io.File
import java.util.UUID

/**
 * Keeps the notifications of the payment apps (Google Wallet, Revolut) as small JSON files while Pawket is
 * closed, even on a locked phone. Nothing is parsed here: the app reads the files the next time it comes to
 * the front and works out amount and shop in JavaScript (src/notificationPayments.js), with the same rules as
 * the iPhone. Notifications of every other app are ignored and never stored.
 */
class PaymentListenerService : NotificationListenerService() {
  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    val n = sbn ?: return
    if (n.packageName !in PAYMENT_APPS) return
    val notification = n.notification ?: return
    // Group summaries repeat what their children already said
    if (notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
    val extras = notification.extras ?: return
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
    val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
    val big = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString().orEmpty()
    val sub = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString().orEmpty()
    val body = if (big.length > text.length) big else text
    if (title.isBlank() && body.isBlank()) return
    // Android posts the same notification again when it's updated; one copy of the same content is enough
    val fingerprint = "${n.key}|$title|$body"
    synchronized(seen) {
      if (!seen.add(fingerprint)) return
      if (seen.size > 50) seen.remove(seen.first())
    }
    save(this, n.packageName, title, body, sub, n.postTime)
  }

  companion object {
    const val FOLDER = "PendingNotifications"

    // Google Wallet and Revolut; keep in sync with SOURCES in src/notificationPayments.js
    val PAYMENT_APPS = setOf("com.google.android.apps.walletnfcrel", "com.revolut.revolut")

    private val seen = LinkedHashSet<String>()

    fun folder(context: Context) = File(context.filesDir, FOLDER)

    fun save(context: Context, app: String, title: String, body: String, sub: String, time: Long) {
      try {
        val dir = folder(context)
        dir.mkdirs()
        val json = JSONObject()
          .put("app", app)
          .put("title", title)
          .put("text", body)
          .put("sub", sub)
          .put("time", time)
        // Written next to the final name and renamed, so the app never reads a half-written file
        val id = UUID.randomUUID().toString()
        val tmp = File(dir, "$id.tmp")
        tmp.writeText(json.toString())
        tmp.renameTo(File(dir, "$id.json"))
      } catch (_: Exception) {
        // nothing to do: this one payment is simply not recorded
      }
    }
  }
}
