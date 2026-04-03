package ke.elimusaas.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import ke.elimusaas.R
import ke.elimusaas.utils.ApiClient
import ke.elimusaas.utils.BiometricHelper
import ke.elimusaas.utils.NotificationHelper
import ke.elimusaas.utils.SessionManager
import kotlinx.coroutines.*

class LoginActivity : AppCompatActivity() {

    private val session by lazy { SessionManager(this) }
    private val api by lazy { ApiClient(this) }
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try { NotificationHelper.createChannel(this) } catch (_: Exception) {}
        if (session.isLoggedIn) { startMain(); return }
        setContentView(R.layout.activity_login)

        val etEmail    = findViewById<EditText>(R.id.etEmail) ?: return
        val etPassword = findViewById<EditText>(R.id.etPassword) ?: return
        val etCode     = findViewById<EditText>(R.id.etSchoolCode) ?: return
        val btnLogin   = findViewById<Button>(R.id.btnLogin) ?: return
        val tvError    = findViewById<TextView>(R.id.tvError) ?: return
        val progress   = findViewById<ProgressBar>(R.id.progressBar) ?: return
        val tvForgot   = findViewById<TextView>(R.id.tvForgotPassword)

        btnLogin.setOnClickListener {
            hideKeyboard()
            doLogin(etEmail, etPassword, etCode, btnLogin, tvError, progress)
        }

        etPassword.setOnEditorActionListener { _, id, _ ->
            if (id == EditorInfo.IME_ACTION_DONE) {
                hideKeyboard()
                doLogin(etEmail, etPassword, etCode, btnLogin, tvError, progress)
                true
            } else false
        }

        tvForgot?.setOnClickListener { showForgotDialog() }

        // Try biometric if saved credentials exist
        val btnBio = findViewById<Button>(R.id.btnBiometric)
        if (BiometricHelper.isAvailable(this) && session.accessToken != null) {
            btnBio?.visibility = View.VISIBLE
            btnBio?.setOnClickListener {
                BiometricHelper.authenticate(this,
                    onSuccess = { startMain() },
                    onError = { msg -> tvError.text = msg; tvError.visibility = View.VISIBLE }
                )
            }
        } else {
            btnBio?.visibility = View.GONE
        }
    }

    private fun doLogin(
        etEmail: EditText, etPassword: EditText, etCode: EditText,
        btn: Button, tvError: TextView, progress: ProgressBar
    ) {
        val email    = etEmail.text.toString().trim()
        val password = etPassword.text.toString()
        val code     = etCode.text.toString().trim().ifBlank { null }

        if (email.isEmpty() || password.isEmpty()) {
            tvError.text = "Please enter your email and password"
            tvError.visibility = View.VISIBLE
            return
        }

        setLoading(btn, progress, true)
        tvError.visibility = View.GONE

        scope.launch {
            val r = withContext(Dispatchers.IO) {
                try { api.login(email, password, code) }
                catch (e: Exception) {
                    ke.elimusaas.data.LoginResponse(null, null, null,
                        "Network error: ${e.message ?: "Cannot reach server"}")
                }
            }
            setLoading(btn, progress, false)
            when {
                r.error != null -> {
                    tvError.text = r.error
                    tvError.visibility = View.VISIBLE
                }
                r.accessToken != null && r.user != null -> {
                    session.accessToken  = r.accessToken
                    session.refreshToken = r.refreshToken
                    session.user         = r.user
                    startMain()
                }
                else -> {
                    tvError.text = "Login failed. Please check your credentials."
                    tvError.visibility = View.VISIBLE
                }
            }
        }
    }

    private fun showForgotDialog() {
        val input = EditText(this).apply {
            hint = "admin@school.ac.ke"
            inputType = android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
            setPadding(48, 24, 48, 8)
        }
        android.app.AlertDialog.Builder(this)
            .setTitle("Reset Password")
            .setMessage("Enter your email address")
            .setView(input)
            .setPositiveButton("Send Reset Link") { _, _ ->
                val email = input.text.toString().trim()
                if (email.isNotEmpty()) scope.launch {
                    withContext(Dispatchers.IO) { try { api.forgotPassword(email) } catch (_: Exception) {} }
                    Toast.makeText(this@LoginActivity, "Reset link sent to $email ✓", Toast.LENGTH_LONG).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun setLoading(btn: Button, progress: ProgressBar, on: Boolean) {
        btn.isEnabled = !on
        btn.text = if (on) "" else "SIGN IN"
        progress.visibility = if (on) View.VISIBLE else View.GONE
    }

    private fun hideKeyboard() {
        try {
            val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
            imm.hideSoftInputFromWindow(currentFocus?.windowToken, 0)
        } catch (_: Exception) {}
    }

    private fun startMain() {
        startActivity(Intent(this, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
