#!/bin/bash

echo "🏌️ Golf AI Coach - Production Build Script"
echo "========================================="

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "⚠️  EAS CLI not found. Installing..."
    npm install -g eas-cli
fi

# Check if logged in to EAS
echo "📱 Checking EAS authentication..."
eas whoami &> /dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Not logged in to EAS. Please login:"
    eas login
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf ios/build
rm -rf android/build
rm -rf .expo

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run prebuild to generate native projects
echo "🔨 Running prebuild..."
npx expo prebuild --clean

# Build for iOS
echo "🍎 Building for iOS..."
eas build --platform ios --profile production --local

# Build for Android
echo "🤖 Building for Android..."
eas build --platform android --profile production --local

echo "✅ Build complete!"
echo "========================================="
echo "Next steps:"
echo "1. Test builds on physical devices"
echo "2. Submit to App Store Connect and Google Play Console"
echo "3. Configure release notes and screenshots"