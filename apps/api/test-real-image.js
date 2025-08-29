#!/usr/bin/env node

// 실제 골프 이미지로 AI 테스트
const { analyzeSwing } = require('./src/utils/hybrid-analyzer');
const fs = require('fs');
const path = require('path');

// 실제 사람이 포함된 테스트 이미지 생성 (간단한 도형으로 MediaPipe 테스트)
function createTestGolfImage() {
  // 간단한 SVG를 base64로 변환 (사람 형태)
  const svgContent = `
  <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
    <!-- 배경 -->
    <rect width="400" height="600" fill="#87CEEB"/>
    
    <!-- 골프 클럽 -->
    <line x1="200" y1="300" x2="180" y2="100" stroke="#654321" stroke-width="8"/>
    
    <!-- 사람 (단순화된 스틱 피규어) -->
    <!-- 머리 -->
    <circle cx="200" cy="150" r="25" fill="#FDBCB4"/>
    
    <!-- 몸통 -->
    <line x1="200" y1="175" x2="200" y2="350" stroke="#000000" stroke-width="20"/>
    
    <!-- 팔 -->
    <line x1="200" y1="200" x2="180" y2="280" stroke="#000000" stroke-width="12"/>
    <line x1="200" y1="200" x2="220" y2="280" stroke="#000000" stroke-width="12"/>
    
    <!-- 다리 -->
    <line x1="200" y1="350" x2="180" y2="480" stroke="#000000" stroke-width="15"/>
    <line x1="200" y1="350" x2="220" y2="480" stroke="#000000" stroke-width="15"/>
    
    <!-- 골프공 -->
    <circle cx="250" cy="480" r="5" fill="#FFFFFF" stroke="#000000"/>
  </svg>`;
  
  return 'data:image/svg+xml;base64,' + Buffer.from(svgContent).toString('base64');
}

async function testRealImageAI() {
  console.log('🏌️ 실제 골프 이미지로 AI 테스트...\n');
  
  const testImage = createTestGolfImage();
  
  try {
    const result = await analyzeSwing(testImage);
    
    console.log('📊 실제 이미지 테스트 결과:');
    console.log('=========================');
    console.log(`✅ 성공 여부: ${result.success}`);
    
    if (result.success) {
      console.log(`🤖 AI 엔진 상태: ${result.data.aiEngineStatus}`);
      console.log(`📈 분석 상태: ${result.data.analysisStatus}`);
      console.log(`🔧 실제 AI 사용: ${result.data.processing?.realAI}`);
      console.log(`🎯 AI 엔진: ${result.data.processing?.aiEngine}`);
      console.log(`📝 데이터 소스: ${result.data.processing?.dataSource}`);
      console.log(`📝 피드백: ${result.data.feedback?.[0]}`);
      
      if (result.data.processing?.warning) {
        console.log(`⚠️ 경고: ${result.data.processing.warning}`);
      }
      
      // 자세 데이터 확인
      if (result.data.pose && result.data.pose.shoulderRotation) {
        console.log('\n🎯 감지된 자세 데이터:');
        console.log(`   어깨 회전: ${result.data.pose.shoulderRotation}°`);
        console.log(`   엉덩이 회전: ${result.data.pose.hipRotation}°`);
        console.log(`   X-Factor: ${result.data.pose.xFactor}°`);
        console.log(`   척추 각도: ${result.data.pose.spineAngle}°`);
      }
    } else {
      console.log(`❌ 오류: ${result.error}`);
    }
    
    console.log('\n=========================');
    console.log(
      result.data?.processing?.realAI 
        ? '🎉 실제 AI가 작동했습니다!' 
        : result.success
          ? '⚠️ AI 시뮬레이션이 작동했습니다 (투명하게 표시됨)'
          : '🚨 AI 시스템 오류'
    );
    
  } catch (error) {
    console.error('💥 테스트 실행 오류:', error.message);
  }
}

testRealImageAI();