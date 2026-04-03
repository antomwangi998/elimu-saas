package ke.elimusaas.ui.communication

import android.graphics.Color
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.utils.ApiClient
import kotlinx.coroutines.*

class CommunicationFragment : Fragment() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View =
        i.inflate(R.layout.fragment_communication, c, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val progress = view.findViewById<ProgressBar>(R.id.progressComm)
        val container = view.findViewById<LinearLayout>(R.id.commContainer)

        scope.launch {
            progress?.visibility = View.VISIBLE
            val notifs = withContext(Dispatchers.IO) { ApiClient(requireContext()).getNotifications() }
            progress?.visibility = View.GONE

            if (notifs.isEmpty()) {
                container?.addView(TextView(context).apply {
                    text = "No notifications yet.\nSend messages from the web portal."
                    textAlignment = View.TEXT_ALIGNMENT_CENTER
                    setTextColor(Color.parseColor("#6B7280")); textSize = 14f
                    setPadding(32, 64, 32, 32)
                })
                return@launch
            }

            notifs.forEach { n ->
                val row = LayoutInflater.from(context).inflate(R.layout.item_student_row, container, false)
                row.findViewById<TextView>(R.id.tvStudentInitials)?.apply {
                    text = if (n.isRead) "✉️" else "🔔"; textSize = 16f
                    setBackgroundResource(if (n.isRead) R.drawable.stat_icon_bg_blue else R.drawable.stat_icon_bg_orange)
                }
                row.findViewById<TextView>(R.id.tvStudentName)?.apply {
                    text = n.title; if (!n.isRead) setTypeface(null, android.graphics.Typeface.BOLD)
                }
                row.findViewById<TextView>(R.id.tvStudentAdm)?.text = n.message.take(80)
                row.findViewById<TextView>(R.id.tvStudentGrade)?.text = n.createdAt.take(10)
                row.findViewById<TextView>(R.id.tvStudentMarks)?.visibility = View.GONE
                row.findViewById<TextView>(R.id.tvStudentPosition)?.visibility = View.GONE
                container?.addView(row)
            }
        }
    }
    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
