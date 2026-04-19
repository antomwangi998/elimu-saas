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
    private lateinit var container: LinearLayout
    private lateinit var progress: ProgressBar
    private lateinit var tabManage: TextView
    private lateinit var tabSubjects: TextView
    private lateinit var tabCreate: TextView

    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View =
        i.inflate(R.layout.fragment_exams, c, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        container = view.findViewById(R.id.subjectsContainer)
        progress = view.findViewById(R.id.progressExams)
        tabManage = view.findViewById(R.id.tabManageExams)
        tabSubjects = view.findViewById(R.id.tabMySubjects)
        tabCreate = view.findViewById(R.id.tabCreateExam)
        tabManage.setOnClickListener { selectTab(0) }
        tabSubjects.setOnClickListener { selectTab(1) }
        tabCreate.setOnClickListener { selectTab(2) }
        selectTab(1)
    }

    private fun selectTab(idx: Int) {
        listOf(tabManage, tabSubjects, tabCreate).forEachIndexed { i, t ->
            if (i == idx) { t.setBackgroundResource(R.drawable.tab_selected_bg); t.setTextColor(Color.WHITE) }
            else { t.setBackgroundResource(R.drawable.tab_unselected_bg); t.setTextColor(Color.parseColor("#0D47A1")) }
        }
        when (idx) { 1 -> loadSubjects(); else -> showInfo(if (idx==0) "Manage exams on the web portal for full functionality." else "Create exams from the web portal.") }
    }

    private fun loadSubjects() {
        scope.launch {
            progress.visibility = View.VISIBLE; container.removeAllViews()
            val subjects = withContext(Dispatchers.IO) { ApiClient(requireContext()).getMySubjects() }
            progress.visibility = View.GONE
            if (subjects.isEmpty()) { showInfo("No subjects found. You may not have been assigned any classes yet."); return@launch }
            subjects.forEach { addCard(it) }
        }
    }

    private fun addCard(s: SubjectResult) {
        val card = LayoutInflater.from(context).inflate(R.layout.item_subject_card, container, false)
        card.findViewById<TextView>(R.id.tvSubjectTitle)?.text = "${s.className} ${s.stream} - ${s.subject}"
        card.findViewById<TextView>(R.id.tvExamLabel)?.text = "${s.examName} · ${s.term} ${s.year}".uppercase()
        card.findViewById<TextView>(R.id.tvMeanPoints)?.text = String.format("%.4f", s.meanPoints)
        card.findViewById<TextView>(R.id.tvMeanMarks)?.text = "%.1f".format(s.meanMarks) + "%"
        card.findViewById<TextView>(R.id.tvMeanGrade)?.text = s.meanGrade
        card.findViewById<TextView>(R.id.tvStudentCount)?.text = s.totalStudents.toString()
        val isUp = s.trend >= 0
        val trendColor = if (isUp) Color.parseColor("#1B5E20") else Color.parseColor("#B71C1C")
        val trendVal = String.format("%.2f", Math.abs(s.trend))
        card.findViewById<TextView>(R.id.tvTrendPoints)?.apply { text = trendVal; setTextColor(trendColor) }
        card.findViewById<TextView>(R.id.tvTrendMarks)?.apply { text = trendVal; setTextColor(trendColor) }
        card.findViewById<ImageView>(R.id.ivTrendArrowPoints)?.setImageResource(if (isUp) R.drawable.ic_trend_up else R.drawable.ic_trend_down)
        card.findViewById<ImageView>(R.id.ivTrendArrowMarks)?.setImageResource(if (isUp) R.drawable.ic_trend_up else R.drawable.ic_trend_down)
        card.findViewById<Button>(R.id.btnAnalyze)?.setOnClickListener {
            Toast.makeText(context, "Analyzing ${s.subject}...", Toast.LENGTH_SHORT).show()
        }
        container.addView(card)
    }

    private fun showInfo(msg: String) {
        container.removeAllViews()
        TextView(context).apply {
            text = msg; textAlignment = View.TEXT_ALIGNMENT_CENTER
            setTextColor(Color.parseColor("#6B7280")); textSize = 14f; setPadding(32, 64, 32, 32)
            container.addView(this)
        }
    }
    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
