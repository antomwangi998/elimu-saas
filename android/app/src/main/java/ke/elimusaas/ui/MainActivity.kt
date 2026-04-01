package ke.elimusaas.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.google.android.material.bottomnavigation.BottomNavigationView
import ke.elimusaas.R
import ke.elimusaas.ui.attendance.AttendanceFragment
import ke.elimusaas.ui.dashboard.DashboardFragment
import ke.elimusaas.ui.exams.ExamsFragment
import ke.elimusaas.ui.fees.FeesFragment
import ke.elimusaas.ui.more.MoreFragment
import ke.elimusaas.ui.students.StudentsFragment
import ke.elimusaas.utils.SessionManager

class MainActivity : AppCompatActivity() {
    private val session by lazy { SessionManager(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (!session.isLoggedIn) { goLogin(); return }
        setContentView(R.layout.activity_main)

        // Safe toolbar setup
        try {
            val tb = findViewById<androidx.appcompat.widget.Toolbar>(R.id.toolbar)
            if (tb != null) {
                setSupportActionBar(tb)
                supportActionBar?.setDisplayShowTitleEnabled(false)
            }
            findViewById<TextView>(R.id.tvToolbarSchool)?.text = session.user?.schoolName?.ifBlank { "ElimuSaaS" } ?: "ElimuSaaS"
            findViewById<TextView>(R.id.tvToolbarRole)?.text = session.user?.displayRole ?: ""
        } catch (e: Exception) { e.printStackTrace() }

        val nav = findViewById<BottomNavigationView>(R.id.bottom_nav) ?: run { goLogin(); return }

        nav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_home      -> { load(DashboardFragment()); true }
                R.id.nav_exams     -> { load(ExamsFragment()); true }
                R.id.nav_students  -> { load(StudentsFragment()); true }
                R.id.nav_fees      -> { load(FeesFragment()); true }
                R.id.nav_more      -> { load(MoreFragment()); true }
                else -> false
            }
        }
        if (savedInstanceState == null) {
            load(DashboardFragment())
            nav.selectedItemId = R.id.nav_home
        }

        requestPermissionsIfNeeded()
    }

    private fun requestPermissionsIfNeeded() {
        val perms = mutableListOf(Manifest.permission.CAMERA)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU)
            perms += Manifest.permission.POST_NOTIFICATIONS
        else
            perms += Manifest.permission.READ_EXTERNAL_STORAGE
        val needed = perms.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (needed.isNotEmpty()) ActivityCompat.requestPermissions(this, needed.toTypedArray(), 200)
    }

    override fun onCreateOptionsMenu(m: android.view.Menu): Boolean {
        menuInflater.inflate(R.menu.toolbar_menu, m); return true
    }

    override fun onOptionsItemSelected(item: android.view.MenuItem) = when (item.itemId) {
        R.id.action_logout -> {
            session.logout()
            goLogin()
            true
        }
        else -> super.onOptionsItemSelected(item)
    }

    fun load(f: Fragment) = supportFragmentManager.beginTransaction()
        .setCustomAnimations(android.R.anim.fade_in, android.R.anim.fade_out)
        .replace(R.id.fragment_container, f)
        .commitAllowingStateLoss()

    private fun goLogin() {
        startActivity(Intent(this, LoginActivity::class.java))
        finish()
    }
}
