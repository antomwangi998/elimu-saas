
package ke.elimusaas.ui.superadmin
import android.graphics.Color; import android.os.Bundle; import android.view.*; import android.widget.*; import androidx.fragment.app.Fragment
import ke.elimusaas.R; import ke.elimusaas.utils.ApiClient; import kotlinx.coroutines.*

class SuperAdminSubscriptionsFragment : Fragment() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View = i.inflate(R.layout.fragment_simple_list, c, false)
    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        view.findViewById<TextView>(R.id.tvSimpleTitle)?.text = "💳 Subscriptions"
        val container = view.findViewById<LinearLayout>(R.id.simpleContainer)
        scope.launch {
            val subs = withContext(Dispatchers.IO) { try { ApiClient(requireContext()).getSubscriptions() } catch(_:Exception){ emptyList() } }
            if (!isAdded) return@launch
            if (subs.isEmpty()) { container?.addView(TextView(context).apply { text="No subscriptions found"; textSize=14f; setPadding(16,64,16,32); textAlignment=View.TEXT_ALIGNMENT_CENTER; setTextColor(Color.parseColor("#6B7280")) }); return@launch }
            subs.take(30).forEach { sub ->
                val row = layoutInflater.inflate(R.layout.item_student_row, container, false)
                row.findViewById<TextView>(R.id.tvStudentInitials)?.text = "💳"
                row.findViewById<TextView>(R.id.tvStudentName)?.text = sub.schoolName
                row.findViewById<TextView>(R.id.tvStudentAdm)?.text = "${sub.plan} · Expires: ${sub.expiryDate.take(10)}"
                row.findViewById<TextView>(R.id.tvStudentGrade)?.apply { text=sub.status.uppercase(); setTextColor(if(sub.status=="active") Color.parseColor("#1B5E20") else Color.parseColor("#B71C1C")) }
                row.findViewById<TextView>(R.id.tvStudentMarks)?.text = "KES ${sub.amount}"
                row.findViewById<TextView>(R.id.tvStudentPosition)?.visibility = View.GONE
                container?.addView(row)
            }
        }
    }
    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
