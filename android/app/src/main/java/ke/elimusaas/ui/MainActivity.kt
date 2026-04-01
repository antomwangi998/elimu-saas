package ke.elimusaas.ui

import android.content.Intent
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.google.android.material.bottomnavigation.BottomNavigationView
import ke.elimusaas.R
import ke.elimusaas.ui.dashboard.DashboardFragment
import ke.elimusaas.ui.exams.ExamsFragment
import ke.elimusaas.ui.students.StudentsFragment
import ke.elimusaas.ui.fees.FeesFragment
import ke.elimusaas.ui.staff.StaffFragment
import ke.elimusaas.utils.SessionManager

class MainActivity : AppCompatActivity() {
    private val session by lazy { SessionManager(this) }

    override fun onCreate(s: Bundle?) {
        super.onCreate(s)
        if (!session.isLoggedIn) { goLogin(); return }
        setContentView(R.layout.activity_main)

        val tb = findViewById<androidx.appcompat.widget.Toolbar>(R.id.toolbar)
        setSupportActionBar(tb)
        supportActionBar?.setDisplayShowTitleEnabled(false)
        findViewById<TextView>(R.id.tvToolbarSchool)?.text = session.user?.schoolName ?: "ElimuSaaS"
        findViewById<TextView>(R.id.tvToolbarRole)?.text = session.user?.displayRole ?: ""

        val nav = findViewById<BottomNavigationView>(R.id.bottom_nav)
        nav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_home     -> { load(DashboardFragment()); true }
                R.id.nav_exams    -> { load(ExamsFragment()); true }
                R.id.nav_students -> { load(StudentsFragment()); true }
                R.id.nav_fees     -> { load(FeesFragment()); true }
                R.id.nav_more     -> { load(StaffFragment()); true }
                else -> false
            }
        }
        if (s == null) { load(DashboardFragment()); nav.selectedItemId = R.id.nav_home }
    }

    override fun onCreateOptionsMenu(m: Menu): Boolean { menuInflater.inflate(R.menu.toolbar_menu, m); return true }
    override fun onOptionsItemSelected(item: MenuItem) = when (item.itemId) {
        R.id.action_logout -> { session.logout(); goLogin(); true }
        else -> super.onOptionsItemSelected(item)
    }

    private fun load(f: Fragment) = supportFragmentManager.beginTransaction().replace(R.id.fragment_container, f).commit()
    private fun goLogin() { startActivity(Intent(this, LoginActivity::class.java)); finish() }
}
