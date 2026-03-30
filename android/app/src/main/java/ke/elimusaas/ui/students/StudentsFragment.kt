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
    private lateinit var progressBar: ProgressBar
    private lateinit var etSearch: EditText
    private var searchJob: Job? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View =
        inflater.inflate(R.layout.fragment_students, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        container = view.findViewById(R.id.studentsContainer)
        progressBar = view.findViewById(R.id.progressStudents)
        etSearch = view.findViewById(R.id.etStudentSearch)

        etSearch.addTextChangedListener(object : TextWatcher {
            override fun afterTextChanged(s: Editable?) {
                searchJob?.cancel()
                searchJob = scope.launch {
                    delay(400)
                    loadStudents(s?.toString() ?: "")
                }
            }
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
        })

        loadStudents("")
    }

    private fun loadStudents(query: String) {
        val api = ApiClient(requireContext())
        scope.launch {
            progressBar.visibility = View.VISIBLE
            container.removeAllViews()

            val students = withContext(Dispatchers.IO) { api.getStudents(query) }

            progressBar.visibility = View.GONE

            if (students.isEmpty()) {
                val tv = TextView(context).apply {
                    text = if (query.isNotBlank()) "No students found for \"$query\""
                           else "No students found."
                    textAlignment = View.TEXT_ALIGNMENT_CENTER
                    setTextColor(Color.parseColor("#78909C"))
                    textSize = 14f
                    setPadding(32, 64, 32, 32)
                }
                container.addView(tv); return@launch
            }
            students.take(50).forEach { addStudentRow(it) }
            if (students.size > 50) {
                val tv = TextView(context).apply {
                    text = "+${students.size - 50} more — refine your search"
                    textAlignment = View.TEXT_ALIGNMENT_CENTER
                    setTextColor(Color.parseColor("#78909C"))
                    textSize = 12f
                    setPadding(16, 8, 16, 24)
                }
                container.addView(tv)
            }
        }
    }

    private fun addStudentRow(s: StudentResult) {
        val row = LayoutInflater.from(context).inflate(R.layout.item_student_row, container, false)

        // Avatar initials
        val initials = s.name.split(" ").mapNotNull { it.firstOrNull()?.toString() }.take(2).joinToString("")
        row.findViewById<TextView>(R.id.tvStudentInitials).text = initials.uppercase()

        row.findViewById<TextView>(R.id.tvStudentName).text = s.name
        row.findViewById<TextView>(R.id.tvStudentAdm).text = "${s.admNo}, ${s.stream}"

        if (s.meanMarks > 0) {
            row.findViewById<TextView>(R.id.tvStudentGrade).text = s.meanGrade
            row.findViewById<TextView>(R.id.tvStudentMarks).text = "${s.meanMarks.toInt()}%"
            row.findViewById<TextView>(R.id.tvStudentPosition).text = "${s.position}/${s.totalStudents}"
        } else {
            row.findViewById<TextView>(R.id.tvStudentGrade).text = "-"
            row.findViewById<TextView>(R.id.tvStudentMarks).text = "-"
            row.findViewById<TextView>(R.id.tvStudentPosition).text = "-"
        }

        row.setOnClickListener {
            Toast.makeText(context, "Student: ${s.name}", Toast.LENGTH_SHORT).show()
        }

        container.addView(row)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        scope.cancel()
    }
}
