package ke.elimusaas.ui.clubs

import android.graphics.Color
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R

class ClubsFragment : Fragment() {
    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View =
        i.inflate(R.layout.fragment_clubs, c, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val container = view.findViewById<LinearLayout>(R.id.clubsContainer)
        val clubs = listOf(
            Triple("⚽", "Football Club", "32 members"),
            Triple("🏀", "Basketball Club", "24 members"),
            Triple("🎭", "Drama Club", "18 members"),
            Triple("🎵", "Music Club", "28 members"),
            Triple("🔬", "Science Club", "22 members"),
            Triple("📚", "Debate Club", "20 members"),
            Triple("🎨", "Art Club", "16 members"),
            Triple("💻", "Computer Club", "30 members"),
            Triple("🌿", "Environmental Club", "25 members"),
            Triple("🏊", "Swimming Club", "15 members"),
        )
        clubs.forEach { (emoji, name, members) ->
            val row = layoutInflater.inflate(R.layout.item_student_row, container, false)
            row.findViewById<TextView>(R.id.tvStudentInitials)?.text = emoji
            row.findViewById<TextView>(R.id.tvStudentName)?.text = name
            row.findViewById<TextView>(R.id.tvStudentAdm)?.text = members
            row.findViewById<TextView>(R.id.tvStudentGrade)?.text = "Active"
            row.findViewById<TextView>(R.id.tvStudentGrade)?.setTextColor(Color.parseColor("#1B5E20"))
            row.findViewById<TextView>(R.id.tvStudentMarks)?.visibility = View.GONE
            row.findViewById<TextView>(R.id.tvStudentPosition)?.visibility = View.GONE
            container?.addView(row)
        }
    }
}
