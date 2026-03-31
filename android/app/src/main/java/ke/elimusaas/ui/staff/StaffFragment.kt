package ke.elimusaas.ui.staff

import android.graphics.Color
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.utils.SessionManager

class StaffFragment : Fragment() {

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View =
        inflater.inflate(R.layout.fragment_staff, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val session = SessionManager(requireContext())
        val user = session.user

        view.findViewById<TextView>(R.id.tvProfileName).text = user?.fullName ?: "-"
        view.findViewById<TextView>(R.id.tvProfileRole).text = user?.displayRole ?: "-"
        view.findViewById<TextView>(R.id.tvProfileEmail).text = user?.email ?: "-"
        view.findViewById<TextView>(R.id.tvProfileSchool).text = user?.schoolName ?: "-"
        view.findViewById<TextView>(R.id.tvProfileCode).text = user?.schoolCode ?: "-"
        view.findViewById<TextView>(R.id.tvProfileInitials).text = user?.initials ?: "E"

        view.findViewById<Button>(R.id.btnOpenWebPortal).setOnClickListener {
            val intent = android.content.Intent(
                android.content.Intent.ACTION_VIEW,
                android.net.Uri.parse("https://elimu-saas-frontend.onrender.com")
            )
            startActivity(intent)
        }
    }
}
