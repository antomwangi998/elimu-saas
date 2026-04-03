package ke.elimusaas.ui.transport

import android.graphics.Color
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R

class TransportFragment : Fragment() {
    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?) =
        i.inflate(R.layout.fragment_transport, c, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val container = view.findViewById<LinearLayout>(R.id.transportContainer)
        val routes = listOf(
            Triple("🚌", "Route 1 - Nairobi CBD", "45 students · KBS Bus"),
            Triple("🚌", "Route 2 - Westlands", "32 students · School Bus"),
            Triple("🚌", "Route 3 - Karen", "28 students · Matatu"),
            Triple("🚌", "Route 4 - Kasarani", "38 students · KBS Bus"),
            Triple("🚌", "Route 5 - Embakasi", "22 students · School Bus"),
        )
        routes.forEach { (emoji, route, detail) ->
            val row = layoutInflater.inflate(R.layout.item_student_row, container, false)
            row.findViewById<TextView>(R.id.tvStudentInitials)?.text = emoji
            row.findViewById<TextView>(R.id.tvStudentName)?.text = route
            row.findViewById<TextView>(R.id.tvStudentAdm)?.text = detail
            row.findViewById<TextView>(R.id.tvStudentGrade)?.text = "Active"
            row.findViewById<TextView>(R.id.tvStudentGrade)?.setTextColor(Color.parseColor("#1B5E20"))
            row.findViewById<TextView>(R.id.tvStudentMarks)?.visibility = View.GONE
            row.findViewById<TextView>(R.id.tvStudentPosition)?.visibility = View.GONE
            container?.addView(row)
        }
    }
}
