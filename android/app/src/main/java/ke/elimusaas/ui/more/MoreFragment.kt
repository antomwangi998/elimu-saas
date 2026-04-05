package ke.elimusaas.ui.more

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.graphics.Typeface
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

    // dp conversion handled locally in makeBtnView

    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View =
        i.inflate(R.layout.fragment_more, c, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val session = SessionManager(requireContext())
        val user = session.user

        view.findViewById<TextView>(R.id.tvMoreName)?.text = user?.fullName ?: "User"
        view.findViewById<TextView>(R.id.tvMoreRole)?.text = user?.displayRole ?: ""
        view.findViewById<TextView>(R.id.tvMoreSchool)?.text = user?.schoolName ?: "ElimuSaaS"
        view.findViewById<TextView>(R.id.tvMoreInitials)?.text = user?.initials ?: "E"

        buildFeatureGrid(view)

        view.findViewById<View>(R.id.btnMoreLogout)?.setOnClickListener {
            AlertDialog.Builder(requireContext())
                .setTitle("Sign Out")
                .setMessage("Are you sure you want to sign out?")
                .setPositiveButton("Sign Out") { _, _ ->
                    session.logout()
                    startActivity(
                        Intent(requireContext(), LoginActivity::class.java)
                            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                    )
                    requireActivity().finish()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    private fun buildFeatureGrid(view: View) {
        val container = view.findViewById<LinearLayout>(R.id.moreRowsContainer) ?: return
        container.removeAllViews()

        val items = listOf(
            Pair("✅ Attendance",   { go(AttendanceFragment())    }),
            Pair("👥 Staff",        { go(StaffFragment())         }),
            Pair("📅 Calendar",     { go(CalendarFragment())      }),
            Pair("💬 Messages",     { go(CommunicationFragment()) }),
            Pair("📊 Analytics",    { go(AnalyticsFragment())     }),
            Pair("📝 Reports",      { go(ReportsFragment())       }),
            Pair("🗓 Timetable",    { go(TimetableFragment())     }),
            Pair("⚖ Discipline",   { go(DisciplineFragment())    }),
            Pair("🏆 Clubs",        { go(ClubsFragment())         }),
            Pair("📚 Library",      { go(LibraryFragment())       }),
            Pair("🛏 Hostel",       { go(HostelFragment())        }),
            Pair("🚌 Transport",    { go(TransportFragment())     }),
            Pair("🏅 Certificates", { go(CertificatesFragment())  }),
            Pair("⚙ Settings",     { go(SettingsFragment())      }),
            Pair("🌐 Web Portal",   { openWebPortal()             }),
            Pair("ℹ About",        { showAbout()                 })
        )

        var row: LinearLayout? = null
        items.forEachIndexed { index, pair ->
            if (index % 4 == 0) {
                row = LinearLayout(context).apply {
                    orientation = LinearLayout.HORIZONTAL
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    )
                }
                container.addView(row)
            }
            row?.addView(makeBtnView(pair.first, pair.second))
        }
    }

    private fun makeBtnView(label: String, action: () -> Unit): LinearLayout {
        val parts = label.split(" ", limit = 2)
        val emoji = parts[0]
        val btnText = if (parts.size > 1) parts[1] else label
        // Pre-compute all pixel values BEFORE entering apply{} blocks
        val den = requireContext().resources.displayMetrics.density
        val m4  = (4  * den).toInt()
        val p8  = (8  * den).toInt()
        val p14 = (14 * den).toInt()
        val h44 = (44 * den).toInt()

        val btn = LinearLayout(requireContext())
        btn.orientation = LinearLayout.VERTICAL
        btn.gravity = android.view.Gravity.CENTER
        val btnLp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        btnLp.setMargins(m4, m4, m4, m4)
        btn.layoutParams = btnLp
        btn.setPadding(p8, p14, p8, p14)
        btn.isClickable = true
        btn.isFocusable = true
        btn.setBackgroundResource(R.drawable.tab_unselected_bg)
        btn.setOnClickListener { action() }

        val iconTv = TextView(requireContext())
        iconTv.text = emoji
        iconTv.textSize = 26f
        iconTv.gravity = android.view.Gravity.CENTER
        val iconLp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, h44)
        iconLp.bottomMargin = m4
        iconTv.layoutParams = iconLp
        btn.addView(iconTv)

        val labelTv = TextView(requireContext())
        labelTv.text = btnText
        labelTv.textSize = 10f
        labelTv.gravity = android.view.Gravity.CENTER
        labelTv.setTextColor(android.graphics.Color.parseColor("#374151"))
        labelTv.setTypeface(null, Typeface.BOLD)
        labelTv.maxLines = 2
        labelTv.layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        )
        btn.addView(labelTv)

        return btn
    }

    private fun go(f: Fragment) =
        (activity as? ke.elimusaas.ui.MainActivity)?.load(f)

    private fun openWebPortal() {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(ApiClient.FRONTEND_URL)))
        } catch (e: Exception) {
            Toast.makeText(context, "Cannot open browser", Toast.LENGTH_SHORT).show()
        }
    }

    private fun showAbout() {
        AlertDialog.Builder(requireContext())
            .setTitle("ElimuSaaS v1.0.0")
            .setMessage(
                "Kenya's most complete school management platform\n\n" +
                "Students · Staff · Exams · Fees\n" +
                "Attendance · Timetable · Discipline\n" +
                "Analytics · Reports · Certificates\n" +
                "Clubs · Library · Hostel · Transport\n" +
                "SMS · Notifications · Calendar\n" +
                "Works Offline\n\n" +
                "Backend: elimu-saas.onrender.com"
            )
            .setPositiveButton("OK", null)
            .show()
    }
}
