#!/usr/bin/env node

// 실제 사진 인식 실패 원인 진단
const { analyzeSwing } = require('./src/utils/hybrid-analyzer');
const fs = require('fs');
const path = require('path');

class PhotoDiagnostic {
  async diagnoseRealPhotoIssues() {
    console.log('🔍 실제 사진 인식 실패 원인 진단');
    console.log('================================\n');

    // 1. 테스트용 더미 이미지 분석
    const testValidImage = fs.readFileSync('./test-valid-image.txt', 'utf8').trim();
    console.log('📊 테스트 이미지 정보:');
    console.log(`   크기: ${testValidImage.length} 바이트`);
    console.log(`   타입: ${testValidImage.substring(0, 30)}`);
    
    // Base64 디코드하여 실제 이미지 크기 확인
    const base64Data = testValidImage.split(',')[1];
    const imageBuffer = Buffer.from(base64Data, 'base64');
    console.log(`   실제 이미지 크기: ${imageBuffer.length} 바이트\n`);

    // 2. AI 분석 시도
    console.log('🤖 AI 분석 시도:');
    const result = await analyzeSwing(testValidImage);
    
    console.log('📋 분석 결과:');
    console.log(`   성공: ${result.success}`);
    if (result.error) {
      console.log(`   오류: ${result.error}`);
      console.log(`   메시지: ${result.message}`);
    }
    console.log(`   데이터: ${result.data ? 'O' : 'X'}`);
    
    if (result.data?.processing) {
      console.log(`   AI 엔진: ${result.data.processing.aiEngine}`);
      console.log(`   데이터 소스: ${result.data.processing.dataSource}`);
      console.log(`   실제 AI: ${result.data.processing.realAI}`);
    }

    console.log('\n🔍 문제 진단:');
    
    if (imageBuffer.length < 1000) {
      console.log('   ❌ 이미지가 너무 작음 (< 1KB)');
      console.log('   💡 MediaPipe는 최소 해상도가 필요함');
    }
    
    // 더미 이미지는 1x1 픽셀의 흰색 점
    if (imageBuffer.length < 100) {
      console.log('   ❌ 더미 이미지 감지: 1x1 픽셀 이미지');
      console.log('   💡 실제 사람이 있는 이미지 필요');
    }

    console.log('\n💡 해결 방안:');
    console.log('   1. 최소 300x300 픽셀 이상의 이미지');
    console.log('   2. 전신이 보이는 골프 자세');
    console.log('   3. 명확한 배경 대비');
    console.log('   4. 충분한 조명');
    
    // 3. MediaPipe 설정 최적화 제안
    console.log('\n🔧 MediaPipe 설정 최적화:');
    console.log('   현재 임계값: 0.3');
    console.log('   제안: 0.1로 더 낮춤 (매우 관대한 감지)');
    console.log('   이미지 전처리: 대비/밝기 조정 필요');

    return {
      imageSize: imageBuffer.length,
      isValidSize: imageBuffer.length > 1000,
      analysisSuccess: result.success,
      recommendation: imageBuffer.length < 1000 ? 'need_larger_image' : 'need_real_photo'
    };
  }
}

const diagnostic = new PhotoDiagnostic();
diagnostic.diagnoseRealPhotoIssues();