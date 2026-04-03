
package ke.elimusaas.ui.superadmin
import android.os.Bundle; import android.view.*; import android.widget.*; import androidx.fragment.app.Fragment
import ke.elimusaas.R; import ke.elimusaas.utils.SessionManager

class SuperAdminSettingsFragment : Fragment() {
    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View = i.inflate(R.layout.fragment_settings, c, false)
    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val session = SessionManager(requireContext())
        view.findViewById<TextView>(R.id.tvSettingsName)?.text = session.user?.fullName ?: "Super Admin"
        view.findViewById<TextView>(R.id.tvSettingsEmail)?.text = session.user?.email ?: ""
        view.findViewById<TextView>(R.id.tvSettingsRole)?.text = "Super Administrator"
        view.findViewById<TextView>(R.id.tvSettingsSchool)?.text = "ElimuSaaS Platform"
        view.findViewById<TextView>(R.id.tvSettingsCode)?.text = "PLATFORM"
        view.findViewById<View>(R.id.btnLogout)?.setOnClickListener {
            session.logout()
            startActivity(android.content.Intent(requireContext(), ke.elimusaas.ui.LoginActivity::class.java).addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_CLEAR_TASK))
            requireActivity().finish()
        }
    }
}
