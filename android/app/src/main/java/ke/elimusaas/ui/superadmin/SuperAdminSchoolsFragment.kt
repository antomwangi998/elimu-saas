
package ke.elimusaas.ui.superadmin
import android.graphics.Color; import android.os.Bundle; import android.view.*; import android.widget.*
import androidx.fragment.app.Fragment; import ke.elimusaas.R; import ke.elimusaas.utils.ApiClient
import kotlinx.coroutines.*

class SuperAdminSchoolsFragment : Fragment() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View =
        i.inflate(R.layout.fragment_superadmin_schools, c, false)
    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val container = view.findViewById<LinearLayout>(R.id.saSchoolsContainer)
        val progress  = view.findViewById<ProgressBar>(R.id.progressSASchools)
        val tvCount   = view.findViewById<TextView>(R.id.tvSASchoolCount)
        scope.launch {
            progress?.visibility = View.VISIBLE
            val schools = withContext(Dispatchers.IO) { try { ApiClient(requireContext()).getAllSchools() } catch(_:Exception){ emptyList() } }
            if (!isAdded) return@launch
            progress?.visibility = View.GONE
            tvCount?.text = "${schools.size} Schools"
            if (schools.isEmpty()) { container?.addView(makeEmpty("No schools found")); return@launch }
            schools.forEach { school ->
                val row = layoutInflater.inflate(R.layout.item_student_row, container, false)
                row.findViewById<TextView>(R.id.tvStudentInitials)?.text = "🏫"
                row.findViewById<TextView>(R.id.tvStudentName)?.text = school.name
                row.findViewById<TextView>(R.id.tvStudentAdm)?.text  = "${school.code} · ${school.county}"
                row.findViewById<TextView>(R.id.tvStudentGrade)?.apply { text = if(school.isActive)"ACTIVE" else "INACTIVE"; setTextColor(if(school.isActive) Color.parseColor("#1B5E20") else Color.parseColor("#B71C1C")) }
                row.findViewById<TextView>(R.id.tvStudentMarks)?.text = "${school.students} students"
                row.findViewById<TextView>(R.id.tvStudentPosition)?.visibility = View.GONE
                container?.addView(row)
            }
        }
    }
    private fun makeEmpty(msg: String) = TextView(context).apply { text=msg; textAlignment=View.TEXT_ALIGNMENT_CENTER; setTextColor(Color.parseColor("#6B7280")); textSize=14f; setPadding(32,64,32,32) }
    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
