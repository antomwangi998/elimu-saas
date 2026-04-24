package ke.elimusaas.ui.discipline

import android.graphics.Color
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.utils.ApiClient
import kotlinx.coroutines.*

class DisciplineFragment : Fragment() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View =
        i.inflate(R.layout.fragment_discipline, c, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val container = view.findViewById<LinearLayout>(R.id.disciplineContainer)
        val progress = view.findViewById<ProgressBar>(R.id.progressDiscipline)
        val tvStats = view.findViewById<TextView>(R.id.tvDisciplineStats)

        scope.launch {
            progress?.visibility = View.VISIBLE
            val records = withContext(Dispatchers.IO) { ApiClient(requireContext()).getDisciplineRecords() }
            progress?.visibility = View.GONE
            tvStats?.text = "${records.size} Discipline Records"
            if (records.isEmpty()) {
                container?.addView(makeEmpty("No discipline records found.\nAll students are well-behaved! 🎉"))
                return@launch
            }
            records.take(30).forEach { rec ->
                val card = layoutInflater.inflate(R.layout.item_student_row, container, false)
                val severity = rec.severity
                val color = when (severity.lowercase()) {
                    "high" -> "#FFEBEE"
                    "medium" -> "#FFF3E0"
                    else -> "#E8F5E9"
                }
                card.setBackgroundColor(Color.parseColor(color))
                card.findViewById<TextView>(R.id.tvStudentInitials)?.text = "⚖️"
                card.findViewById<TextView>(R.id.tvStudentName)?.text = rec.studentName
                card.findViewById<TextView>(R.id.tvStudentAdm)?.text = rec.description.take(60)
                card.findViewById<TextView>(R.id.tvStudentGrade)?.apply {
                    text = severity.uppercase()
                    setTextColor(when(severity.lowercase()) {
                        "high" -> Color.parseColor("#C62828")
                        "medium" -> Color.parseColor("#E65100")
                        else -> Color.parseColor("#2E7D32")
                    })
                }
                card.findViewById<TextView>(R.id.tvStudentMarks)?.text = rec.date.take(10)
                card.findViewById<TextView>(R.id.tvStudentPosition)?.visibility = View.GONE
                container?.addView(card)
            }
        }
    }

    private fun makeEmpty(msg: String) = TextView(context).apply {
        text = msg; textAlignment = View.TEXT_ALIGNMENT_CENTER
        setTextColor(Color.parseColor("#6B7280")); textSize = 14f
        setPadding(32, 64, 32, 32)
    }

    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
