#!/usr/bin/env node

// AI 분석 시스템 테스트
const { analyzeSwing } = require('./src/utils/hybrid-analyzer');

// 테스트용 더미 base64 이미지 데이터 (1픽셀 흰색 PNG)
const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg==';

async function testAI() {
  console.log('🧪 AI 분석 시스템 테스트 시작...\n');
  
  try {
    const result = await analyzeSwing(testImageBase64);
    
    console.log('📊 테스트 결과:');
    console.log('================');
    console.log(`✅ 성공 여부: ${result.success}`);
    
    if (result.success) {
      console.log(`🤖 AI 엔진 상태: ${result.data.aiEngineStatus}`);
      console.log(`📈 분석 상태: ${result.data.analysisStatus}`);
      console.log(`🔧 실제 AI 사용: ${result.data.processing?.realAI}`);
      console.log(`🎯 AI 엔진: ${result.data.processing?.aiEngine || 'N/A'}`);
      console.log(`📝 피드백: ${result.data.feedback?.[0] || 'N/A'}`);
    } else {
      console.log(`❌ 오류: ${result.error}`);
      console.log(`🔍 기술적 오류: ${result.technicalError}`);
      console.log(`⚠️ AI 엔진 상태: ${result.data?.aiEngineStatus}`);
      console.log(`📝 피드백: ${result.data?.feedback?.[0] || 'N/A'}`);
    }
    
    console.log('\n================');
    console.log(result.success ? '🎉 AI 시스템이 정상 작동합니다!' : '🚨 AI 시스템에 문제가 있습니다.');
    
  } catch (error) {
    console.error('💥 테스트 실행 오류:', error.message);
  }
}

testAI();