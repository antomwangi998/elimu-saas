package ke.elimusaas.ui.staff

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

class StaffFragment : Fragment() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View =
        i.inflate(R.layout.fragment_staff, c, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val session = SessionManager(requireContext())
        val user = session.user
        view.findViewById<TextView>(R.id.tvProfileInitials)?.text = user?.initials ?: "E"
        view.findViewById<TextView>(R.id.tvProfileName)?.text = user?.fullName ?: "-"
        view.findViewById<TextView>(R.id.tvProfileRole)?.text = user?.displayRole ?: "-"
        view.findViewById<TextView>(R.id.tvProfileEmail)?.text = user?.email ?: "-"
        view.findViewById<TextView>(R.id.tvProfileSchool)?.text = user?.schoolName ?: "-"
        view.findViewById<TextView>(R.id.tvProfileCode)?.text = user?.schoolCode ?: "-"

        view.findViewById<Button>(R.id.btnOpenWebPortal)?.setOnClickListener {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(ApiClient.FRONTEND_URL)))
        }

        val container = view.findViewById<LinearLayout>(R.id.staffListContainer)
        val progress = view.findViewById<ProgressBar>(R.id.progressStaff)
        scope.launch {
            progress?.visibility = View.VISIBLE
            val staff = withContext(Dispatchers.IO) { ApiClient(requireContext()).getStaff() }
            progress?.visibility = View.GONE
            view.findViewById<TextView>(R.id.tvStaffCount)?.text = "${staff.size} Staff Members"
            staff.take(20).forEach { member ->
                val row = LayoutInflater.from(context).inflate(R.layout.item_student_row, container, false)
                val initials = member.name.split(" ").mapNotNull { it.firstOrNull()?.uppercaseChar()?.toString() }.take(2).joinToString("")
                row.findViewById<TextView>(R.id.tvStudentInitials)?.text = initials
                row.findViewById<TextView>(R.id.tvStudentName)?.text = member.name
                row.findViewById<TextView>(R.id.tvStudentAdm)?.text = "${member.role}  ·  ${member.email}"
                row.findViewById<TextView>(R.id.tvStudentGrade)?.visibility = View.GONE
                row.findViewById<TextView>(R.id.tvStudentMarks)?.visibility = View.GONE
                row.findViewById<TextView>(R.id.tvStudentPosition)?.visibility = View.GONE
                container?.addView(row)
            }
        }
    }
    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
