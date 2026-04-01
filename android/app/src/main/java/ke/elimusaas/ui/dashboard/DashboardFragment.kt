package ke.elimusaas.ui.dashboard

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.utils.ApiClient
import ke.elimusaas.utils.SessionManager
import kotlinx.coroutines.*

class DashboardFragment : Fragment() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View =
        i.inflate(R.layout.fragment_dashboard, c, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val session = SessionManager(requireContext())
        val user = session.user
        view.findViewById<TextView>(R.id.tvWelcomeName)?.text = user?.firstName ?: "Teacher"
        view.findViewById<TextView>(R.id.tvSchoolName)?.text = user?.schoolName ?: "ElimuSaaS"
        view.findViewById<TextView>(R.id.tvUserRole)?.text = user?.displayRole ?: ""
        view.findViewById<TextView>(R.id.tvAvatar)?.text = user?.initials ?: "E"
        view.findViewById<ProgressBar>(R.id.progressDashboard)?.visibility = View.VISIBLE
        view.findViewById<View>(R.id.layoutContent)?.visibility = View.GONE

        view.findViewById<Button>(R.id.btnOpenWebPortal)?.setOnClickListener {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(ApiClient.FRONTEND_URL)))
        }

        scope.launch {
            val stats = withContext(Dispatchers.IO) { ApiClient(requireContext()).getDashboardStats() }
            view.findViewById<ProgressBar>(R.id.progressDashboard)?.visibility = View.GONE
            view.findViewById<View>(R.id.layoutContent)?.visibility = View.VISIBLE
            view.findViewById<TextView>(R.id.tvStudentsCount)?.text = stats.totalStudents.toString()
            view.findViewById<TextView>(R.id.tvTeachersCount)?.text = stats.totalTeachers.toString()
            view.findViewById<TextView>(R.id.tvStaffCount)?.text = stats.totalStaff.toString()
            view.findViewById<TextView>(R.id.tvStreamsCount)?.text = stats.totalStreams.toString()
            view.findViewById<TextView>(R.id.tvFeeRate)?.text = "${stats.feeCollectionRate.toInt()}%"
            view.findViewById<TextView>(R.id.tvAttendanceRate)?.text = "${stats.attendanceRate.toInt()}%"
            view.findViewById<ProgressBar>(R.id.progressFee)?.progress = stats.feeCollectionRate.toInt()
            view.findViewById<ProgressBar>(R.id.progressAttendance)?.progress = stats.attendanceRate.toInt()
            val fmt = "KES %,.0f"
            view.findViewById<TextView>(R.id.tvFeesCollected)?.text = fmt.format(stats.totalFeesCollected)
            view.findViewById<TextView>(R.id.tvFeesPending)?.text = fmt.format(stats.totalFeesPending)
        }
    }
    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
