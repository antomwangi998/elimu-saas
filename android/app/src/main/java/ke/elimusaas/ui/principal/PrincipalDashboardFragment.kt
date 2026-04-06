package ke.elimusaas.ui.principal
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.utils.ApiClient
import ke.elimusaas.utils.SessionManager
import kotlinx.coroutines.*

class PrincipalDashboardFragment : Fragment() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View = i.inflate(R.layout.fragment_dashboard, c, false)
    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val session = SessionManager(requireContext()); val user = session.user
        view.findViewById<TextView>(R.id.tvWelcomeName)?.text = user?.firstName ?: "Principal"
        view.findViewById<TextView>(R.id.tvSchoolName)?.text = user?.schoolName ?: "ElimuSaaS"
        view.findViewById<TextView>(R.id.tvUserRole)?.text = user?.displayRole ?: ""
        view.findViewById<TextView>(R.id.tvAvatar)?.text = user?.initials ?: "P"
        view.findViewById<View>(R.id.cardSuperAdmin)?.visibility = View.GONE
        val progress = view.findViewById<ProgressBar>(R.id.progressDashboard)
        val content  = view.findViewById<View>(R.id.layoutContent)
        if (user?.schoolId == null) { progress?.visibility=View.GONE; content?.visibility=View.VISIBLE; return }
        scope.launch {
            progress?.visibility = View.VISIBLE
            val stats = withContext(Dispatchers.IO) { try { ApiClient(requireContext()).getDashboardStats() } catch(_:Exception){ ke.elimusaas.data.DashboardStats() } }
            if (!isAdded) return@launch
            progress?.visibility = View.GONE; content?.visibility = View.VISIBLE
            view.findViewById<TextView>(R.id.tvStudentsCount)?.text = stats.totalStudents.toString()
            view.findViewById<TextView>(R.id.tvTeachersCount)?.text = stats.totalTeachers.toString()
            view.findViewById<TextView>(R.id.tvStaffCount)?.text   = stats.totalStaff.toString()
            view.findViewById<TextView>(R.id.tvStreamsCount)?.text  = stats.totalStreams.toString()
            view.findViewById<TextView>(R.id.tvFeeRate)?.text       = "${stats.feeCollectionRate.toInt()}%"
            view.findViewById<TextView>(R.id.tvAttendanceRate)?.text = "${stats.attendanceRate.toInt()}%"
            view.findViewById<ProgressBar>(R.id.progressFee)?.progress        = stats.feeCollectionRate.toInt()
            view.findViewById<ProgressBar>(R.id.progressAttendance)?.progress = stats.attendanceRate.toInt()
            view.findViewById<TextView>(R.id.tvFeesCollected)?.text = "KES %,.0f".format(stats.totalFeesCollected)
            view.findViewById<TextView>(R.id.tvFeesPending)?.text   = "KES %,.0f".format(stats.totalFeesPending)
        }
        view.findViewById<Button>(R.id.btnOpenWebPortal)?.setOnClickListener { startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(ApiClient.FRONTEND_URL))) }
    }
    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
