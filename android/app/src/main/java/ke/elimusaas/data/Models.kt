package ke.elimusaas.data

data class LoginRequest(val email: String, val password: String, val schoolCode: String? = null)

data class LoginResponse(
    val accessToken: String?,
    val refreshToken: String?,
    val user: User?,
    val error: String?
)

data class User(
    val id: Int,
    val firstName: String,
    val lastName: String,
    val email: String,
    val role: String,
    val schoolName: String?,
    val schoolCode: String?,
    val schoolId: Int?,
    val profilePhoto: String?
) {
    val fullName get() = "$firstName $lastName"
    val initials get() = "${firstName.firstOrNull() ?: ""}${lastName.firstOrNull() ?: ""}".uppercase()
    val displayRole get() = role.replace("_", " ").split(" ").joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }
}

data class DashboardStats(
    val totalStudents: Int = 0,
    val totalTeachers: Int = 0,
    val totalStaff: Int = 0,
    val totalStreams: Int = 0,
    val feeCollectionRate: Double = 0.0,
    val attendanceRate: Double = 0.0,
    val upcomingEvents: List<SchoolEvent> = emptyList()
)

data class SchoolEvent(
    val id: Int,
    val title: String,
    val date: String,
    val description: String?
)

data class ExamResult(
    val id: Int,
    val examName: String,
    val term: String,
    val year: String,
    val meanMarks: Double,
    val meanGrade: String,
    val meanPoints: Double,
    val totalStudents: Int,
    val position: Int? = null,
    val streamPosition: Int? = null
)

data class SubjectResult(
    val subject: String,
    val className: String,
    val stream: String,
    val examName: String,
    val term: String,
    val year: String = "",
    val meanPoints: Double,
    val meanMarks: Double,
    val meanGrade: String,
    val totalStudents: Int,
    val trend: Double = 0.0
)

data class StudentResult(
    val id: Int,
    val name: String,
    val admNo: String,
    val stream: String,
    val meanMarks: Double,
    val totalPoints: Int,
    val outOf: Int,
    val meanGrade: String,
    val position: Int,
    val totalStudents: Int,
    val streamPosition: Int,
    val streamTotal: Int,
    val kcpe: Int?,
    val trend: Double = 0.0
)

data class ApiError(val message: String)
