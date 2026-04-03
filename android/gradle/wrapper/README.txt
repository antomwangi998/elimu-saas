The gradle-wrapper.jar is not included in this repo because it's a binary.
GitHub Actions will auto-generate it via the 'Setup Android SDK' step.

If building locally for the first time, run:
  gradle wrapper --gradle-version 8.4
This will generate gradle-wrapper.jar automatically.
