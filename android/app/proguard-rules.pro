# Keep WebView JS interface classes
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep activity names for navigation
-keep public class * extends android.app.Activity

# Kotlin
-keep class kotlin.** { *; }
-keep class kotlinx.** { *; }
