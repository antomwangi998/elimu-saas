package ke.elimusaas.ui.reports

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.utils.ApiClient

class ReportsFragment : Fragment() {
    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View =
        i.inflate(R.layout.fragment_reports, c, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        view.findViewById<Button>(R.id.btnViewReports)?.setOnClickListener {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("${ApiClient.FRONTEND_URL}/#reports")))
        }
    }
}
