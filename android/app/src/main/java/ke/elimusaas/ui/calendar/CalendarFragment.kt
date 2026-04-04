package ke.elimusaas.ui.calendar

import android.graphics.Color
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.utils.ApiClient
import kotlinx.coroutines.*

class CalendarFragment : Fragment() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View =
        i.inflate(R.layout.fragment_calendar, c, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val progress = view.findViewById<ProgressBar>(R.id.progressCalendar)
        val container = view.findViewById<LinearLayout>(R.id.calendarEventsContainer)

        scope.launch {
            progress?.visibility = View.VISIBLE
            val events = withContext(Dispatchers.IO) { ApiClient(requireContext()).getEvents() }
            progress?.visibility = View.GONE

            if (events.isEmpty()) {
                container?.addView(TextView(context).apply {
                    text = "No upcoming events.\nEvents are managed from the web portal."
                    textAlignment = View.TEXT_ALIGNMENT_CENTER
                    setTextColor(Color.parseColor("#6B7280")); textSize = 14f
                    setPadding(32, 64, 32, 32)
                })
                return@launch
            }

            events.forEach { ev ->
                val row = LayoutInflater.from(context).inflate(R.layout.item_student_row, container, false)
                row.findViewById<TextView>(R.id.tvStudentInitials)?.apply {
                    text = "📅"; textSize = 16f
                    setBackgroundResource(R.drawable.stat_icon_bg_blue)
                }
                row.findViewById<TextView>(R.id.tvStudentName)?.text = ev.title
                row.findViewById<TextView>(R.id.tvStudentAdm)?.text = ev.date
                row.findViewById<TextView>(R.id.tvStudentGrade)?.text = ev.type.uppercase()
                row.findViewById<TextView>(R.id.tvStudentMarks)?.visibility = View.GONE
                row.findViewById<TextView>(R.id.tvStudentPosition)?.visibility = View.GONE
                container?.addView(row)
            }
        }
    }
    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
