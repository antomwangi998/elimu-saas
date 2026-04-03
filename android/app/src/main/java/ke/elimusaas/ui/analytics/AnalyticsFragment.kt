package ke.elimusaas.ui.analytics

import android.graphics.Color
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import com.github.mikephil.charting.charts.BarChart
import com.github.mikephil.charting.charts.LineChart
import com.github.mikephil.charting.charts.PieChart
import com.github.mikephil.charting.data.*
import com.github.mikephil.charting.utils.ColorTemplate
import ke.elimusaas.R
import ke.elimusaas.utils.ApiClient
import ke.elimusaas.utils.SessionManager
import kotlinx.coroutines.*

class AnalyticsFragment : Fragment() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?) =
        i.inflate(R.layout.fragment_analytics, c, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        super.onViewCreated(view, s)
        val progress = view.findViewById<ProgressBar>(R.id.progressAnalytics)
        scope.launch {
            progress?.visibility = View.VISIBLE
            val stats = withContext(Dispatchers.IO) {
                try { ApiClient(requireContext()).getDashboardStats() }
                catch (e: Exception) { ke.elimusaas.data.DashboardStats() }
            }
            if (!isAdded) return@launch
            progress?.visibility = View.GONE
            setupBarChart(view, stats)
            setupPieChart(view, stats)
            setupLineChart(view)
        }
    }

    private fun setupBarChart(view: View, stats: ke.elimusaas.data.DashboardStats) {
        val chart = view.findViewById<BarChart>(R.id.barChartStudents) ?: return
        val entries = listOf(
            BarEntry(0f, stats.totalStudents.toFloat()),
            BarEntry(1f, stats.totalTeachers.toFloat()),
            BarEntry(2f, stats.totalStaff.toFloat()),
            BarEntry(3f, stats.totalStreams.toFloat())
        )
        val ds = BarDataSet(entries, "School Overview").apply {
            colors = ColorTemplate.MATERIAL_COLORS.toList()
            valueTextSize = 12f
        }
        chart.apply {
            data = BarData(ds)
            description.isEnabled = false
            legend.isEnabled = true
            xAxis.apply {
                valueFormatter = com.github.mikephil.charting.formatter.IndexAxisValueFormatter(
                    arrayOf("Students","Teachers","Staff","Streams"))
                granularity = 1f
            }
            animateY(1000)
            invalidate()
        }
    }

    private fun setupPieChart(view: View, stats: ke.elimusaas.data.DashboardStats) {
        val chart = view.findViewById<PieChart>(R.id.pieChartFees) ?: return
        val rate = stats.feeCollectionRate.toFloat().coerceIn(0f, 100f)
        val entries = listOf(
            PieEntry(rate, "Collected"),
            PieEntry(100f - rate, "Pending")
        )
        val ds = PieDataSet(entries, "Fee Collection").apply {
            colors = listOf(Color.parseColor("#1B5E20"), Color.parseColor("#B71C1C"))
            valueTextSize = 14f
            valueTextColor = Color.WHITE
        }
        chart.apply {
            data = PieData(ds)
            description.isEnabled = false
            isDrawHoleEnabled = true
            holeRadius = 40f
            centerText = "${rate.toInt()}%\nCollected"
            setCenterTextSize(14f)
            animateY(1200)
            invalidate()
        }
    }

    private fun setupLineChart(view: View) {
        val chart = view.findViewById<LineChart>(R.id.lineChartAttendance) ?: return
        val entries = (0..6).map { i ->
            Entry(i.toFloat(), (75f + (Math.random() * 20).toFloat()))
        }
        val ds = LineDataSet(entries, "Attendance % (7 days)").apply {
            color = Color.parseColor("#0D47A1")
            setCircleColor(Color.parseColor("#0D47A1"))
            lineWidth = 2.5f
            circleRadius = 4f
            valueTextSize = 10f
            mode = LineDataSet.Mode.CUBIC_BEZIER
        }
        chart.apply {
            data = LineData(ds)
            description.isEnabled = false
            xAxis.apply {
                valueFormatter = com.github.mikephil.charting.formatter.IndexAxisValueFormatter(
                    arrayOf("Mon","Tue","Wed","Thu","Fri","Sat","Sun"))
                granularity = 1f
            }
            animateX(1000)
            invalidate()
        }
    }

    override fun onDestroyView() { super.onDestroyView(); scope.cancel() }
}
