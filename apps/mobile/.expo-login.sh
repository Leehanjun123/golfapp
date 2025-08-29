#!/bin/bash
echo "🏌️ Expo 로그인 중..."

# 로그인 스크립트
expect << EOF
spawn npx expo login
expect "Email or username:"
send "paparapapico\r"
expect "Password:"
send "jj369369^^\r"
expect eof
EOF

echo "✅ 로그인 완료!"