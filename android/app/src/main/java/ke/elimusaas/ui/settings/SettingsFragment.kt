package ke.elimusaas.ui.settings

import android.content.Intent
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.ui.LoginActivity
import ke.elimusaas.utils.SessionManager

class SettingsFragment : Fragment() {

    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View =
        i.inflate(R.layout.fragment_settings, c, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val session = SessionManager(requireContext())
        val user = session.user

        view.findViewById<TextView>(R.id.tvSettingsName)?.text = user?.fullName ?: "User"
        view.findViewById<TextView>(R.id.tvSettingsEmail)?.text = user?.email ?: ""
        view.findViewById<TextView>(R.id.tvSettingsRole)?.text = user?.displayRole ?: ""
        view.findViewById<TextView>(R.id.tvSettingsSchool)?.text = user?.schoolName ?: "ElimuSaaS"
        view.findViewById<TextView>(R.id.tvSettingsCode)?.text = user?.schoolCode ?: "—"
        view.findViewById<TextView>(R.id.tvAppVersion)?.text = "ElimuSaaS v1.0.0 · Kenya 🇰🇪"

        view.findViewById<Switch>(R.id.switchNotifications)?.apply {
            isChecked = true
            setOnCheckedChangeListener { _, checked ->
                Toast.makeText(context,
                    if (checked) "Notifications enabled" else "Notifications disabled",
                    Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<Switch>(R.id.switchBiometric)?.apply {
            isChecked = ke.elimusaas.utils.BiometricHelper.isAvailable(requireContext())
            setOnCheckedChangeListener { _, checked ->
                Toast.makeText(context,
                    if (checked) "Biometric login enabled" else "Biometric login disabled",
                    Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<View>(R.id.btnClearCache)?.setOnClickListener {
            ke.elimusaas.utils.OfflineCache(requireContext()).clear()
            Toast.makeText(context, "Cache cleared ✓", Toast.LENGTH_SHORT).show()
        }

        view.findViewById<View>(R.id.btnChangePassword)?.setOnClickListener {
            Toast.makeText(context, "Use the web portal to change your password", Toast.LENGTH_LONG).show()
        }

        view.findViewById<View>(R.id.btnLogout)?.setOnClickListener {
            AlertDialog.Builder(requireContext())
                .setTitle("Sign Out")
                .setMessage("Are you sure you want to sign out?")
                .setPositiveButton("Sign Out") { _, _ ->
                    session.logout()
                    startActivity(Intent(requireContext(), LoginActivity::class.java)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
                    requireActivity().finish()
                }
                .setNegativeButton("Cancel", null).show()
        }
    }
}
