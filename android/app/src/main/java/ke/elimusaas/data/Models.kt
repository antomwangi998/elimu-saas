package ke.elimusaas.data

data class LoginResponse(
    val accessToken: String?,
    val refreshToken: String?,
    val user: User?,
    val error: String?
)

data class User(
    val id: Int = 0,
    val firstName: String = "",
    val lastName: String = "",
    val email: String = "",
    val role: String = "teacher",
    val schoolName: String? = null,
    val schoolCode: String? = null,
    val schoolId: Int? = null,
    val profilePhoto: String? = null
) {
    val fullName get() = "$firstName $lastName".trim()
    val initials get() = listOf(firstName, lastName)
        .filter { it.isNotBlank() }
        .mapNotNull { it.firstOrNull()?.uppercaseChar() }
        .take(2).joinToString("")
        .ifEmpty { "E" }
    val displayRole get() = role.replace("_"," ")
        .split(" ").joinToString(" ") { w -> w.replaceFirstChar { it.uppercaseChar() } }
    val isSuperAdmin get() = role == "super_admin"
    val isAdmin get() = role == "admin" || isSuperAdmin
}

data class DashboardStats(
    val totalStudents: Int = 0,
    val totalTeachers: Int = 0,
    val totalStaff: Int = 0,
    val totalStreams: Int = 0,
    val feeCollectionRate: Double = 0.0,
    val attendanceRate: Double = 0.0,
    val totalFeesPending: Double = 0.0,
    val totalFeesCollected: Double = 0.0
)

data class SubjectResult(
    val subject: String = "",
    val className: String = "",
    val stream: String = "",
    val examName: String = "",
    val term: String = "",
    val year: String = "",
    val meanPoints: Double = 0.0,
    val meanMarks: Double = 0.0,
    val meanGrade: String = "-",
    val totalStudents: Int = 0,
    val trend: Double = 0.0
)

data class StudentResult(
    val id: Int = 0,
    val name: String = "",
    val admNo: String = "",
    val stream: String = "",
    val meanMarks: Double = 0.0,
    val totalPoints: Int = 0,
    val outOf: Int = 0,
    val meanGrade: String = "-",
    val position: Int = 0,
    val totalStudents: Int = 0,
    val streamPosition: Int = 0,
    val streamTotal: Int = 0,
    val kcpe: Int? = null,
    val trend: Double = 0.0
)

data class FeeRecord(
    val id: Int = 0,
    val studentName: String = "",
    val admNo: String = "",
    val stream: String = "",
    val totalFee: Double = 0.0,
    val paid: Double = 0.0,
    val balance: Double = 0.0,
    val status: String = "pending"
)

data class AttendanceRecord(
    val date: String = "",
    val present: Int = 0,
    val absent: Int = 0,
    val total: Int = 0,
    val rate: Double = 0.0,
    val stream: String = ""
)

data class CalendarEvent(
    val id: Int = 0,
    val title: String = "",
    val date: String = "",
    val description: String = "",
    val type: String = "event"
)

data class NotificationItem(
    val id: Int = 0,
    val title: String = "",
    val message: String = "",
    val createdAt: String = "",
    val isRead: Boolean = false,
    val type: String = "info"
)

data class StaffMember(
    val id: Int = 0,
    val name: String = "",
    val role: String = "",
    val email: String = "",
    val phone: String = "",
    val subjects: String = ""
)

data class SchoolEvent(
    val id: Int = 0,
    val title: String = "",
    val date: String = "",
    val description: String? = null
)

data class TimetableSlot(
    val day: String = "",
    val period: Int = 0,
    val subject: String = "",
    val teacher: String = "",
    val room: String = "",
    val startTime: String = "",
    val endTime: String = ""
)

data class DisciplineRecord(
    val id: Int = 0,
    val studentName: String = "",
    val admNo: String = "",
    val description: String = "",
    val severity: String = "low",
    val date: String = "",
    val action: String = "",
    val status: String = "open"
)

data class ClubMember(
    val id: Int = 0,
    val clubName: String = "",
    val studentName: String = "",
    val role: String = "member",
    val joinDate: String = ""
)

data class LibraryBook(
    val id: Int = 0,
    val title: String = "",
    val author: String = "",
    val isbn: String = "",
    val category: String = "",
    val available: Boolean = true,
    val copies: Int = 1
)

data class HostelRoom(
    val id: Int = 0,
    val roomNumber: String = "",
    val capacity: Int = 0,
    val occupied: Int = 0,
    val block: String = ""
)

data class TransportRoute(
    val id: Int = 0,
    val name: String = "",
    val driver: String = "",
    val vehicle: String = "",
    val students: Int = 0,
    val status: String = "active"
)

data class Certificate(
    val id: Int = 0,
    val studentName: String = "",
    val type: String = "",
    val issueDate: String = "",
    val status: String = "pending"
)

data class AnalyticsSummary(
    val meanGrade: String = "-",
    val passRate: Double = 0.0,
    val topStudents: List<String> = emptyList(),
    val weakSubjects: List<String> = emptyList()
)
