
package ke.elimusaas.ui.teacher
import android.graphics.Color; import android.os.Bundle; import android.view.*; import android.widget.*; import androidx.fragment.app.Fragment
import ke.elimusaas.R; import ke.elimusaas.data.SubjectResult; import ke.elimusaas.utils.ApiClient; import ke.elimusaas.utils.SessionManager; import kotlinx.coroutines.*

class TeacherDashboardFragment : Fragment() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View = i.inflate(R.layout.fragment_teacher_dashboard, c, false)
    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val session = SessionManager(requireContext()); val user = session.user
        view.findViewById<TextView>(R.id.tvTeacherName)?.text = "Hello, ${user?.firstName ?: "Teacher"} 👋"
        view.findViewById<TextView>(R.id.tvTeacherSchool)?.text = user?.schoolName ?: ""
        val container = view.findViewById<LinearLayout>(R.id.subjectCardsContainer)
        val progress  = view.findViewById<ProgressBar>(R.id.progressTeacher)
        scope.launch {
            progress?.visibility = View.VISIBLE
            val subjects = withContext(Dispatchers.IO) { try { ApiClient(requireContext()).getMySubjects() } catch(_:Exception){ emptyList() } }
            if (!isAdded) return@launch
            progress?.visibility = View.GONE
            view.findViewById<TextView>(R.id.tvTeacherSubjects)?.text = subjects.size.toString()
            view.findViewById<TextView>(R.id.tvTeacherStudents)?.text = subjects.sumOf{it.totalStudents}.toString()
            if (subjects.isEmpty()) {
                container?.addView(TextView(context).apply { text="No subjects assigned yet.
Contact your HOD or admin."; textAlignment=View.TEXT_ALIGNMENT_CENTER; setTextColor(Color.parseColor("#6B7280")); textSize=14f; setPadding(16,48,16,16) })
                return@launch
            }
            subjects.take(6).forEach { s -> container?.addView(makeSubjectCard(s)) }
        }
        view.findViewById<View>(R.id.btnTeacherMarks)?.setOnClickListener { (activity as? ke.elimusaas.ui.MainActivity)?.load(ke.elimusaas.ui.exams.ExamsFragment()) }
        view.findViewById<View>(R.id.btnTeacherAttendance)?.setOnClickListener { (activity as? ke.elimusaas.ui.MainActivity)?.load(ke.elimusaas.ui.attendance.AttendanceFragment()) }
    }
    private fun makeSubjectCard(s: SubjectResult): android.view.View {
        return LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.WHITE)
            setPadding(16,14,16,14)
            (layoutParams ?: LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)).let { lp -> if(lp is LinearLayout.LayoutParams) { lp.setMargins(0,0,0,8); layoutParams=lp } }
            addView(TextView(context).apply { text="${s.className} ${s.stream} — ${s.subject}"; textSize=14f; setTypeface(null,android.graphics.Typeface.BOLD); setTextColor(Color.parseColor("#0D47A1")) })
            addView(TextView(context).apply { text="${s.examName} · Mean: ${"%.1f".format(s.meanMarks)}% · ${s.totalStudents} students"; textSize=12f; setTextColor(Color.parseColor("#6B7280")); setPadding(0,4,0,0) })
        }
    }
    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
