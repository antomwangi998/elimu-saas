package ke.elimusaas.ui.students

import android.graphics.Color
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.data.StudentResult
import ke.elimusaas.utils.ApiClient
import kotlinx.coroutines.*

class StudentsFragment : Fragment() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private lateinit var container: LinearLayout
    private lateinit var progress: ProgressBar
    private lateinit var etSearch: EditText
    private lateinit var tvCount: TextView
    private var searchJob: Job? = null

    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View =
        i.inflate(R.layout.fragment_students, c, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        container = view.findViewById(R.id.studentsContainer)
        progress = view.findViewById(R.id.progressStudents)
        etSearch = view.findViewById(R.id.etStudentSearch)
        tvCount = view.findViewById(R.id.tvStudentCount)
        etSearch.addTextChangedListener(object : TextWatcher {
            override fun afterTextChanged(s: Editable?) {
                searchJob?.cancel()
                searchJob = scope.launch { delay(400); load(s?.toString() ?: "") }
            }
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
        })
        load("")
    }

    private fun load(q: String) {
        scope.launch {
            progress.visibility = View.VISIBLE; container.removeAllViews()
            val students = withContext(Dispatchers.IO) { ApiClient(requireContext()).getStudents(q) }
            progress.visibility = View.GONE
            tvCount.text = if (students.isEmpty()) "No students found" else students.size.toString() + " student" + (if (students.size == 1) "" else "s")
            if (students.isEmpty()) return@launch
            students.take(60).forEach { addRow(it) }
            if (students.size > 60) {
                TextView(context).apply { text = "+${students.size-60} more — refine your search"
                    textAlignment = View.TEXT_ALIGNMENT_CENTER; setTextColor(Color.parseColor("#9CA3AF"))
                    textSize = 12f; setPadding(16, 8, 16, 24); container.addView(this) }
            }
        }
    }

    private fun addRow(s: StudentResult) {
        val row = LayoutInflater.from(context).inflate(R.layout.item_student_row, container, false)
        val initials = s.name.split(" ").mapNotNull { it.firstOrNull()?.uppercaseChar()?.toString() }.take(2).joinToString("")
        row.findViewById<TextView>(R.id.tvStudentInitials)?.text = initials
        row.findViewById<TextView>(R.id.tvStudentName)?.text = s.name
        row.findViewById<TextView>(R.id.tvStudentAdm)?.text = "${s.admNo}  ·  ${s.stream}"
        row.findViewById<TextView>(R.id.tvStudentGrade)?.text = if (s.meanMarks > 0) s.meanGrade else "-"
        row.findViewById<TextView>(R.id.tvStudentMarks)?.text = if (s.meanMarks > 0) "${s.meanMarks.toInt()}%" else "-"
        row.findViewById<TextView>(R.id.tvStudentPosition)?.text = if (s.position > 0) "#${s.position}/${s.totalStudents}" else "-"
        row.setOnClickListener { Toast.makeText(context, s.name, Toast.LENGTH_SHORT).show() }
        container.addView(row)
    }
    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
