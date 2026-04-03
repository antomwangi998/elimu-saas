package ke.elimusaas.ui.superadmin

import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import ke.elimusaas.R
import ke.elimusaas.utils.ApiClient
import kotlinx.coroutines.*

class SuperAdminUsersFragment : Fragment() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?): View =
        i.inflate(R.layout.fragment_simple_list, c, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        view.findViewById<TextView>(R.id.tvSimpleTitle)?.text = "👤 All Users"
        val container = view.findViewById<LinearLayout>(R.id.simpleContainer)

        scope.launch {
            val users: List<Triple<String, String, String>> = withContext(Dispatchers.IO) {
                try { ApiClient(requireContext()).getAllUsers() }
                catch (e: Exception) { emptyList() }
            }
            if (!isAdded) return@launch
            if (users.isEmpty()) {
                container?.addView(TextView(context).apply {
                    text = "No users found"; textSize = 14f; setPadding(16, 64, 16, 32)
                    textAlignment = View.TEXT_ALIGNMENT_CENTER
                    setTextColor(android.graphics.Color.parseColor("#6B7280"))
                })
                return@launch
            }
            users.take(50).forEach { u ->
                val row = layoutInflater.inflate(R.layout.item_student_row, container, false)
                row.findViewById<TextView>(R.id.tvStudentInitials)?.text = "👤"
                row.findViewById<TextView>(R.id.tvStudentName)?.text = "${u.first} ${u.second}"
                row.findViewById<TextView>(R.id.tvStudentAdm)?.text = u.third
                row.findViewById<TextView>(R.id.tvStudentGrade)?.visibility = View.GONE
                row.findViewById<TextView>(R.id.tvStudentMarks)?.visibility = View.GONE
                row.findViewById<TextView>(R.id.tvStudentPosition)?.visibility = View.GONE
                container?.addView(row)
            }
        }
    }

    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
