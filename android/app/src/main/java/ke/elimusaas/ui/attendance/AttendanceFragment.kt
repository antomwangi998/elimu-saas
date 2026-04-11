package ke.elimusaas.ui.attendance

import android.graphics.Color
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.utils.ApiClient
import kotlinx.coroutines.*

class AttendanceFragment : Fragment() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View =
        i.inflate(R.layout.fragment_attendance, c, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val progress = view.findViewById<ProgressBar>(R.id.progressAttendanceF)
        val container = view.findViewById<LinearLayout>(R.id.attendanceContainer)
        val tvRate = view.findViewById<TextView>(R.id.tvOverallAttendance)
        val tvPresent = view.findViewById<TextView>(R.id.tvTotalPresent)
        val tvAbsent = view.findViewById<TextView>(R.id.tvTotalAbsent)
        val bar = view.findViewById<ProgressBar>(R.id.progressAttendanceBar)

        scope.launch {
            progress?.visibility = View.VISIBLE
            val records = withContext(Dispatchers.IO) { ApiClient(requireContext()).getAttendance() }
            progress?.visibility = View.GONE

            if (records.isEmpty()) {
                container?.addView(makeInfo("No attendance records found.\nStart marking attendance from the web portal."))
                return@launch
            }

            val avgRate = records.map { it.rate }.average()
            val totalPresent = records.sumOf { it.present }
            val totalAbsent = records.sumOf { it.absent }

            tvRate?.text = "%.1f%%".format(avgRate)
            tvPresent?.text = totalPresent.toString()
            tvAbsent?.text = totalAbsent.toString()
            bar?.progress = avgRate.toInt()

            records.take(30).forEach { rec ->
                val row = LayoutInflater.from(context).inflate(R.layout.item_student_row, container, false)
                row.findViewById<TextView>(R.id.tvStudentInitials)?.apply {
                    text = "✅"; textSize = 16f
                    setBackgroundResource(R.drawable.stat_icon_bg_green)
                }
                row.findViewById<TextView>(R.id.tvStudentName)?.text = rec.date.ifBlank { "Date" }
                row.findViewById<TextView>(R.id.tvStudentAdm)?.text =
                    "Present: ${rec.present}  ·  Absent: ${rec.absent}  ·  Total: ${rec.total}"
                row.findViewById<TextView>(R.id.tvStudentGrade)?.text = "%.0f%%".format(rec.rate)
                row.findViewById<TextView>(R.id.tvStudentGrade)?.setTextColor(
                    if (rec.rate >= 80) Color.parseColor("#1B5E20") else Color.parseColor("#B71C1C")
                )
                row.findViewById<TextView>(R.id.tvStudentMarks)?.visibility = View.GONE
                row.findViewById<TextView>(R.id.tvStudentPosition)?.visibility = View.GONE
                container?.addView(row)
            }
        }
    }

    private fun makeInfo(msg: String) = TextView(context).apply {
        text = msg; textAlignment = View.TEXT_ALIGNMENT_CENTER
        setTextColor(Color.parseColor("#6B7280")); textSize = 14f
        setPadding(32, 64, 32, 32)
    }

    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
