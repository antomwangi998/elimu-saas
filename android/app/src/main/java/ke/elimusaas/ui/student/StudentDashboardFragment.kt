package ke.elimusaas.ui.student
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.utils.ApiClient
import ke.elimusaas.utils.SessionManager
import kotlinx.coroutines.*

class StudentDashboardFragment : Fragment() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View = i.inflate(R.layout.fragment_student_dashboard, c, false)
    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val session = SessionManager(requireContext()); val user = session.user
        view.findViewById<TextView>(R.id.tvStudentName)?.text = "Hi, ${user?.firstName ?: "Student"} 📚"
        view.findViewById<TextView>(R.id.tvStudentSchool)?.text = user?.schoolName ?: ""
        scope.launch {
            val students = withContext(Dispatchers.IO) { try { ApiClient(requireContext()).getStudents(user?.email ?: "") } catch(_:Exception){ emptyList() } }
            val me = students.firstOrNull()
            if (!isAdded) return@launch
            me?.let {
                view.findViewById<TextView>(R.id.tvStudentGradeVal)?.text = it.meanGrade
                view.findViewById<TextView>(R.id.tvStudentMarksVal)?.text = "%.1f%%".format(it.meanMarks)
                view.findViewById<TextView>(R.id.tvStudentPositionVal)?.text = if(it.position>0) "#${it.position}/${it.totalStudents}" else "—"
            }
        }
        view.findViewById<View>(R.id.btnStudentGrades)?.setOnClickListener { (activity as? ke.elimusaas.ui.MainActivity)?.load(ke.elimusaas.ui.exams.ExamsFragment()) }
        view.findViewById<View>(R.id.btnStudentFees)?.setOnClickListener { (activity as? ke.elimusaas.ui.MainActivity)?.load(ke.elimusaas.ui.fees.FeesFragment()) }
        view.findViewById<View>(R.id.btnStudentTimetable)?.setOnClickListener { (activity as? ke.elimusaas.ui.MainActivity)?.load(ke.elimusaas.ui.timetable.TimetableFragment()) }
        view.findViewById<View>(R.id.btnStudentAttendance)?.setOnClickListener { (activity as? ke.elimusaas.ui.MainActivity)?.load(ke.elimusaas.ui.attendance.AttendanceFragment()) }
    }
    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
