# ElimuSaaS Android App — Mobile Phone Guide
## Build your APK using only your phone. No PC, no terminal needed.

---

## Overview

Everything happens on GitHub's servers (GitHub Actions).
Your phone is only used to upload files and tap buttons.

    Your Phone
        ↓  push android/ folder to GitHub
    GitHub Actions (cloud server)
        ↓  auto-generates keystore
        ↓  builds & signs the APK
        ↓  publishes to GitHub Releases
    Your Phone
        ↓  download & install the APK

---

## STEP 1 — Add the android folder to your GitHub repo

Your repo: github.com/antomwangi998/elimu-saas

You need to push the new files from the zip:
  - android/  (the Kotlin app)
  - .github/workflows/build-apk.yml  (the build pipeline)
  - frontend/index.html  (already has the download button)

### Easiest way on mobile — use Acode or Spck Editor:

1. Install "Acode - Code Editor" from Play Store (free)
2. Install "ZArchiver" from Play Store (to unzip)
3. Unzip the downloaded elimu-saas-FINAL.zip with ZArchiver
4. Open Acode → tap the Git icon → Clone repository
5. Enter: https://github.com/antomwangi998/elimu-saas
6. Enter your GitHub username and a Personal Access Token (PAT)
   - To create a PAT: github.com → Settings → Developer settings
     → Personal access tokens → Tokens (classic) → Generate new token
     → Tick "repo" → Generate → copy the token
7. Copy the android/ folder from the unzipped file into the cloned repo
8. Copy .github/ folder too
9. Copy frontend/index.html too
10. In Acode: Git → Stage all → Commit "Add Android app" → Push

### Alternative — upload the workflow file manually on Chrome:

The most important file is the workflow. You can add it directly:

1. Open github.com/antomwangi998/elimu-saas on Chrome
2. Tap Add file → Create new file
3. In the name box type: .github/workflows/build-apk.yml
   (GitHub creates the folders automatically)
4. Open the build-apk.yml file from your unzipped folder
5. Copy its entire contents and paste into GitHub's editor
6. Tap Commit changes → Commit directly to main

Then use Acode to push the android/ source folder.

---

## STEP 2 — Run the build (no secrets needed first time!)

The workflow auto-generates a keystore if you have none.

1. Open github.com/antomwangi998/elimu-saas on your phone
2. Tap the Actions tab
3. Tap "Build & Release ElimuSaaS APK"
4. Tap "Run workflow"
5. Version name: 1.0.0
6. Release notes: First release
7. Tap the green Run workflow button

Wait 5 minutes. You will see a green checkmark when done.

---

## STEP 3 — Save your keystore secrets (do this once)

1. Tap the completed build (green tick)
2. Expand the "Setup keystore" step
3. You will see output like:

   KEYSTORE_BASE64   → /u3+7QAAAA...(long string)...==
   KEYSTORE_PASSWORD → ElimuSaaS2025!Secure
   KEY_ALIAS         → elimusaas
   KEY_PASSWORD      → ElimuSaaS2025!Secure

4. Save them to GitHub Secrets:
   Repo → Settings → Secrets and variables → Actions → New repository secret
   Add all 4: KEYSTORE_BASE64, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD

Why? If you skip this, the next build generates a NEW keystore.
Android treats a different keystore as a different app — users would
have to uninstall and reinstall. Save the secrets once, done forever.

---

## STEP 4 — Download and install your APK

1. Go to github.com/antomwangi998/elimu-saas/releases
2. Tap ElimuSaaS-v1.0.0.apk to download
3. Open the downloaded file → tap Install
4. If blocked: Settings → Security → Install unknown apps → Allow for Chrome

---

## STEP 5 — The website is already wired

The login page on your website already has a "Get the Android App" button
that links directly to your GitHub release APK download.

When a user taps it on their phone:
  - They get a download modal
  - They download and install the APK
  - They log in with their normal school credentials
  - The app hits the same backend: https://elimu-saas.onrender.com
  - Same data as the website, but with extra native features

---

## Releasing future updates

Actions → Run workflow → enter 1.0.1 → Run
New APK is published automatically. The website's download link
always points to the latest release automatically.

---

## App features vs website

Feature                      Website   Android App
Dashboard, Exams, Students     YES        YES
Fingerprint login               NO        YES
Works offline (cached data)     NO        YES
Local push notifications        NO        YES
No browser needed               NO        YES

Both hit the same backend: https://elimu-saas.onrender.com/api
Data is always in sync.

---

## Troubleshooting

Build failed in Actions
  Tap the red X → tap the failed step → read the error → share here

"App not installed"
  Settings → Apps → Special app access → Install unknown apps
  → find Chrome → Allow from this source

App says "Cannot reach server"
  Your Render backend is sleeping. Open the website first,
  wait 30 seconds, then try the app again.
