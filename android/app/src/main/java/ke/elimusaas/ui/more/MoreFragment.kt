package ke.elimusaas.ui.more

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.ui.LoginActivity
import ke.elimusaas.ui.analytics.AnalyticsFragment
import ke.elimusaas.ui.attendance.AttendanceFragment
import ke.elimusaas.ui.calendar.CalendarFragment
import ke.elimusaas.ui.certificates.CertificatesFragment
import ke.elimusaas.ui.clubs.ClubsFragment
import ke.elimusaas.ui.communication.CommunicationFragment
import ke.elimusaas.ui.discipline.DisciplineFragment
import ke.elimusaas.ui.hostel.HostelFragment
import ke.elimusaas.ui.library.LibraryFragment
import ke.elimusaas.ui.reports.ReportsFragment
import ke.elimusaas.ui.settings.SettingsFragment
import ke.elimusaas.ui.staff.StaffFragment
import ke.elimusaas.ui.timetable.TimetableFragment
import ke.elimusaas.ui.transport.TransportFragment
import ke.elimusaas.utils.ApiClient
import ke.elimusaas.utils.SessionManager

class MoreFragment : Fragment() {

    data class MenuItem(val icon: String, val label: String, val action: () -> Unit)

    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?) =
        i.inflate(R.layout.fragment_more, c, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val session = SessionManager(requireContext())
        val user = session.user

        view.findViewById<TextView>(R.id.tvMoreName)?.text = user?.fullName ?: "User"
        view.findViewById<TextView>(R.id.tvMoreRole)?.text = user?.displayRole ?: ""
        view.findViewById<TextView>(R.id.tvMoreSchool)?.text = user?.schoolName ?: "ElimuSaaS"
        view.findViewById<TextView>(R.id.tvMoreInitials)?.text = user?.initials ?: "E"

        // Build dynamic grid of all features
        val grid = view.findViewById<GridLayout>(R.id.moreGrid)
        grid?.removeAllViews()

        val items = buildMenuItems()
        items.forEach { item ->
            val btn = layoutInflater.inflate(R.layout.item_more_grid, grid, false)
            btn.findViewById<TextView>(R.id.tvMoreItemIcon)?.text = item.icon
            btn.findViewById<TextView>(R.id.tvMoreItemLabel)?.text = item.label
            btn.setOnClickListener { item.action() }
            grid?.addView(btn)
        }

        view.findViewById<View>(R.id.btnMoreLogout)?.setOnClickListener {
            AlertDialog.Builder(requireContext())
                .setTitle("Sign Out")
                .setMessage("Are you sure you want to sign out of ElimuSaaS?")
                .setPositiveButton("Sign Out") { _, _ ->
                    session.logout()
                    startActivity(Intent(requireContext(), LoginActivity::class.java)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
                    requireActivity().finish()
                }
                .setNegativeButton("Cancel", null).show()
        }
    }

    private fun buildMenuItems() = listOf(
        MenuItem("✅", "Attendance") { go(AttendanceFragment()) },
        MenuItem("👥", "Staff") { go(StaffFragment()) },
        MenuItem("📅", "Calendar") { go(CalendarFragment()) },
        MenuItem("💬", "Messages") { go(CommunicationFragment()) },
        MenuItem("📊", "Analytics") { go(AnalyticsFragment()) },
        MenuItem("📝", "Reports") { go(ReportsFragment()) },
        MenuItem("🗓️", "Timetable") { go(TimetableFragment()) },
        MenuItem("⚖️", "Discipline") { go(DisciplineFragment()) },
        MenuItem("🏆", "Clubs") { go(ClubsFragment()) },
        MenuItem("📚", "Library") { go(LibraryFragment()) },
        MenuItem("🛏️", "Hostel") { go(HostelFragment()) },
        MenuItem("🚌", "Transport") { go(TransportFragment()) },
        MenuItem("🏅", "Certificates") { go(CertificatesFragment()) },
        MenuItem("⚙️", "Settings") { go(SettingsFragment()) },
        MenuItem("🌐", "Web Portal") {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(ApiClient.FRONTEND_URL)))
        },
        MenuItem("ℹ️", "About") { showAbout() }
    )

    private fun go(f: Fragment) {
        (activity as? ke.elimusaas.ui.MainActivity)?.load(f)
    }

    private fun showAbout() {
        AlertDialog.Builder(requireContext())
            .setTitle("ElimuSaaS v1.0.0")
            .setMessage(
                "Kenya's most complete school management platform 🇰🇪\n\n" +
                "Features:\n" +
                "✅ Student & Staff Management\n" +
                "📝 Exams, Marks & Grades\n" +
                "💰 Fee Management & M-Pesa\n" +
                "📋 Daily Attendance\n" +
                "🗓️ Auto Timetable Generator\n" +
                "⚖️ Discipline Management\n" +
                "📊 Analytics & AI Insights\n" +
                "💬 SMS & Notifications\n" +
                "🏆 Clubs Management\n" +
                "🛏️ Hostel Management\n" +
                "🚌 Transport Routes\n" +
                "📚 Library System\n" +
                "🏅 Certificates Generator\n" +
                "📴 Works Offline\n\n" +
                "Backend: elimu-saas.onrender.com"
            )
            .setPositiveButton("OK", null)
            .show()
    }
}
