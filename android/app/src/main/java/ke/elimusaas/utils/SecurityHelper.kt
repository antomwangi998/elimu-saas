package ke.elimusaas.utils

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import java.io.File

object SecurityHelper {

    // ── Root Detection ─────────────────────────────────────────
    fun isRooted(): Boolean {
        val rootFiles = arrayOf(
            "/system/app/Superuser.apk", "/sbin/su", "/system/bin/su",
            "/system/xbin/su", "/data/local/xbin/su", "/data/local/bin/su",
            "/system/sd/xbin/su", "/system/bin/failsafe/su", "/data/local/su",
            "/su/bin/su"
        )
        return rootFiles.any { File(it).exists() }
    }

    // ── Emulator Detection ─────────────────────────────────────
    fun isEmulator(): Boolean {
        return (Build.FINGERPRINT.startsWith("generic") ||
                Build.FINGERPRINT.startsWith("unknown") ||
                Build.MODEL.contains("google_sdk") ||
                Build.MODEL.contains("Emulator") ||
                Build.MODEL.contains("Android SDK built for x86") ||
                Build.MANUFACTURER.contains("Genymotion") ||
                Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic") ||
                "google_sdk" == Build.PRODUCT)
    }

    // ── Brute Force Rate Limiting ──────────────────────────────
    private const val PREF_LOGIN = "elmu_sec"
    private const val KEY_ATTEMPTS = "login_attempts"
    private const val KEY_LOCKOUT  = "login_lockout"
    private const val MAX_ATTEMPTS = 5
    private const val LOCKOUT_MS   = 15 * 60 * 1000L // 15 min

    private fun prefs(ctx: Context): SharedPreferences =
        ctx.getSharedPreferences(PREF_LOGIN, Context.MODE_PRIVATE)

    fun isLockedOut(ctx: Context): Pair<Boolean, Long> {
        val p = prefs(ctx)
        val attempts = p.getInt(KEY_ATTEMPTS, 0)
        val lockout  = p.getLong(KEY_LOCKOUT, 0L)
        if (attempts >= MAX_ATTEMPTS) {
            val remaining = lockout + LOCKOUT_MS - System.currentTimeMillis()
            if (remaining > 0) return Pair(true, remaining / 60000 + 1)
            // Lockout expired - reset
            p.edit().clear().apply()
        }
        return Pair(false, 0)
    }

    fun recordFailedAttempt(ctx: Context) {
        val p = prefs(ctx)
        val attempts = p.getInt(KEY_ATTEMPTS, 0) + 1
        p.edit()
            .putInt(KEY_ATTEMPTS, attempts)
            .putLong(KEY_LOCKOUT, System.currentTimeMillis())
            .apply()
    }

    fun resetAttempts(ctx: Context) {
        prefs(ctx).edit().clear().apply()
    }

    // ── Input Validation ──────────────────────────────────────
    fun isValidEmail(email: String): Boolean {
        return email.isNotBlank() &&
               android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches() &&
               email.length <= 254
    }

    fun isValidPassword(pwd: String): Boolean {
        return pwd.isNotBlank() && pwd.length >= 6 && pwd.length <= 128
    }

    fun sanitizeInput(input: String): String {
        return input.trim()
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#x27;")
    }
}
