package ke.elimusaas.ui.reports

import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.utils.ApiClient
import kotlinx.coroutines.*

class ReportsFragment : Fragment() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View =
        i.inflate(R.layout.fragment_reports, c, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val tv = view.findViewById<TextView>(R.id.tvComingSoon)
        tv?.text = "Reports — loading data from backend..."
        scope.launch {
            val api = ApiClient(requireContext())
        }
    }

    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
