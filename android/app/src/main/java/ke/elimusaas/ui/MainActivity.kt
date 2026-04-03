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
import ke.elimusaas.ui.superadmin.SuperAdminDashboardFragment
import ke.elimusaas.ui.principal.PrincipalDashboardFragment
import ke.elimusaas.ui.hod.HodDashboardFragment
import ke.elimusaas.ui.teacher.TeacherDashboardFragment
import ke.elimusaas.ui.bursar.BursarDashboardFragment
import ke.elimusaas.ui.student.StudentDashboardFragment
import ke.elimusaas.ui.exams.ExamsFragment
import ke.elimusaas.ui.students.StudentsFragment
import ke.elimusaas.ui.fees.FeesFragment
import ke.elimusaas.ui.more.MoreFragment
import ke.elimusaas.utils.SessionManager

class MainActivity : AppCompatActivity() {
    private val session by lazy { SessionManager(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (!session.isLoggedIn) { goLogin(); return }
        setContentView(R.layout.activity_main)

        val user = session.user
        val role = user?.role ?: "teacher"

        try {
            val tb = findViewById<androidx.appcompat.widget.Toolbar>(R.id.toolbar)
            setSupportActionBar(tb)
            supportActionBar?.setDisplayShowTitleEnabled(false)
            val schoolName = when (role) {
                "super_admin" -> "ElimuSaaS Platform"
                else -> user?.schoolName?.ifBlank { "ElimuSaaS" } ?: "ElimuSaaS"
            }
            findViewById<TextView>(R.id.tvToolbarSchool)?.text = schoolName
            findViewById<TextView>(R.id.tvToolbarRole)?.text = user?.displayRole ?: ""
        } catch (_: Exception) {}

        val nav = findViewById<BottomNavigationView>(R.id.bottom_nav) ?: run { goLogin(); return }

        // RBAC bottom nav + first screen
        val (menuRes, homeFragment) = getRoleNavConfig(role)
        nav.menu.clear()
        menuInflater.inflate(menuRes, nav.menu)

        nav.setOnItemSelectedListener { item ->
            val f = getFragmentForNavItem(item.itemId, role)
            if (f != null) { load(f); true } else false
        }

        if (savedInstanceState == null) {
            load(homeFragment)
            nav.selectedItemId = nav.menu.getItem(0).itemId
        }

        requestPerms()
    }

    private fun getRoleNavConfig(role: String): Pair<Int, Fragment> = when (role) {
        "super_admin"                        -> Pair(R.menu.nav_superadmin, SuperAdminDashboardFragment())
        "school_admin", "principal"          -> Pair(R.menu.nav_principal, PrincipalDashboardFragment())
        "deputy_principal", "hod"            -> Pair(R.menu.nav_hod, HodDashboardFragment())
        "teacher"                            -> Pair(R.menu.nav_teacher, TeacherDashboardFragment())
        "bursar"                             -> Pair(R.menu.nav_bursar, BursarDashboardFragment())
        "student"                            -> Pair(R.menu.nav_student, StudentDashboardFragment())
        else                                 -> Pair(R.menu.nav_teacher, TeacherDashboardFragment())
    }

    private fun getFragmentForNavItem(itemId: Int, role: String): Fragment? = when (itemId) {
        R.id.nav_home -> when (role) {
            "super_admin" -> SuperAdminDashboardFragment()
            "school_admin", "principal" -> PrincipalDashboardFragment()
            "deputy_principal", "hod" -> HodDashboardFragment()
            "teacher" -> TeacherDashboardFragment()
            "bursar" -> BursarDashboardFragment()
            "student" -> StudentDashboardFragment()
            else -> TeacherDashboardFragment()
        }
        R.id.nav_exams    -> ExamsFragment()
        R.id.nav_students -> StudentsFragment()
        R.id.nav_fees     -> FeesFragment()
        R.id.nav_more     -> MoreFragment()
        else -> null
    }

    override fun onCreateOptionsMenu(m: android.view.Menu): Boolean {
        menuInflater.inflate(R.menu.toolbar_menu, m); return true
    }

    override fun onOptionsItemSelected(item: android.view.MenuItem) = when (item.itemId) {
        R.id.action_logout -> { session.logout(); goLogin(); true }
        else -> super.onOptionsItemSelected(item)
    }

    fun load(f: Fragment) = supportFragmentManager.beginTransaction()
        .setCustomAnimations(android.R.anim.fade_in, android.R.anim.fade_out)
        .replace(R.id.fragment_container, f)
        .commitAllowingStateLoss()

    private fun requestPerms() {
        val perms = mutableListOf(Manifest.permission.CAMERA)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU)
            perms += Manifest.permission.POST_NOTIFICATIONS
        else perms += Manifest.permission.READ_EXTERNAL_STORAGE
        val needed = perms.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (needed.isNotEmpty()) ActivityCompat.requestPermissions(this, needed.toTypedArray(), 200)
    }

    private fun goLogin() {
        startActivity(Intent(this, LoginActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
        finish()
    }
}
