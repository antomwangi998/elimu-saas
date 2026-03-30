package ke.elimusaas.utils

import android.content.Context
import android.util.Log
import ke.elimusaas.data.*
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class ApiClient(private val context: Context) {

    companion object {
        const val BASE_URL = "https://elimu-saas.onrender.com/api"
        const val FRONTEND_URL = "https://elimu-saas-frontend.onrender.com"
        private const val TAG = "ElimuAPI"
        private const val TIMEOUT = 15000
    }

    private val session = SessionManager(context)
    private val cache = OfflineCache(context)

    private fun request(method: String, path: String, body: JSONObject? = null, withAuth: Boolean = true): JSONObject? {
        return try {
            val conn = (URL("$BASE_URL$path").openConnection() as HttpURLConnection).apply {
                requestMethod = method
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("X-Client", "ElimuSaaS-Android/1.0")
                connectTimeout = TIMEOUT
                readTimeout = TIMEOUT
                if (withAuth) session.accessToken?.let { setRequestProperty("Authorization", "Bearer $it") }
                if (body != null) { doOutput = true; OutputStreamWriter(outputStream).also { it.write(body.toString()); it.flush() } }
            }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val response = BufferedReader(InputStreamReader(stream)).readText()
            Log.d(TAG, "$method $path → $code")
            if (response.isNotBlank()) JSONObject(response) else JSONObject()
        } catch (e: Exception) {
            Log.e(TAG, "Request failed: $path", e)
            null  // null means network error → caller should use cache
        }
    }

    // ── Auth ──────────────────────────────────────────────────────────

    fun login(email: String, password: String, schoolCode: String?): LoginResponse {
        val body = JSONObject().apply {
            put("email", email); put("password", password)
            if (!schoolCode.isNullOrBlank()) put("schoolCode", schoolCode)
        }
        val res = request("POST", "/auth/login", body, withAuth = false)
            ?: return LoginResponse(null, null, null, "Cannot reach server. Check your connection.")
        if (res.has("error")) return LoginResponse(null, null, null, res.getString("error"))
        val u = res.optJSONObject("user")
        val user = u?.let {
            User(it.optInt("id"), it.optString("firstName", it.optString("first_name","")),
                it.optString("lastName", it.optString("last_name","")),
                it.optString("email", email), it.optString("role","teacher"),
                it.optString("schoolName", null), it.optString("schoolCode", null),
                if (it.has("schoolId")) it.getInt("schoolId") else null,
                it.optString("profilePhoto", null))
        }
        return LoginResponse(res.optString("accessToken",null), res.optString("refreshToken",null), user, null)
    }

    fun forgotPassword(email: String): Boolean {
        val res = request("POST", "/auth/forgot-password", JSONObject().put("email", email), withAuth = false)
        return res != null && !res.has("error")
    }

    // ── Dashboard (with offline cache) ───────────────────────────────

    fun getDashboardStats(): DashboardStats {
        val cacheKey = "dashboard_${session.user?.schoolId}"
        val live = request("GET", "/dashboard")
        if (live != null && !live.has("error")) {
            cache.put(cacheKey, live.toString())
            return parseDashboard(live)
        }
        // Offline fallback
        val cached = cache.get(cacheKey)
        return if (cached != null) parseDashboard(JSONObject(cached)) else DashboardStats()
    }

    private fun parseDashboard(res: JSONObject) = DashboardStats(
        totalStudents = res.optInt("totalStudents", res.optInt("students", 0)),
        totalTeachers = res.optInt("totalTeachers", res.optInt("teachers", 0)),
        totalStaff    = res.optInt("totalStaff",    res.optInt("staff", 0)),
        totalStreams   = res.optInt("totalStreams",  res.optInt("streams", 0)),
        feeCollectionRate = res.optDouble("feeCollectionRate", 0.0),
        attendanceRate    = res.optDouble("attendanceRate", 0.0)
    )

    // ── Exams / Subjects (with offline cache) ────────────────────────

    fun getMySubjects(): List<SubjectResult> {
        val cacheKey = "subjects_${session.user?.id}"
        val live = request("GET", "/exams/my-subjects")
        val json = if (live != null && !live.has("error")) {
            cache.put(cacheKey, live.toString()); live
        } else {
            cache.get(cacheKey)?.let { JSONObject(it) } ?: return emptyList()
        }
        val arr = json.optJSONArray("data") ?: json.optJSONArray("subjects") ?: return emptyList()
        return (0 until arr.length()).map { i ->
            arr.getJSONObject(i).let { o ->
                SubjectResult(o.optString("subject", o.optString("subjectName","")),
                    o.optString("className", o.optString("form","")), o.optString("stream",""),
                    o.optString("examName",""), o.optString("term",""),
                    o.optDouble("meanPoints",0.0), o.optDouble("meanMarks",0.0),
                    o.optString("meanGrade","-"), o.optInt("totalStudents", o.optInt("students",0)),
                    o.optDouble("trend",0.0))
            }
        }
    }

    fun getStudents(search: String = ""): List<StudentResult> {
        val path = if (search.isNotBlank()) "/students?search=$search" else "/students"
        val cacheKey = "students_${session.user?.schoolId}_$search"
        val live = request("GET", path)
        val json = if (live != null && !live.has("error")) {
            if (search.isBlank()) cache.put(cacheKey, live.toString()); live
        } else {
            if (search.isBlank()) cache.get(cacheKey)?.let { JSONObject(it) } ?: return emptyList()
            else return emptyList()
        }
        val arr = json.optJSONArray("data") ?: json.optJSONArray("students") ?: return emptyList()
        return (0 until arr.length()).map { i ->
            arr.getJSONObject(i).let { o ->
                StudentResult(o.optInt("id"),
                    "${o.optString("firstName","")} ${o.optString("lastName","")}".trim(),
                    o.optString("admNo", o.optString("admissionNumber","")),
                    o.optString("stream", o.optString("streamName","")),
                    o.optDouble("meanMarks",0.0), o.optInt("totalPoints",0),
                    o.optInt("outOf",0), o.optString("meanGrade","-"),
                    o.optInt("position",0), o.optInt("totalStudents",0),
                    o.optInt("streamPosition",0), o.optInt("streamTotal",0),
                    if (o.has("kcpe")) o.getInt("kcpe") else null)
            }
        }
    }

    // ── Notifications (native-only feature) ──────────────────────────

    fun getNotifications(): List<SchoolEvent> {
        val res = request("GET", "/notifications") ?: return emptyList()
        val arr = res.optJSONArray("data") ?: return emptyList()
        return (0 until arr.length()).map { i ->
            arr.getJSONObject(i).let { o ->
                SchoolEvent(o.optInt("id"), o.optString("title",""),
                    o.optString("date", o.optString("created_at","")),
                    o.optString("message", o.optString("body",null)))
            }
        }
    }

    fun logout() {
        try { request("POST", "/auth/logout", JSONObject()) } catch (_: Exception) {}
        session.logout()
        cache.clear()
    }
}
