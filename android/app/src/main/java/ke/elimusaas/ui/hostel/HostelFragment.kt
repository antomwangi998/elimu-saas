package ke.elimusaas.ui.hostel

import android.graphics.Color
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.utils.ApiClient
import kotlinx.coroutines.*

class HostelFragment : Fragment() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?) =
        i.inflate(R.layout.fragment_hostel, c, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val container = view.findViewById<LinearLayout>(R.id.hostelContainer)
        val progress = view.findViewById<ProgressBar>(R.id.progressHostel)
        scope.launch {
            progress?.visibility = View.VISIBLE
            val students = withContext(Dispatchers.IO) {
                ApiClient(requireContext()).getStudents("").filter { s -> s.admNo.isNotEmpty() }.take(20)
            }
            progress?.visibility = View.GONE
            if (students.isEmpty()) {
                container?.addView(makeInfo("No boarding students found."))
                return@launch
            }
            view.findViewById<TextView>(R.id.tvHostelCount)?.text = "${students.size} Boarders"
            students.forEach { s ->
                val row = layoutInflater.inflate(R.layout.item_student_row, container, false)
                row.findViewById<TextView>(R.id.tvStudentInitials)?.apply {
                    text = "🛏"; textSize = 16f
                    setBackgroundResource(R.drawable.stat_icon_bg_purple)
                }
                row.findViewById<TextView>(R.id.tvStudentName)?.text = s.name
                row.findViewById<TextView>(R.id.tvStudentAdm)?.text = "${s.admNo} · ${s.stream}"
                row.findViewById<TextView>(R.id.tvStudentGrade)?.text = "BOARDING"
                row.findViewById<TextView>(R.id.tvStudentMarks)?.visibility = View.GONE
                row.findViewById<TextView>(R.id.tvStudentPosition)?.visibility = View.GONE
                container?.addView(row)
            }
        }
    }

    private fun makeInfo(msg: String) = TextView(context).apply {
        text = msg; textAlignment = View.TEXT_ALIGNMENT_CENTER
        setTextColor(Color.parseColor("#6B7280")); textSize = 14f; setPadding(32, 64, 32, 32)
    }

    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
