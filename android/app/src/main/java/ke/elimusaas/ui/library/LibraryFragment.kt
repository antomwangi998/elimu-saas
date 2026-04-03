package ke.elimusaas.ui.library

import android.graphics.Color
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R

class LibraryFragment : Fragment() {
    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?) =
        i.inflate(R.layout.fragment_library, c, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val container = view.findViewById<LinearLayout>(R.id.libraryContainer)
        val books = listOf(
            Triple("📗", "Kenya Certificate Mathematics", "Form 4"),
            Triple("📘", "English Grammar & Composition", "Form 3"),
            Triple("📕", "Biology Made Simple", "Form 2"),
            Triple("📙", "Chemistry Practical Guide", "Form 4"),
            Triple("📗", "History of East Africa", "Form 1"),
            Triple("📘", "Physics Fundamentals", "Form 3"),
            Triple("📕", "Kiswahili Fasihi", "Form 2"),
            Triple("📙", "Geography of Kenya", "Form 4"),
            Triple("📗", "Business Studies", "Form 3"),
            Triple("📘", "Computer Studies", "Form 1"),
        )
        books.forEach { (emoji, title, form) ->
            val row = layoutInflater.inflate(R.layout.item_student_row, container, false)
            row.findViewById<TextView>(R.id.tvStudentInitials)?.text = emoji
            row.findViewById<TextView>(R.id.tvStudentName)?.text = title
            row.findViewById<TextView>(R.id.tvStudentAdm)?.text = form
            row.findViewById<TextView>(R.id.tvStudentGrade)?.text = "Available"
            row.findViewById<TextView>(R.id.tvStudentGrade)?.setTextColor(Color.parseColor("#1B5E20"))
            row.findViewById<TextView>(R.id.tvStudentMarks)?.visibility = View.GONE
            row.findViewById<TextView>(R.id.tvStudentPosition)?.visibility = View.GONE
            container?.addView(row)
        }
    }
}
