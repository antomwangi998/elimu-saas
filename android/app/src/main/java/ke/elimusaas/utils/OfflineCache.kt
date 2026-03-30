package ke.elimusaas.utils

import android.content.Context
import android.content.SharedPreferences

/**
 * Caches API responses locally so the app works offline.
 * The website has no offline capability at all.
 */
class OfflineCache(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("elimu_offline_cache", Context.MODE_PRIVATE)

    fun put(key: String, json: String) =
        prefs.edit().putString(key, json).putLong("${key}_ts", System.currentTimeMillis()).apply()

    fun get(key: String): String? = prefs.getString(key, null)

    fun ageMinutes(key: String): Long {
        val ts = prefs.getLong("${key}_ts", 0L)
        return if (ts == 0L) Long.MAX_VALUE else (System.currentTimeMillis() - ts) / 60000
    }

    fun clear() = prefs.edit().clear().apply()
}
