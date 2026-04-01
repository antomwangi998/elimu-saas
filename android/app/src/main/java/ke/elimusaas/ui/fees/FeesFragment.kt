package ke.elimusaas.ui.fees

import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.utils.ApiClient
import kotlinx.coroutines.*

class FeesFragment : Fragment() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View =
        i.inflate(R.layout.fragment_fees, c, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val progress = view.findViewById<ProgressBar>(R.id.progressFees)
        val container = view.findViewById<LinearLayout>(R.id.feesContainer)
        view.findViewById<Button>(R.id.btnOpenFees)?.setOnClickListener {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("${ApiClient.FRONTEND_URL}/#fees")))
        }
        scope.launch {
            progress?.visibility = View.VISIBLE
            val fees = withContext(Dispatchers.IO) { ApiClient(requireContext()).getFeeStats() }
            progress?.visibility = View.GONE
            if (fees.isEmpty()) return@launch
            val totalCollected = fees.sumOf { it.paid }
            val totalPending = fees.sumOf { it.balance }
            view.findViewById<TextView>(R.id.tvTotalCollected)?.text = "KES %,.0f".format(totalCollected)
            view.findViewById<TextView>(R.id.tvTotalPending)?.text = "KES %,.0f".format(totalPending)
            val rate = if (totalCollected + totalPending > 0) (totalCollected / (totalCollected + totalPending) * 100).toInt() else 0
            view.findViewById<ProgressBar>(R.id.progressFeeCollection)?.progress = rate
            view.findViewById<TextView>(R.id.tvCollectionRate)?.text = "$rate%"
        }
    }
    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
