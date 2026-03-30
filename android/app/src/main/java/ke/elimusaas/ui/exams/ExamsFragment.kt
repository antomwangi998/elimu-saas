package ke.elimusaas.ui.exams

import android.graphics.Color
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.data.SubjectResult
import ke.elimusaas.utils.ApiClient
import kotlinx.coroutines.*

class ExamsFragment : Fragment() {

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private lateinit var tabManage: TextView
    private lateinit var tabMySubjects: TextView
    private lateinit var tabCreate: TextView
    private lateinit var container: LinearLayout
    private lateinit var progressBar: ProgressBar

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View =
        inflater.inflate(R.layout.fragment_exams, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        tabManage = view.findViewById(R.id.tabManageExams)
        tabMySubjects = view.findViewById(R.id.tabMySubjects)
        tabCreate = view.findViewById(R.id.tabCreateExam)
        container = view.findViewById(R.id.subjectsContainer)
        progressBar = view.findViewById(R.id.progressExams)

        tabMySubjects.setOnClickListener { selectTab(1) }
        tabManage.setOnClickListener { selectTab(0) }
        tabCreate.setOnClickListener { selectTab(2) }

        selectTab(1) // Default: My Subjects like Zeraki
    }

    private fun selectTab(index: Int) {
        val tabs = listOf(tabManage, tabMySubjects, tabCreate)
        tabs.forEachIndexed { i, tab ->
            if (i == index) {
                tab.setBackgroundResource(R.drawable.tab_selected_bg)
                tab.setTextColor(Color.WHITE)
            } else {
                tab.setBackgroundResource(R.drawable.tab_unselected_bg)
                tab.setTextColor(Color.parseColor("#1B5E20"))
            }
        }
        when (index) {
            0 -> showManageExams()
            1 -> loadMySubjects()
            2 -> showCreateExam()
        }
    }

    private fun loadMySubjects() {
        val api = ApiClient(requireContext())
        scope.launch {
            progressBar.visibility = View.VISIBLE
            container.removeAllViews()

            val subjects = withContext(Dispatchers.IO) { api.getMySubjects() }

            progressBar.visibility = View.GONE

            if (subjects.isEmpty()) {
                showEmptyState("No subjects found.\nYou haven't been assigned any classes yet.")
                return@launch
            }
            subjects.forEach { addSubjectCard(it) }
        }
    }

    private fun addSubjectCard(s: SubjectResult) {
        val card = LayoutInflater.from(context).inflate(R.layout.item_subject_card, container, false)

        card.findViewById<TextView>(R.id.tvSubjectTitle).text = "${s.className} ${s.stream} - ${s.subject}"
        card.findViewById<TextView>(R.id.tvExamLabel).text = "${s.examName} - (${s.year} ${s.term})".uppercase()

        card.findViewById<TextView>(R.id.tvMeanPoints).text = String.format("%.4f", s.meanPoints)
        card.findViewById<TextView>(R.id.tvMeanMarks).text = "${String.format("%.1f", s.meanMarks)}%"
        card.findViewById<TextView>(R.id.tvMeanGrade).text = s.meanGrade
        card.findViewById<TextView>(R.id.tvStudentCount).text = s.totalStudents.toString()

        val trendPoints = card.findViewById<TextView>(R.id.tvTrendPoints)
        val trendArrowP = card.findViewById<ImageView>(R.id.ivTrendArrowPoints)
        val trendMarks = card.findViewById<TextView>(R.id.tvTrendMarks)
        val trendArrowM = card.findViewById<ImageView>(R.id.ivTrendArrowMarks)

        val isUp = s.trend >= 0
        val trendColor = if (isUp) Color.parseColor("#1B5E20") else Color.parseColor("#B71C1C")
        val trendVal = String.format("%.2f", Math.abs(s.trend))

        trendPoints.text = trendVal; trendPoints.setTextColor(trendColor)
        trendMarks.text = trendVal; trendMarks.setTextColor(trendColor)
        trendArrowP.setImageResource(if (isUp) R.drawable.ic_trend_up else R.drawable.ic_trend_down)
        trendArrowM.setImageResource(if (isUp) R.drawable.ic_trend_up else R.drawable.ic_trend_down)

        card.findViewById<Button>(R.id.btnAnalyze).setOnClickListener {
            Toast.makeText(context, "Analyzing ${s.subject}...", Toast.LENGTH_SHORT).show()
        }

        container.addView(card)
    }

    private fun showManageExams() {
        container.removeAllViews()
        showEmptyState("Exam management is available\non the web portal.")
    }

    private fun showCreateExam() {
        container.removeAllViews()
        showEmptyState("Create exams from\nthe web portal for full functionality.")
    }

    private fun showEmptyState(msg: String) {
        val tv = TextView(context).apply {
            text = msg
            textAlignment = View.TEXT_ALIGNMENT_CENTER
            setTextColor(Color.parseColor("#78909C"))
            textSize = 14f
            setPadding(32, 64, 32, 32)
        }
        container.addView(tv)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        scope.cancel()
    }
}
