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
            Pair("✅ Attendance",    { go(AttendanceFragment())    }),
            Pair("👥 Staff",         { go(StaffFragment())         }),
            Pair("📅 Calendar",      { go(CalendarFragment())      }),
            Pair("💬 Messages",      { go(CommunicationFragment()) }),
            Pair("📊 Analytics",     { go(AnalyticsFragment())     }),
            Pair("📝 Reports",       { go(ReportsFragment())       }),
            Pair("🗓️ Timetable",    { go(TimetableFragment())     }),
            Pair("⚖️ Discipline",   { go(DisciplineFragment())    }),
            Pair("🏆 Clubs",         { go(ClubsFragment())         }),
            Pair("📚 Library",       { go(LibraryFragment())       }),
            Pair("🛏️ Hostel",       { go(HostelFragment())        }),
            Pair("🚌 Transport",     { go(TransportFragment())     }),
            Pair("🏅 Certificates",  { go(CertificatesFragment())  }),
            Pair("⚙️ Settings",     { go(SettingsFragment())      }),
            Pair("🌐 Web Portal",    { openWebPortal()             }),
            Pair("ℹ️ About",        { showAbout()                 })
        )

        var row: LinearLayout? = null
        items.forEachIndexed { index, (label, action) ->
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
            row?.addView(makeBtn(label, action))
        }
    }

    private fun makeBtn(label: String, action: () -> Unit): LinearLayout {
        val density = resources.displayMetrics.density
        fun Int.dp() = (this * density).toInt()

        return LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                setMargins(4.dp(), 4.dp(), 4.dp(), 4.dp())
            }
            setPadding(8.dp(), 14.dp(), 8.dp(), 14.dp())
            isClickable = true; isFocusable = true
            setBackgroundResource(R.drawable.tab_unselected_bg)
            setOnClickListener { action() }

            // Emoji icon
            addView(TextView(context).apply {
                val parts = label.split(" ", limit = 2)
                text = parts[0]
                textSize = 26f
                gravity = android.view.Gravity.CENTER
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, 44.dp()
                ).apply { bottomMargin = 4.dp() }
            })
            // Label text
            addView(TextView(context).apply {
                val parts = label.split(" ", limit = 2)
                text = if (parts.size > 1) parts[1] else label
                textSize = 10f
                gravity = android.view.Gravity.CENTER
                setTextColor(android.graphics.Color.parseColor("#374151"))
                setTypeface(null, android.graphics.Typeface.BOLD)
                maxLines = 2
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
            })
        }
    }

    private fun go(f: Fragment) = (activity as? ke.elimusaas.ui.MainActivity)?.load(f)

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
                "Kenya's most complete school management platform 🇰🇪\n\n" +
                "✅ Students & Staff\n📝 Exams & Marks\n💰 Fee Management\n" +
                "📋 Attendance\n🗓️ Timetable\n⚖️ Discipline\n📊 Analytics\n" +
                "💬 SMS & Notifications\n🏆 Clubs\n🛏️ Hostel\n🚌 Transport\n" +
                "📚 Library\n🏅 Certificates\n📴 Works Offline\n\n" +
                "Backend: elimu-saas.onrender.com"
            )
            .setPositiveButton("OK", null)
            .show()
    }
}
