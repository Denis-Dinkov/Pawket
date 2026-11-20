package com.denis.pawket.payments

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

/** What the app needs from the notification reader: whether it may read, the way to allow it, and the payments it kept. */
class PawketPaymentsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("PawketPayments")

    // Whether the user has given Pawket notification access
    Function("isEnabled") {
      val enabled = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners").orEmpty()
      val me = ComponentName(context, PaymentListenerService::class.java)
      enabled.split(":").any { ComponentName.unflattenFromString(it) == me }
    }

    // Opens the system screen where notification access is switched on
    Function("openSettings") {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    // The kept notifications, oldest first: [{ name, text }]. Their files stay until deletePending, which the app
    // calls once its saved data holds the payments, so a crash in between loses nothing
    Function("readPending") {
      val files = PaymentListenerService.folder(context).listFiles { f -> f.name.endsWith(".json") }.orEmpty()
      files.sortedBy { it.lastModified() }.mapNotNull { file ->
        val text = try { file.readText() } catch (_: Exception) { null }
        if (text == null) file.delete()
        text?.let { mapOf("name" to file.name, "text" to it) }
      }
    }

    Function("deletePending") { names: List<String> ->
      val dir = PaymentListenerService.folder(context)
      // Only the bare file name counts, so a name can't point outside the folder
      names.forEach { File(dir, File(it).name).delete() }
    }
  }
}
