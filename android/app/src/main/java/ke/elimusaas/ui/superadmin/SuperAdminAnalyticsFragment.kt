package ke.elimusaas.ui.superadmin
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.utils.ApiClient
import kotlinx.coroutines.*

class SuperAdminAnalyticsFragment : Fragment() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View = i.inflate(R.layout.fragment_simple_list, c, false)
    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        view.findViewById<TextView>(R.id.tvSimpleTitle)?.text = "📈 Platform Analytics"
        val container = view.findViewById<LinearLayout>(R.id.simpleContainer)
        val metrics = listOf("Total Revenue: KES 2.4M","Active Schools: 124","Monthly Growth: +8.3%","Avg Students/School: 480","Top County: Nairobi (34 schools)","Retention Rate: 94%","NPS Score: 72")
        metrics.forEach { m -> container?.addView(TextView(context).apply { text = "• $m"; textSize=14f; setPadding(16,12,16,12); setTextColor(android.graphics.Color.parseColor("#0D1117")) }) }
    }
    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
