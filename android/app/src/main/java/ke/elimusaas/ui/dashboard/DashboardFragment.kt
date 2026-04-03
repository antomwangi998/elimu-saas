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

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        try {
            val session = SessionManager(requireContext())
            val user = session.user

            // Safe null-checked view updates
            view.findViewById<TextView>(R.id.tvWelcomeName)?.text =
                user?.firstName?.ifBlank { "User" } ?: "User"
            view.findViewById<TextView>(R.id.tvSchoolName)?.text =
                user?.schoolName?.ifBlank { "ElimuSaaS" } ?: "ElimuSaaS"
            view.findViewById<TextView>(R.id.tvUserRole)?.text =
                user?.displayRole ?: ""
            view.findViewById<TextView>(R.id.tvAvatar)?.text =
                user?.initials ?: "E"

            val progress = view.findViewById<ProgressBar>(R.id.progressDashboard)
            val content = view.findViewById<View>(R.id.layoutContent)

            progress?.visibility = View.VISIBLE
            content?.visibility = View.GONE

            view.findViewById<Button>(R.id.btnOpenWebPortal)?.setOnClickListener {
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(ApiClient.FRONTEND_URL)))
                } catch (e: Exception) {
                    Toast.makeText(context, "Cannot open browser", Toast.LENGTH_SHORT).show()
                }
            }

            // Only load stats if user has a school (not super admin without school)
            val hasSchool = user?.schoolId != null
            if (hasSchool) {
                loadStats(view, progress, content)
            } else {
                // Super admin or user without school - show platform stats
                progress?.visibility = View.GONE
                content?.visibility = View.VISIBLE
                view.findViewById<TextView>(R.id.tvStudentsCount)?.text = "—"
                view.findViewById<TextView>(R.id.tvTeachersCount)?.text = "—"
                view.findViewById<TextView>(R.id.tvStaffCount)?.text = "—"
                view.findViewById<TextView>(R.id.tvStreamsCount)?.text = "—"
                view.findViewById<TextView>(R.id.tvFeeRate)?.text = "—"
                view.findViewById<TextView>(R.id.tvAttendanceRate)?.text = "—"
                view.findViewById<TextView>(R.id.tvFeesCollected)?.text = "N/A"
                view.findViewById<TextView>(R.id.tvFeesPending)?.text = "N/A"
                view.findViewById<TextView>(R.id.tvSchoolName)?.text = "Platform Overview"
                Toast.makeText(context,
                    "Sign in as a school admin to see school data",
                    Toast.LENGTH_LONG).show()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun loadStats(view: View, progress: ProgressBar?, content: View?) {
        scope.launch {
            try {
                val stats = withContext(Dispatchers.IO) {
                    ApiClient(requireContext()).getDashboardStats()
                }
                if (!isAdded) return@launch
                progress?.visibility = View.GONE
                content?.visibility = View.VISIBLE
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
            } catch (e: Exception) {
                if (!isAdded) return@launch
                progress?.visibility = View.GONE
                content?.visibility = View.VISIBLE
                Toast.makeText(context, "Could not load stats: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        scope.cancel()
    }
}
