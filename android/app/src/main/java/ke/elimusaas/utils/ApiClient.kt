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
    }

    private val session = SessionManager(context)
    private val cache = OfflineCache(context)

    private fun req(method: String, path: String, body: JSONObject? = null, auth: Boolean = true): JSONObject? {
        return try {
            val conn = (URL("$BASE_URL$path").openConnection() as HttpURLConnection).apply {
                requestMethod = method
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("X-Client", "ElimuSaaS-Android/1.0")
                connectTimeout = 15000; readTimeout = 15000
                if (auth) session.accessToken?.let { setRequestProperty("Authorization", "Bearer $it") }
                if (body != null) { doOutput = true; OutputStreamWriter(outputStream).also { w -> w.write(body.toString()); w.flush() } }
            }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val resp = BufferedReader(InputStreamReader(stream)).readText()
            Log.d(TAG, "$method $path -> $code")
            if (resp.isNotBlank()) JSONObject(resp) else JSONObject()
        } catch (e: Exception) { Log.e(TAG, "API error: $path", e); null }
    }

    // --- Auth ---
    fun login(email: String, password: String, schoolCode: String?): LoginResponse {
        val body = JSONObject().put("email", email).put("password", password)
        if (!schoolCode.isNullOrBlank()) body.put("schoolCode", schoolCode)
        val res = req("POST", "/auth/login", body, false)
            ?: return LoginResponse(null, null, null, "Cannot reach server. Check your connection.")
        if (res.has("error")) return LoginResponse(null, null, null, res.optString("error", ""))
        val u = res.optJSONObject("user")
        val user = u?.let {
            User(it.optInt("id"), it.optString("firstName", it.optString("first_name","")),
                it.optString("lastName", it.optString("last_name","")),
                it.optString("email", email), it.optString("role","teacher"),
                it.optString("schoolName","").ifEmpty { null },
                it.optString("schoolCode","").ifEmpty { null },
                if (it.has("schoolId") && !it.isNull("schoolId")) it.optInt("schoolId", -1).takeIf { i -> i != -1 } else null,
                it.optString("profilePhoto","").ifEmpty { null })
        }
        return LoginResponse(res.optString("accessToken").ifEmpty { null },
            res.optString("refreshToken").ifEmpty { null }, user, null)
    }

    fun forgotPassword(email: String): Boolean {
        val res = req("POST", "/auth/forgot-password", JSONObject().put("email", email), false)
        return res != null && !res.has("error")
    }

    fun logout() { try { req("POST", "/auth/logout", JSONObject()) } catch (_: Exception) {}; session.logout(); cache.clear() }

    // --- Dashboard ---
    fun getDashboardStats(): DashboardStats {
        val key = "dashboard_${session.user?.schoolId}"
        val live = req("GET", "/dashboard")
        if (live != null && !live.has("error")) { cache.put(key, live.toString()); return parseDashboard(live) }
        return cache.get(key)?.let { parseDashboard(JSONObject(it)) } ?: DashboardStats()
    }
    private fun parseDashboard(r: JSONObject) = DashboardStats(
        r.optInt("totalStudents", r.optInt("students",0)),
        r.optInt("totalTeachers", r.optInt("teachers",0)),
        r.optInt("totalStaff", r.optInt("staff",0)),
        r.optInt("totalStreams", r.optInt("streams",0)),
        r.optDouble("feeCollectionRate",0.0),
        r.optDouble("attendanceRate",0.0),
        r.optDouble("totalFeesPending",0.0),
        r.optDouble("totalFeesCollected",0.0)
    )

    // --- Exams/Subjects ---
    fun getMySubjects(): List<SubjectResult> {
        val key = "subjects_${session.user?.id}"
        val live = req("GET", "/exams/my-subjects")
        val json = if (live != null && !live.has("error")) { cache.put(key, live.toString()); live }
                   else cache.get(key)?.let { JSONObject(it) } ?: return emptyList()
        val arr = json.optJSONArray("data") ?: json.optJSONArray("subjects") ?: return emptyList()
        return (0 until arr.length()).map { i -> arr.getJSONObject(i).let { o ->
            SubjectResult(o.optString("subject", o.optString("subjectName","")),
                o.optString("className", o.optString("form","")), o.optString("stream",""),
                o.optString("examName",""), o.optString("term",""),
                o.optString("year", o.optString("academicYear","")),
                o.optDouble("meanPoints",0.0), o.optDouble("meanMarks",0.0),
                o.optString("meanGrade","-"), o.optInt("totalStudents", o.optInt("students",0)),
                o.optDouble("trend",0.0))
        }}
    }

    // --- Students ---
    fun getStudents(search: String = ""): List<StudentResult> {
        val path = if (search.isNotBlank()) "/students?search=$search&limit=50" else "/students?limit=50"
        val key = "students_${session.user?.schoolId}_${search.take(10)}"
        val live = req("GET", path)
        val json = if (live != null && !live.has("error")) { if (search.isBlank()) cache.put(key, live.toString()); live }
                   else if (search.isBlank()) cache.get(key)?.let { JSONObject(it) } ?: return emptyList()
                   else return emptyList()
        val arr = json.optJSONArray("data") ?: json.optJSONArray("students") ?: return emptyList()
        return (0 until arr.length()).map { i -> arr.getJSONObject(i).let { o ->
            val fn = o.optString("firstName",""); val ln = o.optString("lastName","")
            StudentResult(o.optInt("id"), "$fn $ln".trim(),
                o.optString("admNo", o.optString("admissionNumber","")),
                o.optString("stream", o.optString("streamName","")),
                o.optDouble("meanMarks",0.0), o.optInt("totalPoints",0), o.optInt("outOf",0),
                o.optString("meanGrade","-"), o.optInt("position",0),
                o.optInt("totalStudents",0), o.optInt("streamPosition",0),
                o.optInt("streamTotal",0),
                if (o.has("kcpe") && !o.isNull("kcpe")) o.optInt("kcpe", 0) else null)
        }}
    }

    // --- Fees ---
    fun getFeeStats(): List<FeeRecord> {
        val key = "fees_${session.user?.schoolId}"
        val live = req("GET", "/fees/summary")
        val json = if (live != null && !live.has("error")) { cache.put(key, live.toString()); live }
                   else cache.get(key)?.let { JSONObject(it) } ?: return emptyList()
        val arr = json.optJSONArray("data") ?: json.optJSONArray("fees") ?: return emptyList()
        return (0 until arr.length()).map { i -> arr.getJSONObject(i).let { o ->
            FeeRecord(o.optInt("id"), o.optString("studentName",""),
                o.optString("admNo",""), o.optString("stream",""),
                o.optDouble("totalFee",0.0), o.optDouble("paid",0.0),
                o.optDouble("balance",0.0), o.optString("status","pending"))
        }}
    }

    // --- Attendance ---
    fun getAttendance(): List<AttendanceRecord> {
        val key = "attendance_${session.user?.schoolId}"
        val live = req("GET", "/attendance/summary")
        val json = if (live != null && !live.has("error")) { cache.put(key, live.toString()); live }
                   else cache.get(key)?.let { JSONObject(it) } ?: return emptyList()
        val arr = json.optJSONArray("data") ?: json.optJSONArray("records") ?: return emptyList()
        return (0 until arr.length()).map { i -> arr.getJSONObject(i).let { o ->
            AttendanceRecord(o.optString("date",""), o.optInt("present",0),
                o.optInt("absent",0), o.optInt("total",0),
                o.optDouble("rate",0.0), o.optString("stream",""))
        }}
    }

    // --- Calendar Events ---
    fun getEvents(): List<CalendarEvent> {
        val key = "events_${session.user?.schoolId}"
        val live = req("GET", "/communication/events")
        val json = if (live != null && !live.has("error")) { cache.put(key, live.toString()); live }
                   else cache.get(key)?.let { JSONObject(it) } ?: return emptyList()
        val arr = json.optJSONArray("data") ?: json.optJSONArray("events") ?: return emptyList()
        return (0 until arr.length()).map { i -> arr.getJSONObject(i).let { o ->
            CalendarEvent(o.optInt("id"), o.optString("title",""),
                o.optString("date", o.optString("startDate","")),
                o.optString("description",""), o.optString("type","event"))
        }}
    }

    // --- Notifications ---
    fun getNotifications(): List<NotificationItem> {
        val live = req("GET", "/notifications") ?: return emptyList()
        val arr = live.optJSONArray("data") ?: live.optJSONArray("notifications") ?: return emptyList()
        return (0 until arr.length()).map { i -> arr.getJSONObject(i).let { o ->
            NotificationItem(o.optInt("id"), o.optString("title",""),
                o.optString("message", o.optString("body","")),
                o.optString("created_at",""), o.optBoolean("is_read",false),
                o.optString("type","info"))
        }}
    }

    // --- Staff ---
    fun getStaff(): List<StaffMember> {
        val key = "staff_${session.user?.schoolId}"
        val live = req("GET", "/staff")
        val json = if (live != null && !live.has("error")) { cache.put(key, live.toString()); live }
                   else cache.get(key)?.let { JSONObject(it) } ?: return emptyList()
        val arr = json.optJSONArray("data") ?: json.optJSONArray("staff") ?: return emptyList()
        return (0 until arr.length()).map { i -> arr.getJSONObject(i).let { o ->
            val fn = o.optString("firstName",""); val ln = o.optString("lastName","")
            StaffMember(o.optInt("id"), "$fn $ln".trim(),
                o.optString("role",""), o.optString("email",""),
                o.optString("phone",""), o.optString("subjects",""))
        }}
    }

    // --- Timetable ---
    fun getTimetable(): List<ke.elimusaas.data.TimetableSlot> {
        val live = req("GET", "/timetable") ?: return emptyList()
        val arr = live.optJSONArray("data") ?: live.optJSONArray("timetable") ?: return emptyList()
        return (0 until arr.length()).map { i -> arr.getJSONObject(i).let { o ->
            ke.elimusaas.data.TimetableSlot(
                o.optString("day",""), o.optInt("period",0),
                o.optString("subject",""), o.optString("teacher",""),
                o.optString("room",""), o.optString("startTime",""),
                o.optString("endTime",""))
        }}
    }

    // --- Discipline ---
    fun getDisciplineRecords(): List<ke.elimusaas.data.DisciplineRecord> {
        val key = "discipline_${session.user?.schoolId}"
        val live = req("GET", "/discipline")
        val json = if (live != null && !live.has("error")) { cache.put(key, live.toString()); live }
                   else cache.get(key)?.let { org.json.JSONObject(it) } ?: return emptyList()
        val arr = json.optJSONArray("data") ?: json.optJSONArray("records") ?: return emptyList()
        return (0 until arr.length()).map { i -> arr.getJSONObject(i).let { o ->
            ke.elimusaas.data.DisciplineRecord(
                o.optInt("id",0), o.optString("studentName",""),
                o.optString("admNo",""), o.optString("description",""),
                o.optString("severity","low"), o.optString("date",""),
                o.optString("action",""), o.optString("status","open"))
        }}
    }

    // --- Analytics ---
    fun getAnalytics(): ke.elimusaas.data.AnalyticsSummary {
        val live = req("GET", "/analytics/summary") ?: return ke.elimusaas.data.AnalyticsSummary()
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

}