#!/bin/bash
# =============================================================
# generate-keystore.sh
# Run this ONCE locally to create your signing keystore.
# Then follow the instructions to add secrets to GitHub.
# =============================================================

set -e

KEYSTORE_FILE="elimusaas-release.jks"
KEY_ALIAS="elimusaas"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   ElimuSaaS — Keystore Generator             ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Prompt for passwords
read -s -p "Enter keystore password (min 6 chars): " KEYSTORE_PASSWORD
echo ""
read -s -p "Confirm keystore password: " KEYSTORE_PASSWORD2
echo ""

if [ "$KEYSTORE_PASSWORD" != "$KEYSTORE_PASSWORD2" ]; then
  echo "❌ Passwords do not match. Exiting."
  exit 1
fi

read -s -p "Enter key password (can be same as above): " KEY_PASSWORD
echo ""

echo ""
echo "Generating keystore..."

keytool -genkeypair \
  -v \
  -keystore "$KEYSTORE_FILE" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias "$KEY_ALIAS" \
  -storepass "$KEYSTORE_PASSWORD" \
  -keypass "$KEY_PASSWORD" \
  -dname "CN=ElimuSaaS, OU=Mobile, O=ElimuSaaS Ltd, L=Nairobi, ST=Nairobi, C=KE"

echo ""
echo "✅ Keystore created: $KEYSTORE_FILE"
echo ""

# Base64 encode for GitHub secret
KEYSTORE_BASE64=$(base64 -w 0 "$KEYSTORE_FILE")

echo "══════════════════════════════════════════════════"
echo "  Add these 4 secrets to your GitHub repository:"
echo "  Repo → Settings → Secrets → Actions → New secret"
echo "══════════════════════════════════════════════════"
echo ""
echo "Secret name:  KEYSTORE_BASE64"
echo "Secret value: $KEYSTORE_BASE64"
echo ""
echo "Secret name:  KEYSTORE_PASSWORD"
echo "Secret value: $KEYSTORE_PASSWORD"
echo ""
echo "Secret name:  KEY_ALIAS"
echo "Secret value: $KEY_ALIAS"
echo ""
echo "Secret name:  KEY_PASSWORD"
echo "Secret value: $KEY_PASSWORD"
echo ""
echo "══════════════════════════════════════════════════"
echo ""
echo "⚠️  IMPORTANT: Store $KEYSTORE_FILE safely — you need"
echo "    the SAME keystore for every future update."
echo "    Back it up to a secure location NOW."
echo ""
echo "Once secrets are added, trigger a release by:"
echo "  git tag v1.0.0 && git push origin v1.0.0"
echo ""
