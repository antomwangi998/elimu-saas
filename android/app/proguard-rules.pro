# ElimuSaaS ProGuard Rules

# Keep app entry points
-keep class ke.elimusaas.ui.** { *; }
-keep class ke.elimusaas.data.** { *; }
-keep class ke.elimusaas.utils.** { *; }

# Gson serialization
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }

# Android
-keep class androidx.** { *; }
-keep class com.google.android.material.** { *; }
-keepclassmembers class * extends android.app.Activity { public void *(android.view.View); }

# Remove logging in release
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
