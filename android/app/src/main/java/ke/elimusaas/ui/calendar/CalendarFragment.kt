package ke.elimusaas.ui.calendar

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
        val tv = view.findViewById<TextView>(R.id.tvComingSoon)
        tv?.text = "Calendar — loading data from backend..."
        scope.launch {
            val api = ApiClient(requireContext())
        }
    }

    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
