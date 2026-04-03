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

    data class FeatureItem(val emoji: String, val label: String, val color: String, val action: () -> Unit)

    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?) =
        i.inflate(R.layout.fragment_more, c, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val session = SessionManager(requireContext())
        val user = session.user

        view.findViewById<TextView>(R.id.tvMoreName)?.text = user?.fullName ?: "User"
        view.findViewById<TextView>(R.id.tvMoreRole)?.text = user?.displayRole ?: ""
        view.findViewById<TextView>(R.id.tvMoreSchool)?.text = user?.schoolName ?: "ElimuSaaS"
        view.findViewById<TextView>(R.id.tvMoreInitials)?.text = user?.initials ?: "E"

        val rowsContainer = view.findViewById<LinearLayout>(R.id.moreRowsContainer)
        rowsContainer?.removeAllViews()

        val items = getItems()
        // Build rows of 4
        var row: LinearLayout? = null
        items.forEachIndexed { index, item ->
            if (index % 4 == 0) {
                row = LinearLayout(context).apply {
                    orientation = LinearLayout.HORIZONTAL
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply { setMargins(0, 0, 0, 0) }
                }
                rowsContainer?.addView(row)
            }
            row?.addView(makeFeatureButton(item))
        }
        // Pad last row if needed
        val remainder = items.size % 4
        if (remainder != 0) {
            for (i in remainder until 4) {
                row?.addView(makeSpacer())
            }
        }

        view.findViewById<View>(R.id.btnMoreLogout)?.setOnClickListener {
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

    private fun makeFeatureButton(item: FeatureItem): LinearLayout {
        val dp = resources.displayMetrics.density
        return LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                setMargins(4.dp(), 4.dp(), 4.dp(), 4.dp())
            }
            setPadding(8.dp(), 12.dp(), 8.dp(), 12.dp())
            isClickable = true
            isFocusable = true
            setBackgroundResource(R.drawable.tab_unselected_bg)
            setOnClickListener { item.action() }

            // Icon card
            val iconTv = TextView(context).apply {
                text = item.emoji
                textSize = 24f
                gravity = android.view.Gravity.CENTER
                layoutParams = LinearLayout.LayoutParams(52.dp(), 52.dp()).apply { bottomMargin = 6.dp() }
                val card = CardView(context!!).apply {
                    radius = 12 * dp
                    cardElevation = 2 * dp
                    setCardBackgroundColor(android.graphics.Color.parseColor(item.color + "30"))
                    layoutParams = LinearLayout.LayoutParams(52.dp(), 52.dp()).apply { bottomMargin = 6.dp() }
                }
                // Just add text directly since cardview nesting is complex
            }
            addView(TextView(context).apply {
                text = item.emoji
                textSize = 26f
                gravity = android.view.Gravity.CENTER
                layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 44.dp()).apply { bottomMargin = 4.dp() }
            })
            addView(TextView(context).apply {
                text = item.label
                textSize = 10f
                gravity = android.view.Gravity.CENTER
                setTextColor(android.graphics.Color.parseColor("#374151"))
                android.graphics.Typeface.DEFAULT_BOLD.also { typeface = it }
                maxLines = 2
                layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            })
        }
    }

    private fun makeSpacer() = View(context).apply {
        layoutParams = LinearLayout.LayoutParams(0, 1, 1f)
    }

    private fun Int.dp() = (this * resources.displayMetrics.density).toInt()

    private fun go(f: Fragment) = (activity as? ke.elimusaas.ui.MainActivity)?.load(f)

    private fun getItems() = listOf(
        FeatureItem("✅", "Attendance", "#2E7D32") { go(AttendanceFragment()) },
        FeatureItem("👥", "Staff", "#6A1B9A") { go(StaffFragment()) },
        FeatureItem("📅", "Calendar", "#1565C0") { go(CalendarFragment()) },
        FeatureItem("💬", "Messages", "#00796B") { go(CommunicationFragment()) },
        FeatureItem("📊", "Analytics", "#E65100") { go(AnalyticsFragment()) },
        FeatureItem("📝", "Reports", "#1565C0") { go(ReportsFragment()) },
        FeatureItem("🗓️", "Timetable", "#00695C") { go(TimetableFragment()) },
        FeatureItem("⚖️", "Discipline", "#C62828") { go(DisciplineFragment()) },
        FeatureItem("🏆", "Clubs", "#F57F17") { go(ClubsFragment()) },
        FeatureItem("📚", "Library", "#1B5E20") { go(LibraryFragment()) },
        FeatureItem("🛏️", "Hostel", "#4A148C") { go(HostelFragment()) },
        FeatureItem("🚌", "Transport", "#01579B") { go(TransportFragment()) },
        FeatureItem("🏅", "Certificates", "#B71C1C") { go(CertificatesFragment()) },
        FeatureItem("⚙️", "Settings", "#37474F") { go(SettingsFragment()) },
        FeatureItem("🌐", "Web Portal", "#1565C0") {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(ApiClient.FRONTEND_URL)))
        },
        FeatureItem("ℹ️", "About", "#1565C0") { showAbout() }
    )

    private fun showAbout() {
        AlertDialog.Builder(requireContext())
            .setTitle("ElimuSaaS v1.0.0")
            .setMessage("Kenya's most complete school management platform 🇰🇪\n\n" +
                "✅ Students · Staff · Exams · Fees\n📋 Attendance · Timetable · Discipline\n" +
                "📊 Analytics · Reports · Certificates\n🏆 Clubs · Library · Hostel · Transport\n" +
                "💬 SMS · Notifications · Calendar\n📴 Works Offline\n\n" +
                "Backend: elimu-saas.onrender.com")
            .setPositiveButton("OK", null).show()
    }
}
