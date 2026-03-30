# ElimuSaaS Android App — Setup Guide

This folder contains the native Android app (Kotlin WebView wrapper) for ElimuSaaS,
along with a GitHub Actions pipeline that automatically builds, signs, and publishes
the APK to GitHub Releases whenever you push a version tag.

---

## How It All Fits Together

```
Your Repo (GitHub)
├── android/                  ← Kotlin app source
├── frontend/index.html       ← Has "Get Android App" button → GitHub Releases
└── .github/workflows/
    └── build-apk.yml         ← Auto-builds APK on git tag push
                                       ↓
                              GitHub Release page
                              (ElimuSaaS-v1.0.0.apk attached)
                                       ↓
                              User downloads & installs APK
```

---

## Step 1 — Generate Your Signing Keystore (Do This Once)

You need a keystore to sign your APK. **Use the same keystore for every release forever** — 
Android will reject updates signed with a different key.

Run this on your local machine (requires Java/keytool installed):

```bash
cd android
chmod +x generate-keystore.sh
./generate-keystore.sh
```

The script will:
1. Create `elimusaas-release.jks`
2. Print out 4 GitHub secret values — **copy them immediately**

> ⚠️ **Back up your `.jks` file** to Google Drive, a USB drive, or a password manager.
> If you lose it, you can never update the app under the same package name.

---

## Step 2 — Add Secrets to GitHub

Go to your repository on GitHub:

**Settings → Secrets and variables → Actions → New repository secret**

Add all 4 secrets printed by the script:

| Secret Name        | Description                          |
|--------------------|--------------------------------------|
| `KEYSTORE_BASE64`  | Base64-encoded keystore file         |
| `KEYSTORE_PASSWORD`| Password for the keystore            |
| `KEY_ALIAS`        | Key alias (default: `elimusaas`)     |
| `KEY_PASSWORD`     | Password for the key                 |

GitHub Actions uses these automatically — they are never exposed in logs.

---

## Step 3 — Update the APK Download URL in the Frontend

In `frontend/index.html`, find the `apk-download-link` anchor and update it to match
your actual GitHub username/repo:

```html
<!-- Change this URL to your real repo -->
href="https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest/download/ElimuSaaS-v1.0.0.apk"
```

The GitHub Actions workflow names the APK `ElimuSaaS-v{version}.apk` — the "latest"
release will always have the most recent one.

---

## Step 4 — Publish Your First Release

Once secrets are set up, publishing is just a git tag:

```bash
# Tag the release
git add .
git commit -m "Release v1.0.0"
git tag v1.0.0
git push origin main --tags
```

GitHub Actions will automatically:
1. ✅ Check out the code
2. ✅ Set up JDK 17 + Android SDK
3. ✅ Patch the version number into build.gradle
4. ✅ Decode the keystore from your secret
5. ✅ Build a signed release APK
6. ✅ Rename it to `ElimuSaaS-v1.0.0.apk`
7. ✅ Create a GitHub Release with install instructions
8. ✅ Attach the APK to the release
9. ✅ Wipe the keystore from the runner

Watch it run at: `https://github.com/YOUR_USERNAME/YOUR_REPO/actions`

---

## Step 5 — Manual Trigger (Optional)

You can also trigger a build without a git tag, directly from the GitHub Actions tab:

1. Go to **Actions → Build & Release ElimuSaaS APK**
2. Click **Run workflow**
3. Enter a version name and release notes
4. Click **Run workflow**

---

## Releasing Updates

For every future update, simply bump the tag:

```bash
git tag v1.0.1
git push origin v1.0.1
```

Users who already have the app installed will need to download and install the new APK
manually (since you're distributing outside the Play Store). You can notify them via
WhatsApp/SMS using ElimuSaaS's built-in communication module.

---

## App Configuration

The app points to your live Render deployment. To change the URL, edit:

```kotlin
// android/app/src/main/java/ke/elimusaas/MainActivity.kt
private val APP_URL = "https://elimufrontend.onrender.com"
```

---

## Troubleshooting

**Build fails with "keystore not found"**
→ Make sure `KEYSTORE_BASE64` secret is set and is a valid base64 string.
   Re-run `generate-keystore.sh` and copy the output again.

**Build fails with "invalid keystore format"**
→ The base64 encoding may have line breaks. Make sure you used `base64 -w 0`
   (the `-w 0` flag disables line wrapping).

**APK installs but shows blank screen**
→ Check that `APP_URL` in MainActivity.kt is correct and the Render backend is running.

**"App not installed" error on device**
→ Enable "Install from unknown sources" in Android Settings → Security.
   On Android 8+, grant permission to the specific app you're installing from
   (e.g. Chrome or Files).
