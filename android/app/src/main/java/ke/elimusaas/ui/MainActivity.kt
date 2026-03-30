package ke.elimusaas.ui

import android.content.Intent
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.fragment.app.Fragment
import com.google.android.material.bottomnavigation.BottomNavigationView
import ke.elimusaas.R
import ke.elimusaas.ui.dashboard.DashboardFragment
import ke.elimusaas.ui.exams.ExamsFragment
import ke.elimusaas.ui.students.StudentsFragment
import ke.elimusaas.ui.staff.StaffFragment
import ke.elimusaas.utils.SessionManager

class MainActivity : AppCompatActivity() {

    private lateinit var bottomNav: BottomNavigationView
    private val session by lazy { SessionManager(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)

        if (!session.isLoggedIn) {
            startActivity(Intent(this, LoginActivity::class.java))
            finish(); return
        }

        setContentView(R.layout.activity_main)

        val toolbar = findViewById<androidx.appcompat.widget.Toolbar>(R.id.toolbar)
        setSupportActionBar(toolbar)
        supportActionBar?.setDisplayShowTitleEnabled(false)

        bottomNav = findViewById(R.id.bottom_nav)
        bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_home -> { loadFragment(DashboardFragment()); true }
                R.id.nav_exams -> { loadFragment(ExamsFragment()); true }
                R.id.nav_students -> { loadFragment(StudentsFragment()); true }
                R.id.nav_staff -> { loadFragment(StaffFragment()); true }
                else -> false
            }
        }

        if (savedInstanceState == null) {
            loadFragment(DashboardFragment())
            bottomNav.selectedItemId = R.id.nav_home
        }
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.toolbar_menu, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_logout -> {
                session.logout()
                startActivity(Intent(this, LoginActivity::class.java))
                finish(); true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    private fun loadFragment(fragment: Fragment) {
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragment_container, fragment)
            .commit()
    }
}
