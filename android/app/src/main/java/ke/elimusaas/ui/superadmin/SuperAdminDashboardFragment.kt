
package ke.elimusaas.ui.superadmin
import android.app.AlertDialog; import android.content.Intent; import android.os.Bundle
import android.view.*; import android.widget.*; import androidx.fragment.app.Fragment
import ke.elimusaas.R; import ke.elimusaas.utils.ApiClient; import ke.elimusaas.utils.SessionManager
import kotlinx.coroutines.*

class SuperAdminDashboardFragment : Fragment() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View =
        i.inflate(R.layout.fragment_superadmin_dashboard, c, false)
    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val session = SessionManager(requireContext())
        val user = session.user
        view.findViewById<TextView>(R.id.tvSAName)?.text = "Welcome, ${user?.firstName ?: "Admin"} 👋"
        view.findViewById<TextView>(R.id.tvSAEmail)?.text = user?.email ?: ""
        loadStats(view)
        view.findViewById<View>(R.id.btnSAOnboard)?.setOnClickListener { showOnboardDialog() }
        view.findViewById<View>(R.id.btnSALoginAs)?.setOnClickListener { showLoginAsDialog() }
        view.findViewById<View>(R.id.btnSASchools)?.setOnClickListener { nav(SuperAdminSchoolsFragment()) }
        view.findViewById<View>(R.id.btnSAAnalytics)?.setOnClickListener { nav(SuperAdminAnalyticsFragment()) }
        view.findViewById<View>(R.id.btnSASubscriptions)?.setOnClickListener { nav(SuperAdminSubscriptionsFragment()) }
        view.findViewById<View>(R.id.btnSAUsers)?.setOnClickListener { nav(SuperAdminUsersFragment()) }
        view.findViewById<View>(R.id.btnSASettings)?.setOnClickListener { nav(SuperAdminSettingsFragment()) }
    }
    private fun nav(f: Fragment) = (activity as? ke.elimusaas.ui.MainActivity)?.load(f)
    private fun loadStats(view: View) {
        scope.launch {
            view.findViewById<ProgressBar>(R.id.progressSA)?.visibility = View.VISIBLE
            val stats = withContext(Dispatchers.IO) { try { ApiClient(requireContext()).getPlatformStats() } catch(_:Exception){null} }
            if (!isAdded) return@launch
            view.findViewById<ProgressBar>(R.id.progressSA)?.visibility = View.GONE
            stats?.let {
                view.findViewById<TextView>(R.id.tvTotalSchools)?.text = it.optString("totalSchools","—")
                view.findViewById<TextView>(R.id.tvTotalStudents)?.text = it.optString("totalStudents","—")
                view.findViewById<TextView>(R.id.tvActiveSchools)?.text = it.optString("activeSchools","—")
                view.findViewById<TextView>(R.id.tvMRR)?.text = "KES ${it.optString("mrr","—")}"
            }
        }
    }
    private fun showOnboardDialog() {
        val layout = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL; setPadding(48,16,48,8) }
        val etName  = EditText(context).apply { hint = "School Name *" }
        val etCode  = EditText(context).apply { hint = "School Code * (ELITE001)"; inputType = android.text.InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS }
        val etEmail = EditText(context).apply { hint = "Admin Email *" }
        val etPhone = EditText(context).apply { hint = "Phone" }
        listOf(etName, etCode, etEmail, etPhone).forEach { layout.addView(it) }
        AlertDialog.Builder(requireContext()).setTitle("🏫 Onboard New School").setView(layout)
            .setPositiveButton("Create") { _,_ ->
                val name = etName.text.toString().trim(); val code = etCode.text.toString().trim().uppercase()
                val email = etEmail.text.toString().trim()
                if (name.isBlank()||code.isBlank()||email.isBlank()) { Toast.makeText(context,"Fill all fields",Toast.LENGTH_SHORT).show(); return@setPositiveButton }
                scope.launch {
                    val ok = withContext(Dispatchers.IO) { ApiClient(requireContext()).onboardSchool(name,code,email,etPhone.text.toString()) }
                    if (!isAdded) return@launch
                    Toast.makeText(context, if (ok) "✅ $name created! Credentials sent to $email" else "❌ Failed. Use web portal.", Toast.LENGTH_LONG).show()
                }
            }.setNegativeButton("Cancel",null).show()
    }
    private fun showLoginAsDialog() {
        val input = EditText(context).apply { hint = "School Code"; setPadding(48,24,48,8); inputType = android.text.InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS }
        AlertDialog.Builder(requireContext()).setTitle("🔑 Login as School Admin").setView(input)
            .setPositiveButton("Login") { _,_ ->
                val code = input.text.toString().trim().uppercase()
                if (code.isBlank()) return@setPositiveButton
                scope.launch {
                    val result = withContext(Dispatchers.IO) { ApiClient(requireContext()).loginAsSchool(code) }
                    if (!isAdded) return@launch
                    if (result?.accessToken != null) {
                        val session = SessionManager(requireContext())
                        session.accessToken = result.accessToken; session.refreshToken = result.refreshToken
                        if (result.user != null) session.user = result.user
                        Toast.makeText(context,"✅ Now as $code admin",Toast.LENGTH_LONG).show()
                        startActivity(Intent(requireContext(), ke.elimusaas.ui.MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
                        requireActivity().finish()
                    } else Toast.makeText(context,"❌ Check school code",Toast.LENGTH_LONG).show()
                }
            }.setNegativeButton("Cancel",null).show()
    }
    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
