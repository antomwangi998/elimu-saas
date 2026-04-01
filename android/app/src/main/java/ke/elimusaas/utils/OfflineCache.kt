package ke.elimusaas.utils

import android.content.Context

class OfflineCache(context: Context) {
    private val prefs = context.getSharedPreferences("elimu_cache", Context.MODE_PRIVATE)

    fun put(key: String, json: String) {
        prefs.edit().putString(key, json).putLong("${key}_ts", System.currentTimeMillis()).apply()
    }
    fun get(key: String): String? = prefs.getString(key, null)
    fun ageMinutes(key: String): Long {
        val ts = prefs.getLong("${key}_ts", 0L)
        return if (ts == 0L) Long.MAX_VALUE else (System.currentTimeMillis() - ts) / 60000
    }
    fun clear() = prefs.edit().clear().apply()
}
