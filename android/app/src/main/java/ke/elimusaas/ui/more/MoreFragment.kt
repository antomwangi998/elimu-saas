package ke.elimusaas.ui.more

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.cardview.widget.CardView
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.ui.LoginActivity
import ke.elimusaas.ui.attendance.AttendanceFragment
import ke.elimusaas.ui.calendar.CalendarFragment
import ke.elimusaas.ui.communication.CommunicationFragment
import ke.elimusaas.ui.reports.ReportsFragment
import ke.elimusaas.ui.staff.StaffFragment
import ke.elimusaas.utils.ApiClient
import ke.elimusaas.utils.SessionManager

class MoreFragment : Fragment() {

    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View =
        i.inflate(R.layout.fragment_more, c, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val session = SessionManager(requireContext())
        val user = session.user

        // Profile header
        view.findViewById<TextView>(R.id.tvMoreName)?.text = user?.fullName ?: "User"
        view.findViewById<TextView>(R.id.tvMoreRole)?.text = user?.displayRole ?: ""
        view.findViewById<TextView>(R.id.tvMoreSchool)?.text = user?.schoolName ?: "ElimuSaaS"
        view.findViewById<TextView>(R.id.tvMoreInitials)?.text = user?.initials ?: "E"

        // Menu items
        view.findViewById<View>(R.id.menuAttendance)?.setOnClickListener { navigate(AttendanceFragment()) }
        view.findViewById<View>(R.id.menuStaff)?.setOnClickListener { navigate(StaffFragment()) }
        view.findViewById<View>(R.id.menuCalendar)?.setOnClickListener { navigate(CalendarFragment()) }
        view.findViewById<View>(R.id.menuCommunication)?.setOnClickListener { navigate(CommunicationFragment()) }
        view.findViewById<View>(R.id.menuReports)?.setOnClickListener { navigate(ReportsFragment()) }
        view.findViewById<View>(R.id.menuWebPortal)?.setOnClickListener {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(ApiClient.FRONTEND_URL)))
        }
        view.findViewById<View>(R.id.menuAbout)?.setOnClickListener { showAbout() }
        view.findViewById<View>(R.id.menuLogout)?.setOnClickListener {
            AlertDialog.Builder(requireContext())
                .setTitle("Sign Out")
                .setMessage("Are you sure you want to sign out?")
                .setPositiveButton("Sign Out") { _, _ ->
                    session.logout()
                    startActivity(Intent(requireContext(), LoginActivity::class.java))
                    requireActivity().finish()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    private fun navigate(f: Fragment) {
        (activity as? ke.elimusaas.ui.MainActivity)?.load(f)
    }

    private fun showAbout() {
        AlertDialog.Builder(requireContext())
            .setTitle("About ElimuSaaS")
            .setMessage(
                "ElimuSaaS v1.0\n\n" +
                "Kenya's most complete school management platform.\n\n" +
                "✅ Student Management\n" +
                "📝 Exams & Marks\n" +
                "💰 Fee Management\n" +
                "✅ Attendance Tracking\n" +
                "📊 Analytics & Reports\n" +
                "💬 SMS Communication\n" +
                "🗓 Timetable Generator\n" +
                "📴 Works Offline\n\n" +
                "Built for Kenyan schools 🇰🇪\n" +
                "Backend: elimu-saas.onrender.com"
            )
            .setPositiveButton("OK", null)
            .show()
    }
}
