// 이미지 최적화 유틸리티
const sharp = require('sharp');

class ImageOptimizer {
  constructor(options = {}) {
    this.options = {
      maxWidth: options.maxWidth || 1280,
      maxHeight: options.maxHeight || 960,
      quality: options.quality || 80,
      format: options.format || 'jpeg',
      ...options
    };
    
    // 메모리 사용량 추적
    this.activeProcesses = 0;
    this.maxConcurrent = 3; // 동시 처리 제한
  }

  // Base64 이미지 최적화
  async optimizeBase64(base64String) {
    try {
      // 동시 처리 제한
      while (this.activeProcesses >= this.maxConcurrent) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      this.activeProcesses++;
      
      // Base64 디코딩
      const buffer = Buffer.from(
        base64String.replace(/^data:image\/\w+;base64,/, ''), 
        'base64'
      );
      
      // Sharp로 최적화
      const optimized = await sharp(buffer)
        .resize(this.options.maxWidth, this.options.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ 
          quality: this.options.quality,
          progressive: true,
          mozjpeg: true
        })
        .toBuffer();
      
      this.activeProcesses--;
      
      // 크기 비교
      const reduction = ((buffer.length - optimized.length) / buffer.length * 100).toFixed(1);
      console.log(`📸 이미지 최적화: ${(buffer.length / 1024).toFixed(1)}KB → ${(optimized.length / 1024).toFixed(1)}KB (${reduction}% 감소)`);
      
      return {
        buffer: optimized,
        base64: optimized.toString('base64'),
        size: optimized.length,
        originalSize: buffer.length,
        reduction: parseFloat(reduction)
      };
    } catch (error) {
      this.activeProcesses--;
      console.error('이미지 최적화 오류:', error);
      throw error;
    }
  }

  // 분석용 이미지 전처리
  async prepareForAnalysis(base64String) {
    try {
      const buffer = Buffer.from(
        base64String.replace(/^data:image\/\w+;base64,/, ''), 
        'base64'
      );
      
      // 분석에 최적화된 크기로 리사이징
      const prepared = await sharp(buffer)
        .resize(640, 480, {
          fit: 'inside',
          withoutEnlargement: false
        })
        .grayscale() // 흑백 변환으로 처리 속도 향상
        .normalize() // 명암 정규화
        .sharpen() // 엣지 선명화
        .toBuffer();
      
      return {
        buffer: prepared,
        base64: prepared.toString('base64'),
        metadata: await sharp(prepared).metadata()
      };
    } catch (error) {
      console.error('분석 전처리 오류:', error);
      throw error;
    }
  }

  // 썸네일 생성
  async createThumbnail(base64String, size = 200) {
    try {
      const buffer = Buffer.from(
        base64String.replace(/^data:image\/\w+;base64,/, ''), 
        'base64'
      );
      
      const thumbnail = await sharp(buffer)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 70 })
        .toBuffer();
      
      return thumbnail.toString('base64');
    } catch (error) {
      console.error('썸네일 생성 오류:', error);
      throw error;
    }
  }

  // 메타데이터 추출
  async extractMetadata(base64String) {
    try {
      const buffer = Buffer.from(
        base64String.replace(/^data:image\/\w+;base64,/, ''), 
        'base64'
      );
      
      const metadata = await sharp(buffer).metadata();
      
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: buffer.length,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation
      };
    } catch (error) {
      console.error('메타데이터 추출 오류:', error);
      return null;
    }
  }

  // 배치 처리
  async optimizeBatch(base64Array, onProgress) {
    const results = [];
    const total = base64Array.length;
    
    for (let i = 0; i < total; i++) {
      try {
        const result = await this.optimizeBase64(base64Array[i]);
        results.push(result);
        
        if (onProgress) {
          onProgress({
            current: i + 1,
            total,
            percentage: ((i + 1) / total * 100).toFixed(1)
          });
        }
      } catch (error) {
        results.push({ error: error.message });
      }
    }
    
    return results;
  }

  // 메모리 정리
  cleanup() {
    if (global.gc) {
      global.gc();
      console.log('🧹 메모리 정리 완료');
    }
  }

  // 통계
  getStats() {
    return {
      activeProcesses: this.activeProcesses,
      maxConcurrent: this.maxConcurrent,
      memoryUsage: process.memoryUsage()
    };
  }
}

module.exports = ImageOptimizer;