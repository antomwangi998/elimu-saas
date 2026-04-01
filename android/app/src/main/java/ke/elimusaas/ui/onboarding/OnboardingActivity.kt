package ke.elimusaas.ui.onboarding

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import ke.elimusaas.R
import ke.elimusaas.ui.LoginActivity
import ke.elimusaas.utils.SessionManager

class OnboardingActivity : AppCompatActivity() {
    private var page = 0
    private lateinit var pages: List<View>
    private lateinit var dots: List<View>

    override fun onCreate(s: Bundle?) {
        super.onCreate(s)
        val prefs = getSharedPreferences("elimu_prefs", MODE_PRIVATE)
        if (prefs.getBoolean("onboarding_done", false)) { goLogin(); return }
        setContentView(R.layout.activity_onboarding)
        pages = listOf(
            findViewById(R.id.pageWelcome), findViewById(R.id.pageFeatures),
            findViewById(R.id.pagePermissions), findViewById(R.id.pageGetStarted)
        )
        dots = listOf(
            findViewById(R.id.dot0), findViewById(R.id.dot1),
            findViewById(R.id.dot2), findViewById(R.id.dot3)
        )
        show(0)
        findViewById<Button>(R.id.btnNext).setOnClickListener { next() }
        findViewById<TextView>(R.id.tvSkip).setOnClickListener { done() }
        findViewById<Button>(R.id.btnGrantPermissions).setOnClickListener { requestPerms() }
    }

    private fun show(i: Int) {
        pages.forEachIndexed { idx, v -> v.visibility = if (idx == i) View.VISIBLE else View.GONE }
        dots.forEachIndexed { idx, d ->
            d.setBackgroundResource(if (idx == i) R.drawable.dot_active else R.drawable.dot_inactive)
        }
        findViewById<Button>(R.id.btnNext).text = if (i == pages.size - 1) "Get Started" else "Next  →"
    }

    private fun next() { if (page < pages.size - 1) { page++; show(page) } else done() }

    private fun done() {
        getSharedPreferences("elimu_prefs", MODE_PRIVATE).edit().putBoolean("onboarding_done", true).apply()
        goLogin()
    }

    private fun requestPerms() {
        val perms = mutableListOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO,
            Manifest.permission.USE_BIOMETRIC)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            perms += Manifest.permission.POST_NOTIFICATIONS
            perms += Manifest.permission.READ_MEDIA_IMAGES
        } else {
            perms += Manifest.permission.READ_EXTERNAL_STORAGE
            perms += Manifest.permission.WRITE_EXTERNAL_STORAGE
        }
        val needed = perms.filter { ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED }
        if (needed.isEmpty()) Toast.makeText(this, "All permissions already granted ✓", Toast.LENGTH_SHORT).show()
        else ActivityCompat.requestPermissions(this, needed.toTypedArray(), 100)
    }

    override fun onRequestPermissionsResult(code: Int, perms: Array<String>, results: IntArray) {
        super.onRequestPermissionsResult(code, perms, results)
        val g = results.count { it == PackageManager.PERMISSION_GRANTED }
        Toast.makeText(this, "$g of ${perms.size} permissions granted ✓", Toast.LENGTH_LONG).show()
    }

    private fun goLogin() { startActivity(Intent(this, LoginActivity::class.java)); finish() }
}
