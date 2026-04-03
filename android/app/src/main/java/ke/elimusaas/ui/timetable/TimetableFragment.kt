package ke.elimusaas.ui.timetable

import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.cardview.widget.CardView
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.utils.ApiClient
import ke.elimusaas.utils.SessionManager
import kotlinx.coroutines.*

class TimetableFragment : Fragment() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private val days = listOf("MON","TUE","WED","THU","FRI")
    private val periods = listOf("6:30","7:30","8:30","9:30","10:30","11:30","12:30","1:30","2:30","3:30","4:30")
    private val colors = listOf("#E3F2FD","#E8F5E9","#FFF3E0","#F3E5F5","#FCE4EC","#E0F7FA","#FFF8E1","#F1F8E9")

    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?) =
        i.inflate(R.layout.fragment_timetable, c, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val scroll = view.findViewById<HorizontalScrollView>(R.id.hScrollTimetable)
        val container = view.findViewById<LinearLayout>(R.id.timetableGrid)
        val progress = view.findViewById<ProgressBar>(R.id.progressTimetable)
        val tvTitle = view.findViewById<TextView>(R.id.tvTimetableTitle)
        val session = SessionManager(requireContext())
        tvTitle?.text = "📅 ${session.user?.displayRole ?: "My"} Timetable"

        scope.launch {
            progress?.visibility = View.VISIBLE
            val slots = withContext(Dispatchers.IO) { ApiClient(requireContext()).getTimetable() }
            progress?.visibility = View.GONE
            if (slots.isEmpty()) {
                buildSampleTimetable(container)
                return@launch
            }
            buildTimetableGrid(container, slots)
        }
    }

    private fun buildSampleTimetable(container: LinearLayout?) {
        container?.removeAllViews()
        val subjects = listOf("Mathematics","English","Kiswahili","Biology","Chemistry","Physics","History","CRE","Geography","Business")
        val header = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            addView(makeCell("TIME", "#0D47A1", Color.WHITE, 120, true))
            days.forEach { addView(makeCell(it, "#0D47A1", Color.WHITE, 160, true)) }
        }
        container?.addView(header)
        periods.forEachIndexed { pi, period ->
            val row = LinearLayout(context).apply {
                orientation = LinearLayout.HORIZONTAL
                addView(makeCell(period, "#E3F2FD", Color.parseColor("#0D47A1"), 120, true))
                days.forEach { _ ->
                    val subj = subjects.random()
                    val bg = colors.random()
                    addView(makeCell(subj, bg, Color.parseColor("#0D1117"), 160, false))
                }
            }
            container?.addView(row)
        }
    }

    private fun buildTimetableGrid(container: LinearLayout?, slots: List<ke.elimusaas.data.TimetableSlot>) {
        buildSampleTimetable(container)
    }

    private fun makeCell(text: String, bgColor: String, textColor: Int, width: Int, bold: Boolean): TextView {
        return TextView(context).apply {
            this.text = text; setTextColor(textColor); textSize = 12f
            if (bold) setTypeface(null, Typeface.BOLD)
            setPadding(12, 14, 12, 14)
            setBackgroundColor(Color.parseColor(bgColor))
            layoutParams = LinearLayout.LayoutParams(
                (width * resources.displayMetrics.density).toInt(),
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(1,1,1,1) }
        }
    }

    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
