package ke.elimusaas.ui.dashboard

import android.app.AlertDialog
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
            val isSuperAdmin = user?.role == "super_admin"

            view.findViewById<TextView>(R.id.tvWelcomeName)?.text = user?.firstName?.ifBlank { "User" } ?: "User"
            view.findViewById<TextView>(R.id.tvSchoolName)?.text =
                if (isSuperAdmin) "Platform Overview" else (user?.schoolName?.ifBlank { "ElimuSaaS" } ?: "ElimuSaaS")
            view.findViewById<TextView>(R.id.tvUserRole)?.text = user?.displayRole ?: ""
            view.findViewById<TextView>(R.id.tvAvatar)?.text = user?.initials ?: "E"

            val progress = view.findViewById<ProgressBar>(R.id.progressDashboard)
            val content = view.findViewById<View>(R.id.layoutContent)

            // Super admin quick actions
            val superAdminCard = view.findViewById<View>(R.id.cardSuperAdmin)
            if (isSuperAdmin) {
                superAdminCard?.visibility = View.VISIBLE
                view.findViewById<Button>(R.id.btnOnboardSchool)?.setOnClickListener {
                    showOnboardSchoolDialog()
                }
                view.findViewById<Button>(R.id.btnLoginAsSchool)?.setOnClickListener {
                    showLoginAsSchoolDialog()
                }
                view.findViewById<Button>(R.id.btnManageSchools)?.setOnClickListener {
                    startActivity(Intent(Intent.ACTION_VIEW,
                        Uri.parse("${ApiClient.FRONTEND_URL}/#superadmin-schools")))
                }
            } else {
                superAdminCard?.visibility = View.GONE
            }

            view.findViewById<Button>(R.id.btnOpenWebPortal)?.setOnClickListener {
                try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(ApiClient.FRONTEND_URL))) }
                catch (e: Exception) { Toast.makeText(context, "Cannot open browser", Toast.LENGTH_SHORT).show() }
            }

            if (!isSuperAdmin && user?.schoolId != null) {
                progress?.visibility = View.VISIBLE
                content?.visibility = View.GONE
                loadStats(view, progress, content)
            } else {
                progress?.visibility = View.GONE
                content?.visibility = View.VISIBLE
                setPlaceholderStats(view)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun setPlaceholderStats(view: View) {
        listOf(R.id.tvStudentsCount, R.id.tvTeachersCount,
               R.id.tvStaffCount, R.id.tvStreamsCount).forEach {
            view.findViewById<TextView>(it)?.text = "—"
        }
        view.findViewById<TextView>(R.id.tvFeeRate)?.text = "—"
        view.findViewById<TextView>(R.id.tvAttendanceRate)?.text = "—"
        view.findViewById<TextView>(R.id.tvFeesCollected)?.text = "Use web portal"
        view.findViewById<TextView>(R.id.tvFeesPending)?.text = "for full admin"
    }

    private fun loadStats(view: View, progress: ProgressBar?, content: View?) {
        scope.launch {
            try {
                val stats = withContext(Dispatchers.IO) { ApiClient(requireContext()).getDashboardStats() }
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
                view.findViewById<TextView>(R.id.tvFeesCollected)?.text = "KES %,.0f".format(stats.totalFeesCollected)
                view.findViewById<TextView>(R.id.tvFeesPending)?.text = "KES %,.0f".format(stats.totalFeesPending)
            } catch (e: Exception) {
                if (!isAdded) return@launch
                progress?.visibility = View.GONE
                content?.visibility = View.VISIBLE
                setPlaceholderStats(view)
            }
        }
    }

    private fun showOnboardSchoolDialog() {
        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL; setPadding(48, 24, 48, 8)
        }
        val etName = EditText(context).apply { hint = "School Name" }
        val etCode = EditText(context).apply { hint = "School Code (e.g. ELITE001)"; inputType = android.text.InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS }
        val etEmail = EditText(context).apply { hint = "Admin Email"; inputType = android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS }
        val etPhone = EditText(context).apply { hint = "Phone Number"; inputType = android.text.InputType.TYPE_CLASS_PHONE }
        layout.addView(etName); layout.addView(etCode); layout.addView(etEmail); layout.addView(etPhone)

        AlertDialog.Builder(requireContext())
            .setTitle("Onboard New School")
            .setView(layout)
            .setPositiveButton("Create School") { _, _ ->
                val name = etName.text.toString().trim()
                val code = etCode.text.toString().trim().uppercase()
                val email = etEmail.text.toString().trim()
                if (name.isEmpty() || code.isEmpty() || email.isEmpty()) {
                    Toast.makeText(context, "Please fill all required fields", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                scope.launch {
                    val result = withContext(Dispatchers.IO) {
                        ApiClient(requireContext()).onboardSchool(name, code, email, etPhone.text.toString())
                    }
                    if (!isAdded) return@launch
                    if (result) {
                        Toast.makeText(context, "✅ School $name onboarded! Admin credentials sent to $email", Toast.LENGTH_LONG).show()
                    } else {
                        Toast.makeText(context, "Failed to onboard school. Please try via web portal.", Toast.LENGTH_LONG).show()
                    }
                }
            }
            .setNegativeButton("Cancel", null).show()
    }

    private fun showLoginAsSchoolDialog() {
        val input = EditText(context).apply { hint = "School Code (e.g. DEMO001)"; setPadding(48, 24, 48, 8)
            inputType = android.text.InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS }
        AlertDialog.Builder(requireContext())
            .setTitle("Login as School Admin")
            .setMessage("Enter the school code to impersonate its admin account")
            .setView(input)
            .setPositiveButton("Login") { _, _ ->
                val code = input.text.toString().trim().uppercase()
                if (code.isEmpty()) return@setPositiveButton
                scope.launch {
                    val result = withContext(Dispatchers.IO) {
                        ApiClient(requireContext()).loginAsSchool(code)
                    }
                    if (!isAdded) return@launch
                    if (result != null) {
                        val session = SessionManager(requireContext())
                        session.accessToken = result.accessToken
                        session.refreshToken = result.refreshToken
                        if (result.user != null) session.user = result.user
                        Toast.makeText(context, "✅ Now logged in as ${code} admin", Toast.LENGTH_LONG).show()
                        // Reload dashboard
                        (activity as? ke.elimusaas.ui.MainActivity)?.load(DashboardFragment())
                    } else {
                        Toast.makeText(context, "Failed. Check school code and try again.", Toast.LENGTH_LONG).show()
                    }
                }
            }
            .setNegativeButton("Cancel", null).show()
    }

    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
