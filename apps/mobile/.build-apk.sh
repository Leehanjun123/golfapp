#!/bin/bash
echo "🏌️ Golf AI Coach APK 빌드 시작..."

expect << EOF
spawn eas build --platform android --profile preview
expect "Generate a new Android Keystore?"
send "Y\r"
expect eof
EOF

echo "✅ APK 빌드 완료!"