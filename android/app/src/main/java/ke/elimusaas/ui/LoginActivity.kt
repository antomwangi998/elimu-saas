package ke.elimusaas.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.inputmethod.EditorInfo
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import ke.elimusaas.R
import ke.elimusaas.utils.ApiClient
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

    private val session by lazy { SessionManager(this) }
    private val api by lazy { ApiClient(this) }
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (session.isLoggedIn) {
            startMain(); return
        }

        setContentView(R.layout.activity_login)

        etEmail          = findViewById(R.id.etEmail)
        etPassword       = findViewById(R.id.etPassword)
        etSchoolCode     = findViewById(R.id.etSchoolCode)
        btnLogin         = findViewById(R.id.btnLogin)
        tvError          = findViewById(R.id.tvError)
        progressBar      = findViewById(R.id.progressBar)
        tvForgotPassword = findViewById(R.id.tvForgotPassword)

        btnLogin.setOnClickListener { doLogin() }

        etPassword.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_DONE) { doLogin(); true } else false
        }

        tvForgotPassword.setOnClickListener { showForgotPasswordDialog() }
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
            val result = withContext(Dispatchers.IO) {
                api.login(email, password, schoolCode)
            }
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
        val input = EditText(this).apply {
            hint      = "admin@school.ac.ke"
            inputType = android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
            setPadding(48, 24, 48, 8)
        }
        android.app.AlertDialog.Builder(this)
            .setTitle("Reset Password")
            .setMessage("Enter your email to receive a reset link")
            .setView(input)
            .setPositiveButton("Send") { _, _ ->
                val email = input.text.toString().trim()
                if (email.isNotEmpty()) {
                    scope.launch {
                        withContext(Dispatchers.IO) { api.forgotPassword(email) }
                        Toast.makeText(this@LoginActivity,
                            "Reset link sent to $email", Toast.LENGTH_LONG).show()
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showError(msg: String) {
        tvError.text       = msg
        tvError.visibility = View.VISIBLE
    }

    private fun setLoading(on: Boolean) {
        btnLogin.isEnabled     = !on
        btnLogin.text          = if (on) "" else "Sign In"
        progressBar.visibility = if (on) View.VISIBLE else View.GONE
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
