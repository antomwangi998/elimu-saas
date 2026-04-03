package ke.elimusaas.ui.bursar
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.utils.ApiClient
import ke.elimusaas.utils.SessionManager
import kotlinx.coroutines.*

class BursarDashboardFragment : Fragment() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View = i.inflate(R.layout.fragment_bursar_dashboard, c, false)
    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val session = SessionManager(requireContext()); val user = session.user
        view.findViewById<TextView>(R.id.tvBursarName)?.text = "Hello, ${user?.firstName ?: "Bursar"} 👋"
        view.findViewById<TextView>(R.id.tvBursarSchool)?.text = user?.schoolName ?: ""
        scope.launch {
            val fees = withContext(Dispatchers.IO) { try { ApiClient(requireContext()).getFeeStats() } catch(_:Exception){ emptyList() } }
            if (!isAdded) return@launch
            val collected = fees.sumOf { it.paid }
            val pending   = fees.sumOf { it.balance }
            val total     = collected + pending
            val rate      = if (total > 0) (collected / total * 100).toInt() else 0
            view.findViewById<TextView>(R.id.tvBursarCollected)?.text = "KES %,.0f".format(collected)
            view.findViewById<TextView>(R.id.tvBursarPending)?.text   = "KES %,.0f".format(pending)
            view.findViewById<TextView>(R.id.tvBursarRate)?.text       = "$rate%"
            view.findViewById<ProgressBar>(R.id.progressBursarFee)?.progress = rate
            view.findViewById<TextView>(R.id.tvBursarDefaulters)?.text = fees.count { it.balance > 0 }.toString()
        }
        view.findViewById<View>(R.id.btnBursarPayments)?.setOnClickListener { (activity as? ke.elimusaas.ui.MainActivity)?.load(ke.elimusaas.ui.fees.FeesFragment()) }
        view.findViewById<View>(R.id.btnBursarReport)?.setOnClickListener { (activity as? ke.elimusaas.ui.MainActivity)?.load(ke.elimusaas.ui.reports.ReportsFragment()) }
    }
    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
