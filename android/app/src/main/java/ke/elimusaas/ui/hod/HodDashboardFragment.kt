package ke.elimusaas.ui.hod
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.utils.ApiClient
import ke.elimusaas.utils.SessionManager
import kotlinx.coroutines.*

class HodDashboardFragment : Fragment() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View = i.inflate(R.layout.fragment_hod_dashboard, c, false)
    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val session = SessionManager(requireContext()); val user = session.user
        view.findViewById<TextView>(R.id.tvHodName)?.text = "Good day, ${user?.firstName ?: "HOD"} 👋"
        view.findViewById<TextView>(R.id.tvHodSchool)?.text = user?.schoolName ?: ""
        view.findViewById<TextView>(R.id.tvHodDept)?.text = "Department Head"
        scope.launch {
            val subjects = withContext(Dispatchers.IO) { try { ApiClient(requireContext()).getMySubjects() } catch(_:Exception){ emptyList() } }
            if (!isAdded) return@launch
            view.findViewById<TextView>(R.id.tvHodSubjectCount)?.text = subjects.size.toString()
            view.findViewById<TextView>(R.id.tvHodStudentCount)?.text = subjects.sumOf { it.totalStudents }.toString()
            val avgMean = if (subjects.isNotEmpty()) subjects.map{it.meanMarks}.average() else 0.0
            view.findViewById<TextView>(R.id.tvHodMeanMarks)?.text = "%.1f%%".format(avgMean)
        }
        view.findViewById<View>(R.id.btnHodEnterMarks)?.setOnClickListener { (activity as? ke.elimusaas.ui.MainActivity)?.load(ke.elimusaas.ui.exams.ExamsFragment()) }
        view.findViewById<View>(R.id.btnHodAttendance)?.setOnClickListener { (activity as? ke.elimusaas.ui.MainActivity)?.load(ke.elimusaas.ui.attendance.AttendanceFragment()) }
        view.findViewById<View>(R.id.btnHodReports)?.setOnClickListener { (activity as? ke.elimusaas.ui.MainActivity)?.load(ke.elimusaas.ui.reports.ReportsFragment()) }
    }
    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
