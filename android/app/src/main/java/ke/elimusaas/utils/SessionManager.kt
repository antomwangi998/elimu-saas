package ke.elimusaas.utils

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import ke.elimusaas.data.User

class SessionManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("elimu_session", Context.MODE_PRIVATE)
    private val gson = Gson()

    var accessToken: String?
        get() = prefs.getString("access_token", null)
        set(value) = prefs.edit().putString("access_token", value).apply()

    var refreshToken: String?
        get() = prefs.getString("refresh_token", null)
        set(value) = prefs.edit().putString("refresh_token", value).apply()

    var user: User?
        get() {
            val json = prefs.getString("user_data", null) ?: return null
            return try { gson.fromJson(json, User::class.java) } catch (e: Exception) { null }
        }
        set(value) {
            if (value == null) prefs.edit().remove("user_data").apply()
            else prefs.edit().putString("user_data", gson.toJson(value)).apply()
        }

    val isLoggedIn get() = accessToken != null && user != null

    fun logout() {
        prefs.edit().clear().apply()
    }
}
