package ke.elimusaas.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.inputmethod.EditorInfo
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import ke.elimusaas.R
import ke.elimusaas.utils.ApiClient
import ke.elimusaas.utils.BiometricHelper
import ke.elimusaas.utils.NotificationHelper
import ke.elimusaas.utils.SessionManager
import kotlinx.coroutines.*

class LoginActivity : AppCompatActivity() {

    private lateinit var etEmail: EditText
    private lateinit var etPassword: EditText
    private lateinit var etSchoolCode: EditText
    private lateinit var btnLogin: Button
    private lateinit var tvError: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var tvForgotPassword: TextView
    // btnBiometric is optional — only shown if fingerprint is enrolled
    private var btnBiometric: LinearLayout? = null

    private val session by lazy { SessionManager(this) }
    private val api by lazy { ApiClient(this) }
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        NotificationHelper.createChannel(this)

        // If already logged in, try biometric then go straight to main
        if (session.isLoggedIn) {
            if (BiometricHelper.isAvailable(this)) {
                setContentView(R.layout.activity_login)
                bindViews()
                showBiometricPrompt()
            } else {
                startMain()
            }
            return
        }

        setContentView(R.layout.activity_login)
        bindViews()
    }

    private fun bindViews() {
        etEmail       = findViewById(R.id.etEmail)
        etPassword    = findViewById(R.id.etPassword)
        etSchoolCode  = findViewById(R.id.etSchoolCode)
        btnLogin      = findViewById(R.id.btnLogin)
        tvError       = findViewById(R.id.tvError)
        progressBar   = findViewById(R.id.progressBar)
        tvForgotPassword = findViewById(R.id.tvForgotPassword)

        // Biometric button is optional — only wire it if it exists in the layout
        btnBiometric = findViewById(R.id.btnBiometric)
        if (BiometricHelper.isAvailable(this) && session.isLoggedIn) {
            btnBiometric?.visibility = View.VISIBLE
            btnBiometric?.setOnClickListener { showBiometricPrompt() }
        }

        btnLogin.setOnClickListener { doLogin() }
        etPassword.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_DONE) { doLogin(); true } else false
        }
        tvForgotPassword.setOnClickListener { showForgotPasswordDialog() }
    }

    private fun showBiometricPrompt() {
        BiometricHelper.authenticate(
            activity = this,
            onSuccess = { startMain() },
            onFailed = { /* user can use password instead */ }
        )
    }

    private fun doLogin() {
        val email      = etEmail.text.toString().trim()
        val password   = etPassword.text.toString()
        val schoolCode = etSchoolCode.text.toString().trim().ifBlank { null }

        if (email.isEmpty() || password.isEmpty()) {
            showError("Please enter your email and password")
            return
        }

        setLoading(true)
        tvError.visibility = View.GONE

        scope.launch {
            val result = withContext(Dispatchers.IO) { api.login(email, password, schoolCode) }
            setLoading(false)

            if (result.error != null) {
                showError(result.error)
                return@launch
            }

            if (result.accessToken != null && result.user != null) {
                session.accessToken  = result.accessToken
                session.refreshToken = result.refreshToken
                session.user         = result.user
                startMain()
            } else {
                showError("Login failed. Please check your credentials.")
            }
        }
    }

    private fun showForgotPasswordDialog() {
        val emailInput = EditText(this).apply {
            hint      = "admin@school.ac.ke"
            inputType = android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
            setPadding(48, 24, 48, 8)
        }
        val dialog = android.app.AlertDialog.Builder(this)
            .setTitle("Reset Password")
            .setMessage("Enter your email to receive a reset link")
            .setView(emailInput)
            .setPositiveButton("Send Reset Link") { _, _ ->
                val email = emailInput.text.toString().trim()
                if (email.isNotEmpty()) {
                    scope.launch {
                        withContext(Dispatchers.IO) { api.forgotPassword(email) }
                        Toast.makeText(
                            this@LoginActivity,
                            "Reset link sent to $email",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .create()
        dialog.show()
        dialog.getButton(android.app.AlertDialog.BUTTON_POSITIVE)
            ?.setTextColor(getColor(R.color.elimu_green))
        dialog.getButton(android.app.AlertDialog.BUTTON_NEGATIVE)
            ?.setTextColor(getColor(R.color.text_secondary))
    }

    private fun showError(msg: String) {
        tvError.text       = msg
        tvError.visibility = View.VISIBLE
    }

    private fun setLoading(loading: Boolean) {
        btnLogin.isEnabled = !loading
        btnLogin.text      = if (loading) "" else "Sign In"
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
    }

    private fun startMain() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
