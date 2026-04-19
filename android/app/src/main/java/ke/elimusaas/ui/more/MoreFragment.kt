package ke.elimusaas.ui.more

import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
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

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.fragment_more, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val session = SessionManager(requireContext())
        val user = session.user

        view.findViewById<TextView>(R.id.tvMoreName)?.text = user?.fullName ?: "User"
        view.findViewById<TextView>(R.id.tvMoreRole)?.text = user?.displayRole ?: ""
        view.findViewById<TextView>(R.id.tvMoreSchool)?.text = user?.schoolName ?: "ElimuSaaS"
        view.findViewById<TextView>(R.id.tvMoreInitials)?.text = user?.initials ?: "E"

        buildGrid(view)

        view.findViewById<View>(R.id.btnMoreLogout)?.setOnClickListener {
            AlertDialog.Builder(requireContext())
                .setTitle("Sign Out")
                .setMessage("Sign out of ElimuSaaS?")
                .setPositiveButton("Sign Out") { _, _ ->
                    session.logout()
                    startActivity(
                        Intent(requireContext(), LoginActivity::class.java)
                            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                    )
                    requireActivity().finish()
                }
                .setNegativeButton("Cancel", null).show()
        }
    }

    // Use an index instead of lambdas in data to avoid type inference issues
    private fun buildGrid(view: View) {
        val container = view.findViewById<LinearLayout>(R.id.moreRowsContainer) ?: return
        container.removeAllViews()

        val emojis  = arrayOf("✅","👥","📅","💬","📊","📝","🗓","⚖","🏆","📚","🛏","🚌","🏅","⚙","🌐","ℹ")
        val labels  = arrayOf("Attendance","Staff","Calendar","Messages","Analytics","Reports",
                               "Timetable","Discipline","Clubs","Library","Hostel","Transport",
                               "Certificates","Settings","Web Portal","About")

        val d = requireContext().resources.displayMetrics.density
        val m4  = (4  * d).toInt()
        val p8  = (8  * d).toInt()
        val p14 = (14 * d).toInt()
        val h44 = (44 * d).toInt()

        var row: LinearLayout? = null
        for (i in emojis.indices) {
            if (i % 4 == 0) {
                row = LinearLayout(requireContext())
                row.orientation = LinearLayout.HORIZONTAL
                row.layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
                container.addView(row)
            }

            val idx = i  // capture for click
            val cell = LinearLayout(requireContext())
            cell.orientation = LinearLayout.VERTICAL
            cell.gravity = Gravity.CENTER
            val cellLp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            cellLp.setMargins(m4, m4, m4, m4)
            cell.layoutParams = cellLp
            cell.setPadding(p8, p14, p8, p14)
            cell.isClickable = true
            cell.isFocusable = true
            cell.setBackgroundResource(R.drawable.tab_unselected_bg)
            cell.setOnClickListener { onItemClick(idx) }

            val emojiTv = TextView(requireContext())
            emojiTv.text = emojis[i]
            emojiTv.textSize = 26f
            emojiTv.gravity = Gravity.CENTER
            val emojiLp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, h44)
            emojiLp.bottomMargin = m4
            emojiTv.layoutParams = emojiLp

            val labelTv = TextView(requireContext())
            labelTv.text = labels[i]
            labelTv.textSize = 10f
            labelTv.gravity = Gravity.CENTER
            labelTv.setTextColor(Color.parseColor("#374151"))
            labelTv.setTypeface(null, Typeface.BOLD)
            labelTv.maxLines = 2
            labelTv.layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
            )

            cell.addView(emojiTv)
            cell.addView(labelTv)
            row?.addView(cell)
        }
    }

    private fun onItemClick(index: Int) {
        when (index) {
            0  -> go(AttendanceFragment())
            1  -> go(StaffFragment())
            2  -> go(CalendarFragment())
            3  -> go(CommunicationFragment())
            4  -> go(AnalyticsFragment())
            5  -> go(ReportsFragment())
            6  -> go(TimetableFragment())
            7  -> go(DisciplineFragment())
            8  -> go(ClubsFragment())
            9  -> go(LibraryFragment())
            10 -> go(HostelFragment())
            11 -> go(TransportFragment())
            12 -> go(CertificatesFragment())
            13 -> go(SettingsFragment())
            14 -> openWebPortal()
            15 -> showAbout()
        }
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
                "Works Offline\n\n" +
                "Backend: elimu-saas.onrender.com"
            )
            .setPositiveButton("OK", null).show()
    }
}
