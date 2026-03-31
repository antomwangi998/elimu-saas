package ke.elimusaas.ui.dashboard

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.data.DashboardStats
import ke.elimusaas.utils.ApiClient
import ke.elimusaas.utils.SessionManager
import kotlinx.coroutines.*

class DashboardFragment : Fragment() {

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View =
        inflater.inflate(R.layout.fragment_dashboard, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val session = SessionManager(requireContext())
        val api = ApiClient(requireContext())
        val user = session.user

        // Set welcome text
        view.findViewById<TextView>(R.id.tvWelcomeName).text = user?.firstName ?: "Welcome"
        view.findViewById<TextView>(R.id.tvSchoolName).text = user?.schoolName ?: "ElimuSaaS"
        view.findViewById<TextView>(R.id.tvUserRole).text = user?.displayRole ?: ""

        // Set initials avatar
        view.findViewById<TextView>(R.id.tvAvatar).text = user?.initials ?: "E"

        val progressBar = view.findViewById<ProgressBar>(R.id.progressDashboard)
        val contentLayout = view.findViewById<LinearLayout>(R.id.layoutContent)

        scope.launch {
            progressBar.visibility = View.VISIBLE
            contentLayout.visibility = View.GONE

            val stats = withContext(Dispatchers.IO) { api.getDashboardStats() }

            progressBar.visibility = View.GONE
            contentLayout.visibility = View.VISIBLE

            bindStats(view, stats)
        }
    }

    private fun bindStats(view: View, stats: DashboardStats) {
        view.findViewById<TextView>(R.id.tvStudentsCount).text = stats.totalStudents.toString()
        view.findViewById<TextView>(R.id.tvTeachersCount).text = stats.totalTeachers.toString()
        view.findViewById<TextView>(R.id.tvStaffCount).text = stats.totalStaff.toString()
        view.findViewById<TextView>(R.id.tvStreamsCount).text = stats.totalStreams.toString()

        val feeRate = view.findViewById<TextView>(R.id.tvFeeRate)
        val attendanceRate = view.findViewById<TextView>(R.id.tvAttendanceRate)

        feeRate.text = "${stats.feeCollectionRate.toInt()}%"
        attendanceRate.text = "${stats.attendanceRate.toInt()}%"

        val feeProgress = view.findViewById<ProgressBar>(R.id.progressFee)
        val attendanceProgress = view.findViewById<ProgressBar>(R.id.progressAttendance)
        feeProgress.progress = stats.feeCollectionRate.toInt()
        attendanceProgress.progress = stats.attendanceRate.toInt()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        scope.cancel()
    }
}
