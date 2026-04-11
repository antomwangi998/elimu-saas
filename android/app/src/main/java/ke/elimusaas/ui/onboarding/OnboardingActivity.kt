package ke.elimusaas.ui.onboarding

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.animation.AnimationUtils
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import ke.elimusaas.R
import ke.elimusaas.ui.LoginActivity

class OnboardingActivity : AppCompatActivity() {
    private var page = 0
    private lateinit var pages: List<View>
    private lateinit var dots: List<View>
    private lateinit var btnNext: Button
    private lateinit var tvSkip: TextView

    override fun onCreate(s: Bundle?) {
        super.onCreate(s)
        val prefs = getSharedPreferences("elimu_prefs", MODE_PRIVATE)
        if (prefs.getBoolean("onboarding_done", false)) { goLogin(); return }
        setContentView(R.layout.activity_onboarding)

        pages = listOf(
            findViewById(R.id.pageWelcome),
            findViewById(R.id.pageFeatures),
            findViewById(R.id.pagePermissions),
            findViewById(R.id.pageGetStarted)
        )
        dots = listOf(
            findViewById(R.id.dot0), findViewById(R.id.dot1),
            findViewById(R.id.dot2), findViewById(R.id.dot3)
        )
        btnNext = findViewById(R.id.btnNext)
        tvSkip = findViewById(R.id.tvSkip)

        show(0)
        btnNext.setOnClickListener { next() }
        tvSkip.setOnClickListener { done() }
        findViewById<Button>(R.id.btnGrantPermissions)?.setOnClickListener { requestPerms() }
    }

    private fun show(i: Int) {
        pages.forEachIndexed { idx, v ->
            v.visibility = if (idx == i) View.VISIBLE else View.GONE
            if (idx == i) {
                val anim = AnimationUtils.loadAnimation(this, android.R.anim.fade_in)
                v.startAnimation(anim)
            }
        }
        dots.forEachIndexed { idx, d ->
            d.setBackgroundResource(if (idx == i) R.drawable.dot_active else R.drawable.dot_inactive)
        }
        btnNext.text = if (i == pages.size - 1) "Get Started →" else "Next  →"
        tvSkip.visibility = if (i == pages.size - 1) View.GONE else View.VISIBLE
    }

    private fun next() {
        if (page < pages.size - 1) { page++; show(page) } else done()
    }

    private fun done() {
        getSharedPreferences("elimu_prefs", MODE_PRIVATE)
            .edit().putBoolean("onboarding_done", true).apply()
        goLogin()
    }

    private fun requestPerms() {
        val perms = mutableListOf(
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            perms += Manifest.permission.POST_NOTIFICATIONS
            perms += Manifest.permission.READ_MEDIA_IMAGES
        } else {
            perms += Manifest.permission.READ_EXTERNAL_STORAGE
            perms += Manifest.permission.WRITE_EXTERNAL_STORAGE
        }
        val needed = perms.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (needed.isEmpty()) {
            Toast.makeText(this, "✓ All permissions already granted!", Toast.LENGTH_SHORT).show()
            page++; show(page)
        } else {
            ActivityCompat.requestPermissions(this, needed.toTypedArray(), 100)
        }
    }

    override fun onRequestPermissionsResult(code: Int, perms: Array<String>, results: IntArray) {
        super.onRequestPermissionsResult(code, perms, results)
        val g = results.count { it == PackageManager.PERMISSION_GRANTED }
        Toast.makeText(this, "$g of ${perms.size} permissions granted ✓", Toast.LENGTH_LONG).show()
        if (page < pages.size - 1) { page++; show(page) }
    }

    private fun goLogin() {
        startActivity(Intent(this, LoginActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
        finish()
    }
}
