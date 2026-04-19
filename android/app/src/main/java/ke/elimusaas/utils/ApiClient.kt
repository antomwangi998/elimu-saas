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
        // Render free tier cold-start can take 50-60 seconds
        private const val CONNECT_TIMEOUT = 60_000
        private const val READ_TIMEOUT    = 60_000
        private const val MAX_RETRIES     = 2
    }

    private val session = SessionManager(context)
    private val cache   = OfflineCache(context)

    private fun req(method: String, path: String, body: JSONObject? = null, auth: Boolean = true): JSONObject? {
        var lastEx: Exception? = null
        repeat(MAX_RETRIES) { attempt ->
            try {
                val conn = (URL("$BASE_URL$path").openConnection() as HttpURLConnection).apply {
                    requestMethod = method
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("Accept", "application/json")
                    setRequestProperty("X-Client", "ElimuSaaS-Android/1.0")
                    connectTimeout = CONNECT_TIMEOUT
                    readTimeout    = READ_TIMEOUT
                    if (auth) session.accessToken?.let { setRequestProperty("Authorization", "Bearer $it") }
                    if (body != null) {
                        doOutput = true
                        OutputStreamWriter(outputStream).also { w -> w.write(body.toString()); w.flush() }
                    }
                }
                val code   = conn.responseCode
                val stream = if (code in 200..299) conn.inputStream else conn.errorStream
                val resp   = BufferedReader(InputStreamReader(stream)).readText()
                Log.d(TAG, "$method $path -> $code (attempt ${attempt + 1})")
                return if (resp.isNotBlank()) JSONObject(resp) else JSONObject()
            } catch (e: Exception) {
                lastEx = e
                Log.w(TAG, "API attempt ${attempt + 1} failed for $path: ${e.message}")
                if (attempt < MAX_RETRIES - 1) Thread.sleep(2000) // wait 2s before retry
            }
        }
        Log.e(TAG, "All retries failed for $path: ${lastEx?.message}")
        return null
    }

    // --- Auth ---
    fun login(email: String, password: String, schoolCode: String?): LoginResponse {
        val body = JSONObject().put("email", email).put("password", password)
        if (!schoolCode.isNullOrBlank()) body.put("schoolCode", schoolCode)
        val res = req("POST", "/auth/login", body, false)
            ?: return LoginResponse(null, null, null,
                "Cannot reach server. The server may be waking up — please wait 30 seconds and try again.")
        if (res.has("error")) return LoginResponse(null, null, null, res.optString("error", "Login failed"))
        val u = res.optJSONObject("user")
        val user = u?.let {
            User(it.optInt("id"), it.optString("firstName", it.optString("first_name", "")),
                it.optString("lastName", it.optString("last_name", "")),
                it.optString("email", email), it.optString("role", "teacher"),
                it.optString("schoolName", "").ifEmpty { null },
                it.optString("schoolCode", "").ifEmpty { null },
                if (it.has("schoolId") && !it.isNull("schoolId")) it.optInt("schoolId", -1).takeIf { i -> i != -1 } else null,
                it.optString("profilePhoto", "").ifEmpty { null })
        }
        return LoginResponse(
            res.optString("accessToken").ifEmpty { null },
            res.optString("refreshToken").ifEmpty { null }, user, null)
    }

    fun forgotPassword(email: String): Boolean {
        val res = req("POST", "/auth/forgot-password", JSONObject().put("email", email), false)
        return res != null && !res.has("error")
    }

    fun logout() {
        try { req("POST", "/auth/logout", JSONObject()) } catch (_: Exception) {}
        session.logout(); cache.clear()
    }

    // --- Dashboard ---
    fun getDashboardStats(): DashboardStats {
        val key  = "dashboard_${session.user?.schoolId}"
        val live = req("GET", "/analytics/dashboard")
        if (live != null && !live.has("error")) { cache.put(key, live.toString()); return parseDashboard(live) }
        return cache.get(key)?.let { parseDashboard(JSONObject(it)) } ?: DashboardStats()
    }

    private fun parseDashboard(r: JSONObject) = DashboardStats(
        r.optInt("totalStudents", r.optInt("students", 0)),
        r.optInt("totalTeachers", r.optInt("teachers", 0)),
        r.optInt("totalStaff",    r.optInt("staff",    0)),
        r.optInt("totalStreams",   r.optInt("streams",  0)),
        r.optDouble("feeCollectionRate", 0.0),
        r.optDouble("attendanceRate",    0.0),
        r.optDouble("totalFeesPending",  0.0),
        r.optDouble("totalFeesCollected",0.0)
    )

    // --- Exams/Subjects ---
    fun getMySubjects(): List<SubjectResult> {
        val key  = "subjects_${session.user?.id}"
        val live = req("GET", "/exams/my-subjects")
        val json = if (live != null && !live.has("error")) { cache.put(key, live.toString()); live }
                   else cache.get(key)?.let { JSONObject(it) } ?: return emptyList()
        val arr  = json.optJSONArray("data") ?: json.optJSONArray("subjects") ?: return emptyList()
        return (0 until arr.length()).map { i -> arr.getJSONObject(i).let { o ->
            SubjectResult(o.optString("subject", o.optString("subjectName", "")),
                o.optString("className", o.optString("form", "")), o.optString("stream", ""),
                o.optString("examName", ""), o.optString("term", ""),
                o.optString("year", o.optString("academicYear", "")),
                o.optDouble("meanPoints", 0.0), o.optDouble("meanMarks", 0.0),
                o.optString("meanGrade", "-"), o.optInt("totalStudents", o.optInt("students", 0)),
                o.optDouble("trend", 0.0))
        }}
    }

    // --- Students ---
    fun getStudents(search: String = ""): List<StudentResult> {
        val path = if (search.isNotBlank()) "/students?search=$search&limit=50" else "/students?limit=50"
        val key  = "students_${session.user?.schoolId}_${search.take(10)}"
        val live = req("GET", path)
        val json = if (live != null && !live.has("error")) { if (search.isBlank()) cache.put(key, live.toString()); live }
                   else if (search.isBlank()) cache.get(key)?.let { JSONObject(it) } ?: return emptyList()
                   else return emptyList()
        val arr  = json.optJSONArray("data") ?: json.optJSONArray("students") ?: return emptyList()
        return (0 until arr.length()).map { i -> arr.getJSONObject(i).let { o ->
            val fn = o.optString("firstName", o.optString("first_name", ""))
            val ln = o.optString("lastName",  o.optString("last_name",  ""))
            StudentResult(o.optInt("id"), "$fn $ln".trim(),
                o.optString("admNo", o.optString("admissionNumber", o.optString("admission_number", ""))),
                o.optString("stream", o.optString("class_name", "")),
                o.optDouble("meanMarks", 0.0), o.optInt("totalPoints", 0), o.optInt("outOf", 0),
                o.optString("meanGrade", "-"), o.optInt("position", 0),
                o.optInt("totalStudents", 0), o.optInt("streamPosition", 0),
                o.optInt("streamTotal", 0),
                if (o.has("kcpe") && !o.isNull("kcpe")) o.optInt("kcpe", 0) else null)
        }}
    }

    // --- Fees ---
    fun getFeeStats(): List<FeeRecord> {
        val key  = "fees_${session.user?.schoolId}"
        val live = req("GET", "/fees/reports/summary")
        val json = if (live != null && !live.has("error")) { cache.put(key, live.toString()); live }
                   else cache.get(key)?.let { JSONObject(it) } ?: return emptyList()
        // Handle both array and summary object formats
        val arr = json.optJSONArray("data") ?: json.optJSONArray("topDefaulters")
        if (arr != null) {
            return (0 until arr.length()).map { i -> arr.getJSONObject(i).let { o ->
                FeeRecord(o.optInt("id"), o.optString("student_name", o.optString("name", "")),
                    o.optString("admission_number", o.optString("admNo", "")),
                    o.optString("class_name", o.optString("stream", "")),
                    o.optDouble("total_fees", o.optDouble("totalFee", 0.0)),
                    o.optDouble("paid", 0.0),
                    o.optDouble("balance", o.optDouble("outstanding", 0.0)),
                    if (o.optDouble("balance", 0.0) > 0) "outstanding" else "paid")
            }}
        }
        return emptyList()
    }

    // --- Attendance ---
    fun getAttendance(): List<AttendanceRecord> {
        val key  = "attendance_${session.user?.schoolId}"
        val live = req("GET", "/attendance/summary")
        val json = if (live != null && !live.has("error")) { cache.put(key, live.toString()); live }
                   else cache.get(key)?.let { JSONObject(it) } ?: return emptyList()
        val arr  = json.optJSONArray("data") ?: json.optJSONArray("records") ?: return emptyList()
        return (0 until arr.length()).map { i -> arr.getJSONObject(i).let { o ->
            AttendanceRecord(o.optString("date", ""), o.optInt("present", 0),
                o.optInt("absent", 0), o.optInt("total", 0),
                o.optDouble("rate", 0.0), o.optString("stream", ""))
        }}
    }

    // --- Calendar Events ---
    fun getEvents(): List<CalendarEvent> {
        val key  = "events_${session.user?.schoolId}"
        val live = req("GET", "/communication/events")
        val json = if (live != null && !live.has("error")) { cache.put(key, live.toString()); live }
                   else cache.get(key)?.let { JSONObject(it) } ?: return emptyList()
        val arr  = json.optJSONArray("data") ?: json.optJSONArray("events") ?: return emptyList()
        return (0 until arr.length()).map { i -> arr.getJSONObject(i).let { o ->
            CalendarEvent(o.optInt("id"), o.optString("title", ""),
                o.optString("date", o.optString("startDate", "")),
                o.optString("description", ""), o.optString("type", "event"))
        }}
    }

    // --- Notifications ---
    fun getNotifications(): List<NotificationItem> {
        val live = req("GET", "/notifications") ?: return emptyList()
        val arr  = live.optJSONArray("data") ?: live.optJSONArray("notifications") ?: return emptyList()
        return (0 until arr.length()).map { i -> arr.getJSONObject(i).let { o ->
            NotificationItem(o.optInt("id"), o.optString("title", ""),
                o.optString("message", o.optString("body", "")),
                o.optString("created_at", ""), o.optBoolean("is_read", false),
                o.optString("type", "info"))
        }}
    }

    // --- Staff ---
    fun getStaff(): List<StaffMember> {
        val key  = "staff_${session.user?.schoolId}"
        val live = req("GET", "/staff")
        val json = if (live != null && !live.has("error")) { cache.put(key, live.toString()); live }
                   else cache.get(key)?.let { JSONObject(it) } ?: return emptyList()
        val arr  = json.optJSONArray("data") ?: json.optJSONArray("staff") ?: return emptyList()
        return (0 until arr.length()).map { i -> arr.getJSONObject(i).let { o ->
            val fn = o.optString("first_name", o.optString("firstName", ""))
            val ln = o.optString("last_name",  o.optString("lastName",  ""))
            StaffMember(o.optInt("id"), "$fn $ln".trim(),
                o.optString("role", ""), o.optString("email", ""),
                o.optString("phone", ""), o.optString("subjects", ""))
        }}
    }

    // --- Timetable ---
    fun getTimetable(): List<ke.elimusaas.data.TimetableSlot> {
        val live = req("GET", "/timetable") ?: return emptyList()
        val arr  = live.optJSONArray("data") ?: live.optJSONArray("timetable") ?: return emptyList()
        return (0 until arr.length()).map { i -> arr.getJSONObject(i).let { o ->
            ke.elimusaas.data.TimetableSlot(
                o.optString("day", ""), o.optInt("period", 0),
                o.optString("subject", o.optString("subject_name", "")),
                o.optString("teacher", o.optString("teacher_name", "")),
                o.optString("room", ""),
                o.optString("startTime", o.optString("start_time", "")),
                o.optString("endTime",   o.optString("end_time",   "")))
        }}
    }

    // --- Discipline ---
    fun getDisciplineRecords(): List<ke.elimusaas.data.DisciplineRecord> {
        val key  = "discipline_${session.user?.schoolId}"
        val live = req("GET", "/behaviour")
        val json = if (live != null && !live.has("error")) { cache.put(key, live.toString()); live }
                   else cache.get(key)?.let { org.json.JSONObject(it) } ?: return emptyList()
        val arr  = json.optJSONArray("data") ?: json.optJSONArray("records") ?: return emptyList()
        return (0 until arr.length()).map { i -> arr.getJSONObject(i).let { o ->
            ke.elimusaas.data.DisciplineRecord(
                o.optInt("id", 0), o.optString("student_name", o.optString("studentName", "")),
                o.optString("admission_number", o.optString("admNo", "")),
                o.optString("description", ""),
                o.optString("severity", "low"), o.optString("date", o.optString("incident_date", "")),
                o.optString("action", o.optString("action_taken", "")),
                o.optString("status", "open"))
        }}
    }

    // --- Analytics ---
    fun getAnalytics(): ke.elimusaas.data.AnalyticsSummary {
        val live = req("GET", "/analytics/dashboard") ?: return ke.elimusaas.data.AnalyticsSummary()
        if (live.has("error")) return ke.elimusaas.data.AnalyticsSummary()
        return ke.elimusaas.data.AnalyticsSummary(
            live.optString("meanGrade", "-"),
            live.optDouble("passRate", 0.0)
        )
    }

    // --- Health check ---
    fun ping(): Boolean {
        return try { req("GET", "/health", null, false) != null } catch (e: Exception) { false }
    }

    // --- Super Admin: Onboard School ---
    fun onboardSchool(name: String, code: String, email: String, phone: String): Boolean {
        val body = org.json.JSONObject()
            .put("name", name).put("school_code", code)
            .put("admin_email", email).put("phone", phone)
            .put("type", "secondary").put("subscription_plan", "professional")
        val res = req("POST", "/superadmin/schools", body) ?: return false
        return !res.has("error")
    }

    // --- Super Admin: Login as School ---
    fun loginAsSchool(schoolCode: String): ke.elimusaas.data.LoginResponse? {
        val schools = req("GET", "/superadmin/schools?limit=200") ?: return null
        val arr     = schools.optJSONArray("data") ?: schools.optJSONArray("schools") ?: return null
        var schoolId: Int? = null
        for (i in 0 until arr.length()) {
            val s = arr.getJSONObject(i)
            if (s.optString("school_code", "").equals(schoolCode, ignoreCase = true) ||
                s.optString("code",        "").equals(schoolCode, ignoreCase = true)) {
                schoolId = s.optInt("id", 0).takeIf { it != 0 }
                break
            }
        }
        if (schoolId == null) return null
        val res = req("POST", "/superadmin/schools/$schoolId/login-as") ?: return null
        if (res.has("error")) return null
        val u    = res.optJSONObject("user")
        val user = u?.let {
            ke.elimusaas.data.User(
                it.optInt("id", 0),
                it.optString("firstName", it.optString("first_name", "")),
                it.optString("lastName",  it.optString("last_name",  "")),
                it.optString("email", ""), it.optString("role", "school_admin"),
                it.optString("schoolName", ""), it.optString("schoolCode", ""),
                if (it.has("schoolId") && !it.isNull("schoolId")) it.optInt("schoolId", -1).takeIf { i -> i != -1 } else null)
        }
        return ke.elimusaas.data.LoginResponse(
            res.optString("accessToken",  "").ifEmpty { null },
            res.optString("refreshToken", "").ifEmpty { null },
            user, null)
    }

    // --- Platform Stats (super admin) ---
    fun getPlatformStats(): org.json.JSONObject? {
        return req("GET", "/superadmin/stats") ?: req("GET", "/superadmin/schools?limit=1")?.let {
            org.json.JSONObject()
                .put("totalSchools",  it.optString("total", "—"))
                .put("totalStudents", "—").put("activeSchools", "—").put("mrr", "—")
        }
    }

    // --- All Schools (super admin) ---
    fun getAllSchools(): List<SchoolItem> {
        val key  = "all_schools"
        val live = req("GET", "/superadmin/schools?limit=200")
        val json = if (live != null && !live.has("error")) { cache.put(key, live.toString()); live }
                   else cache.get(key)?.let { org.json.JSONObject(it) } ?: return emptyList()
        val arr  = json.optJSONArray("data") ?: json.optJSONArray("schools") ?: return emptyList()
        return (0 until arr.length()).map { i -> arr.getJSONObject(i).let { o ->
            SchoolItem(
                o.optString("name", ""),
                o.optString("school_code", o.optString("code", "")),
                o.optString("county", "Kenya"),
                o.optBoolean("is_active", true),
                o.optInt("student_count", 0))
        }}
    }

    // --- All Subscriptions (super admin) ---
    fun getSubscriptions(): List<SubscriptionItem> {
        val live = req("GET", "/subscriptions/all") ?: return emptyList()
        val arr  = live.optJSONArray("data") ?: live.optJSONArray("subscriptions") ?: return emptyList()
        return (0 until arr.length()).map { i -> arr.getJSONObject(i).let { o ->
            SubscriptionItem(
                o.optString("school_name", ""),
                o.optString("plan",        "free"),
                o.optString("end_date",    o.optString("expiry_date", "")),
                o.optString("status",      "inactive"),
                o.optString("total_amount",o.optString("amount", "0")))
        }}
    }

    // --- All Users (super admin) ---
    fun getAllUsers(): List<Triple<String, String, String>> {
        val live = req("GET", "/superadmin/users?limit=100") ?: return emptyList()
        val arr  = live.optJSONArray("data") ?: live.optJSONArray("users") ?: return emptyList()
        return (0 until arr.length()).map { i -> arr.getJSONObject(i).let { o ->
            Triple(o.optString("first_name", ""), o.optString("last_name", ""),
                   o.optString("email", "") + " · " + o.optString("role", ""))
        }}
    }
}
