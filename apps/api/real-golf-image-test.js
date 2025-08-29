#!/usr/bin/env node

// 실제 골프 이미지로 AI 테스트
const { analyzeSwing } = require('./src/utils/hybrid-analyzer');
const https = require('https');
const fs = require('fs');

class RealGolfImageTest {
  constructor() {
    this.testResults = [];
  }

  async downloadImage(url, filename) {
    return new Promise((resolve, reject) => {
      console.log(`📥 이미지 다운로드: ${url}`);
      
      const file = fs.createWriteStream(filename);
      https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✅ 다운로드 완료: ${filename}`);
          resolve(filename);
        });
      }).on('error', (err) => {
        fs.unlink(filename, () => {});
        reject(err);
      });
    });
  }

  async imageToBase64(imagePath) {
    const imageBuffer = fs.readFileSync(imagePath);
    return `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
  }

  async testRealGolfImages() {
    console.log('🏌️ 실제 골프 이미지로 AI 분석 테스트');
    console.log('=======================================\n');

    const testImages = [
      {
        name: "Wikimedia Commons 골프 스윙",
        url: "https://upload.wikimedia.org/wikipedia/commons/6/6e/Golfer_swing.jpg",
        filename: "./test_golf_swing.jpg",
        description: "전신 골프 스윙 자세 - CC 라이센스"
      },
      {
        name: "페어웨이 샷",
        url: "https://upload.wikimedia.org/wikipedia/commons/1/18/Fairway_shot.jpg",
        filename: "./test_fairway_shot.jpg", 
        description: "페어웨이에서 골프 샷 - CC 라이센스"
      }
    ];

    for (const [index, testImage] of testImages.entries()) {
      console.log(`\n🔍 테스트 ${index + 1}: ${testImage.name}`);
      console.log(`📄 설명: ${testImage.description}`);
      console.log(`🌐 출처: ${testImage.url}`);
      console.log('-'.repeat(60));

      try {
        // 1. 이미지 다운로드
        const startTime = Date.now();
        await this.downloadImage(testImage.url, testImage.filename);
        
        // 2. Base64 변환
        const base64Image = await this.imageToBase64(testImage.filename);
        const imageSize = Math.round(base64Image.length / 1024);
        console.log(`📊 이미지 크기: ${imageSize}KB (Base64)`);
        
        // 3. AI 분석 실행
        console.log('🤖 AI 분석 시작...');
        const result = await analyzeSwing(base64Image);
        const totalTime = Date.now() - startTime;
        
        console.log(`⏱️ 전체 처리 시간: ${totalTime}ms`);
        
        // 4. 결과 분석
        if (result.success && result.data) {
          console.log('🎉 AI 분석 성공!');
          console.log(`📊 골프 점수: ${result.data.score}/100`);
          console.log(`🎯 신뢰도: ${result.data.scores?.confidence || 'N/A'}`);
          console.log(`🤖 AI 엔진: ${result.data.processing?.aiEngine}`);
          console.log(`📸 미디어 타입: ${result.data.processing?.mediaType}`);
          console.log(`✅ 실제 AI: ${result.data.processing?.realAI ? 'O' : 'X'}`);
          
          // 자세 데이터 출력
          if (result.data.pose) {
            console.log('\n📈 감지된 골프 자세:');
            Object.entries(result.data.pose).forEach(([key, value]) => {
              if (typeof value === 'number') {
                console.log(`   ${key}: ${value}°`);
              } else if (value) {
                console.log(`   ${key}: ${value}`);
              }
            });
          }
          
          // AI 피드백
          if (result.data.feedback?.length > 0) {
            console.log('\n💬 AI 피드백:');
            result.data.feedback.slice(0, 3).forEach(feedback => {
              console.log(`   • ${feedback}`);
            });
          }
          
          // 개선 제안
          if (result.data.improvements?.length > 0) {
            console.log('\n💡 개선 제안:');
            result.data.improvements.slice(0, 3).forEach(improvement => {
              console.log(`   • ${improvement}`);
            });
          }
          
          this.testResults.push({
            name: testImage.name,
            success: true,
            score: result.data.score,
            confidence: result.data.scores?.confidence,
            processingTime: totalTime,
            imageSize: imageSize,
            aiEngine: result.data.processing?.aiEngine,
            realAI: result.data.processing?.realAI
          });
          
        } else {
          console.log('❌ AI 분석 실패');
          console.log(`🚫 오류: ${result.error || 'Unknown'}`);
          console.log(`📝 메시지: ${result.message || 'None'}`);
          
          this.testResults.push({
            name: testImage.name,
            success: false,
            error: result.error,
            message: result.message,
            processingTime: totalTime,
            imageSize: imageSize
          });
        }
        
        // 임시 파일 정리
        if (fs.existsSync(testImage.filename)) {
          fs.unlinkSync(testImage.filename);
          console.log(`🗑️ 임시 파일 삭제: ${testImage.filename}`);
        }
        
      } catch (error) {
        console.log(`💥 처리 오류: ${error.message}`);
        
        this.testResults.push({
          name: testImage.name,
          success: false,
          error: error.message,
          processingTime: Date.now() - startTime
        });
      }
      
      console.log();
    }

    this.generateRealImageTestReport();
  }

  generateRealImageTestReport() {
    console.log('📊 실제 골프 이미지 AI 분석 결과 보고서');
    console.log('=========================================\n');

    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success);
    const failedTests = this.testResults.filter(r => !r.success);
    const successRate = (successfulTests.length / totalTests) * 100;

    console.log('📈 전체 결과:');
    console.log(`   총 테스트: ${totalTests}개 실제 골프 이미지`);
    console.log(`   성공: ${successfulTests.length}개`);
    console.log(`   실패: ${failedTests.length}개`);
    console.log(`   성공률: ${successRate.toFixed(1)}%`);
    
    if (successfulTests.length > 0) {
      const avgScore = successfulTests.reduce((sum, t) => sum + t.score, 0) / successfulTests.length;
      const avgTime = successfulTests.reduce((sum, t) => sum + t.processingTime, 0) / successfulTests.length;
      
      console.log(`   평균 AI 점수: ${avgScore.toFixed(1)}/100`);
      console.log(`   평균 처리 시간: ${Math.round(avgTime)}ms`);
    }

    console.log('\n🔍 상세 분석:');
    this.testResults.forEach((result, i) => {
      console.log(`\n   ${i+1}. ${result.name}:`);
      if (result.success) {
        console.log(`      ✅ 성공 - AI 점수: ${result.score}/100`);
        console.log(`      🤖 AI 엔진: ${result.aiEngine}`);
        console.log(`      ✅ 실제 AI: ${result.realAI ? 'O' : 'X'}`);
        console.log(`      ⏱️ 처리 시간: ${result.processingTime}ms`);
        console.log(`      📊 이미지 크기: ${result.imageSize}KB`);
      } else {
        console.log(`      ❌ 실패: ${result.error}`);
        console.log(`      📝 메시지: ${result.message || 'None'}`);
        console.log(`      ⏱️ 처리 시간: ${result.processingTime}ms`);
      }
    });

    console.log('\n🏆 최종 판단:');
    
    if (successRate >= 80) {
      console.log('   🟢 우수: 실제 골프 이미지 분석 성공!');
      console.log('   🚀 상용 서비스 출시 가능');
      console.log('   🏌️‍♂️ 실제 사용자들이 만족할 수 있는 수준');
    } else if (successRate >= 50) {
      console.log('   🟡 보통: 부분적 성공');
      console.log('   🧪 베타 테스트 단계 권장');
      console.log('   🔧 추가 최적화 필요');
    } else if (successRate > 0) {
      console.log('   🟠 제한적: 일부 성공');
      console.log('   📊 더 많은 실제 데이터로 테스트 필요');
      console.log('   ⚙️ AI 파라미터 추가 튜닝 권장');
    } else {
      console.log('   🔴 개선 필요: 실제 이미지 인식 실패');
      console.log('   🛠️ MediaPipe 설정 재검토 필요');
      console.log('   📋 이미지 전처리 파이프라인 강화 권장');
    }

    console.log('\n💡 개선된 시스템 특징:');
    console.log('   ✅ MediaPipe 임계값 0.1로 최적화');
    console.log('   ✅ 이미지 전처리 파이프라인 적용');
    console.log('   ✅ 실제 AI만 사용, 가짜 데이터 완전 제거');
    console.log('   ✅ 투명한 에러 처리');
    console.log('   ✅ 비디오 분석 기능 추가');

    if (successRate > 0) {
      console.log('\n🎯 다음 단계:');
      console.log('   1. 더 다양한 실제 골프 이미지로 테스트');
      console.log('   2. 모바일 앱 통합');
      console.log('   3. 실제 사용자 베타 테스트');
    } else {
      console.log('\n🔧 권장 개선 사항:');
      console.log('   1. MediaPipe 모델 업데이트 검토');
      console.log('   2. 이미지 전처리 알고리즘 강화');
      console.log('   3. 다양한 해상도/형식 이미지로 추가 테스트');
    }
  }

  async run() {
    await this.testRealGolfImages();
  }
}

const tester = new RealGolfImageTest();
tester.run().catch(console.error);