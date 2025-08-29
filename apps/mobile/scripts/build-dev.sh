#!/bin/bash

echo "🏌️ Golf AI Coach - Development Build Script"
echo "==========================================="

# Check environment
echo "📱 Checking environment..."
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start Metro bundler in background
echo "🚇 Starting Metro bundler..."
npx expo start --clear &
METRO_PID=$!

# Wait for Metro to start
sleep 5

# Platform selection
echo ""
echo "Select platform to run:"
echo "1) iOS Simulator"
echo "2) Android Emulator"
echo "3) Both"
echo "4) Web"
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        echo "🍎 Running on iOS Simulator..."
        npx expo run:ios
        ;;
    2)
        echo "🤖 Running on Android Emulator..."
        npx expo run:android
        ;;
    3)
        echo "📱 Running on both platforms..."
        npx expo run:ios &
        npx expo run:android &
        wait
        ;;
    4)
        echo "🌐 Running on Web..."
        npx expo start --web
        ;;
    *)
        echo "❌ Invalid choice"
        kill $METRO_PID
        exit 1
        ;;
esac

# Keep Metro running
wait $METRO_PID