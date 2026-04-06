package ke.elimusaas.utils

import android.content.Context
import com.google.gson.Gson
import ke.elimusaas.data.User

class SessionManager(context: Context) {
    private val prefs = context.getSharedPreferences("elimu_session", Context.MODE_PRIVATE)
    private val gson = Gson()

    var accessToken: String?
        get() = prefs.getString("access_token", null)
        set(v) = prefs.edit().putString("access_token", v).apply()

    var refreshToken: String?
        get() = prefs.getString("refresh_token", null)
        set(v) = prefs.edit().putString("refresh_token", v).apply()

    var user: User?
        get() = try { gson.fromJson(prefs.getString("user_data", null), User::class.java) } catch(e: Exception) { null }
        set(v) { if (v == null) prefs.edit().remove("user_data").apply()
                 else prefs.edit().putString("user_data", gson.toJson(v)).apply() }

    val isLoggedIn get() = !accessToken.isNullOrEmpty() && user != null

    fun logout() = prefs.edit().clear().apply()
}
