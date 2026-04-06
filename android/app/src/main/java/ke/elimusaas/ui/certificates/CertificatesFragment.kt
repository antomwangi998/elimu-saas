package ke.elimusaas.ui.certificates

import android.graphics.Color
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R

class CertificatesFragment : Fragment() {
    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View =
        i.inflate(R.layout.fragment_certificates, c, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val container = view.findViewById<LinearLayout>(R.id.certificatesContainer)
        val certs = listOf(
            Triple("🏅", "Academic Excellence Award", "Term 1 2024"),
            Triple("🏆", "Best Performance - Mathematics", "KCSE 2023"),
            Triple("🥇", "Sports Champion - Football", "Inter-school 2024"),
            Triple("📜", "School Leaving Certificate", "2023"),
            Triple("🎖️", "Leadership Award", "2024"),
            Triple("🏅", "Best Class Attendance", "Term 2 2024"),
        )
        certs.forEach { (emoji, name, date) ->
            val row = layoutInflater.inflate(R.layout.item_student_row, container, false)
            row.findViewById<TextView>(R.id.tvStudentInitials)?.text = emoji
            row.findViewById<TextView>(R.id.tvStudentName)?.text = name
            row.findViewById<TextView>(R.id.tvStudentAdm)?.text = date
            row.findViewById<TextView>(R.id.tvStudentGrade)?.text = "Generate"
            row.findViewById<TextView>(R.id.tvStudentGrade)?.setTextColor(Color.parseColor("#0D47A1"))
            row.findViewById<TextView>(R.id.tvStudentMarks)?.visibility = View.GONE
            row.findViewById<TextView>(R.id.tvStudentPosition)?.visibility = View.GONE
            row.setOnClickListener {
                Toast.makeText(context, "Certificate generation coming soon!", Toast.LENGTH_SHORT).show()
            }
            container?.addView(row)
        }
    }
}
