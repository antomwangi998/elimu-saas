package ke.elimusaas.utils

import android.content.Context
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity

object BiometricHelper {

    fun isAvailable(context: Context): Boolean {
        val bm = BiometricManager.from(context)
        return bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK) ==
                BiometricManager.BIOMETRIC_SUCCESS
    }

    fun authenticate(
        activity: FragmentActivity,
        onSuccess: () -> Unit,
        onFailed: () -> Unit
    ) {
        val executor = ContextCompat.getMainExecutor(activity)
        val prompt = BiometricPrompt(activity, executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    onSuccess()
                }
                override fun onAuthenticationError(code: Int, msg: CharSequence) {
                    super.onAuthenticationError(code, msg)
                    onFailed()
                }
                override fun onAuthenticationFailed() {
                    super.onAuthenticationFailed()
                }
            })
        val info = BiometricPrompt.PromptInfo.Builder()
            .setTitle("ElimuSaaS")
            .setSubtitle("Sign in with your fingerprint")
            .setNegativeButtonText("Use password instead")
            .build()
        prompt.authenticate(info)
    }
}
