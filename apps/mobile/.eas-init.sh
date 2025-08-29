#!/bin/bash
echo "🚀 EAS 프로젝트 초기화 중..."

expect << EOF
spawn eas init
expect "Would you like to create a project"
send "Y\r"
expect eof
EOF

echo "✅ EAS 프로젝트 초기화 완료!"