#!/usr/bin/env node

// 직접 이미지 파일 테스트
const { analyzeSwing } = require('./src/utils/hybrid-analyzer');
const fs = require('fs');

async function testDirectImage() {
  console.log('🏌️ 직접 다운로드한 골프 이미지 AI 테스트');
  console.log('==========================================\n');

  try {
    // 이미지 파일 확인
    const imageFile = './golf_test.jpg';
    if (!fs.existsSync(imageFile)) {
      console.log('❌ 이미지 파일이 없습니다:', imageFile);
      return;
    }
    
    const stats = fs.statSync(imageFile);
    console.log(`📊 이미지 파일 정보:`);
    console.log(`   파일명: ${imageFile}`);
    console.log(`   크기: ${Math.round(stats.size / 1024)}KB`);
    console.log(`   출처: Wikimedia Commons - Golfer_swing.jpg`);
    
    // Base64 변환
    console.log('\n🔄 Base64 인코딩 중...');
    const imageBuffer = fs.readFileSync(imageFile);
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    const base64Size = Math.round(base64Image.length / 1024);
    console.log(`📊 Base64 크기: ${base64Size}KB`);
    
    // AI 분석 시작
    console.log('\n🤖 AI 분석 시작...');
    const startTime = Date.now();
    
    const result = await analyzeSwing(base64Image);
    
    const analysisTime = Date.now() - startTime;
    console.log(`⏱️ 분석 시간: ${analysisTime}ms`);
    
    // 결과 출력
    console.log('\n📋 분석 결과:');
    console.log('=============');
    
    if (result.success && result.data) {
      console.log('🎉 AI 분석 성공!');
      console.log(`📊 골프 점수: ${result.data.score}/100`);
      console.log(`🎯 신뢰도: ${result.data.scores?.confidence || 'N/A'}%`);
      console.log(`🤖 AI 엔진: ${result.data.processing?.aiEngine}`);
      console.log(`✅ 실제 AI: ${result.data.processing?.realAI ? 'O' : 'X'}`);
      console.log(`📸 미디어: ${result.data.processing?.mediaType}`);
      console.log(`🔧 방법: ${result.data.processing?.analysisMethod}`);
      
      // 자세 데이터
      if (result.data.pose) {
        console.log('\n📈 골프 자세 분석:');
        Object.entries(result.data.pose).forEach(([key, value]) => {
          if (typeof value === 'number' && !isNaN(value)) {
            console.log(`   ${key}: ${value.toFixed(1)}°`);
          }
        });
      }
      
      // AI 피드백
      if (result.data.feedback && result.data.feedback.length > 0) {
        console.log('\n💬 AI 피드백:');
        result.data.feedback.forEach(feedback => {
          console.log(`   • ${feedback}`);
        });
      }
      
      // 개선 제안
      if (result.data.improvements && result.data.improvements.length > 0) {
        console.log('\n💡 AI 개선 제안:');
        result.data.improvements.forEach(improvement => {
          console.log(`   • ${improvement}`);
        });
      }
      
      console.log('\n🏆 결론: 실제 골프 이미지 AI 분석 성공! ✅');
      
    } else {
      console.log('❌ AI 분석 실패');
      console.log(`🚫 오류: ${result.error || 'Unknown'}`);
      console.log(`📝 메시지: ${result.message || 'None'}`);
      
      if (result.data && result.data.processing) {
        console.log(`🔧 처리 정보: ${JSON.stringify(result.data.processing, null, 2)}`);
      }
      
      console.log('\n🔍 디버그 정보:');
      console.log(`   성공 여부: ${result.success}`);
      console.log(`   데이터 존재: ${!!result.data}`);
      console.log(`   전체 응답: ${JSON.stringify(result, null, 2).substring(0, 500)}...`);
    }
    
  } catch (error) {
    console.error('💥 테스트 실행 오류:', error.message);
    console.error('Stack:', error.stack);
  }
}

testDirectImage();