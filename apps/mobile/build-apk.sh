#!/bin/bash

echo "🏌️ Golf AI Coach APK Builder"
echo "=============================="
echo ""

# API URL 설정
API_URL="https://icy-cycles-wash.loca.lt"
echo "📡 Backend URL: $API_URL"
echo ""

# 환경변수 설정
export EXPO_PUBLIC_API_URL=$API_URL

# 웹 빌드를 위한 준비
echo "📦 Building Golf AI Coach..."
npx expo export --platform android --output-dir ./dist-android

echo ""
echo "✅ Build complete!"
echo ""
echo "📱 Installation Instructions:"
echo "1. Upload the files in ./dist-android to a web server"
echo "2. Or use the Expo online APK builder at: https://expo.dev/eas"
echo ""
echo "🔗 Alternative: Use the web version directly"
echo "   URL: http://192.168.45.217:8082"
echo "   This works on any mobile browser!"