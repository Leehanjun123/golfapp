# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# 최적화 및 난독화 활성화
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*
-optimizationpasses 5
-allowaccessmodification
-dontpreverify
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-verbose

# 사용하지 않는 클래스 및 메서드 제거
-dontwarn **
-ignorewarnings

# 리소스 최적화
-keep class **.R
-keep class **.R$* { <fields>; }

# JSC 및 Hermes 최적화
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
