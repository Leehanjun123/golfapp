// Golf Pro API - Image Optimization Service

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// ===========================================
// 이미지 최적화 설정
// ===========================================
const optimizationConfig = {
  // 이미지 크기 프리셋
  sizes: {
    thumbnail: { width: 150, height: 150, quality: 70 },
    small: { width: 400, height: 400, quality: 80 },
    medium: { width: 800, height: 600, quality: 85 },
    large: { width: 1280, height: 960, quality: 90 },
    original: { width: null, height: null, quality: 95 }
  },
  
  // 골프 분석용 특별 크기
  golf: {
    analysis: { width: 640, height: 480, quality: 85 },
    comparison: { width: 400, height: 300, quality: 80 },
    preview: { width: 200, height: 150, quality: 75 }
  },
  
  // 지원 포맷
  formats: {
    webp: { quality: 85, effort: 4 },
    jpeg: { quality: 85, progressive: true, mozjpeg: true },
    png: { compressionLevel: 8, adaptiveFiltering: true },
    avif: { quality: 70, effort: 4 }
  },
  
  // 파일 크기 제한 (바이트)
  limits: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxWidth: 4000,
    maxHeight: 4000,
    minWidth: 100,
    minHeight: 100
  }
};

// ===========================================
// 이미지 최적화 클래스
// ===========================================
class ImageOptimizer {
  constructor(config = optimizationConfig) {
    this.config = config;
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
  }

  // Base64 이미지 검증 및 디코딩
  async validateAndDecodeBase64(base64String) {
    try {
      // Data URL 형식 확인 및 분리
      const dataUrlMatch = base64String.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,(.+)$/i);
      
      if (!dataUrlMatch) {
        throw new Error('Invalid base64 image format');
      }
      
      const [, format, base64Data] = dataUrlMatch;
      const buffer = Buffer.from(base64Data, 'base64');
      
      // 파일 크기 검증
      if (buffer.length > this.config.limits.maxFileSize) {
        throw new Error(`Image too large: ${buffer.length} bytes (max: ${this.config.limits.maxFileSize} bytes)`);
      }
      
      if (buffer.length < 100) {
        throw new Error('Image too small');
      }
      
      return {
        buffer,
        originalFormat: format.toLowerCase(),
        size: buffer.length,
        hash: crypto.createHash('md5').update(buffer).digest('hex')
      };
      
    } catch (error) {
      throw new Error(`Image validation failed: ${error.message}`);
    }
  }

  // 이미지 메타데이터 추출
  async extractMetadata(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      
      // 크기 제한 검증
      if (metadata.width > this.config.limits.maxWidth || metadata.height > this.config.limits.maxHeight) {
        throw new Error(`Image dimensions too large: ${metadata.width}x${metadata.height}`);
      }
      
      if (metadata.width < this.config.limits.minWidth || metadata.height < this.config.limits.minHeight) {
        throw new Error(`Image dimensions too small: ${metadata.width}x${metadata.height}`);
      }
      
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        colorSpace: metadata.space,
        channels: metadata.channels,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        hasProfile: !!metadata.icc,
        aspectRatio: metadata.width / metadata.height
      };
      
    } catch (error) {
      throw new Error(`Metadata extraction failed: ${error.message}`);
    }
  }

  // 이미지 최적화 (다중 크기 생성)
  async optimizeImage(buffer, options = {}) {
    const {
      sizes = ['thumbnail', 'medium', 'analysis'],
      formats = ['webp', 'jpeg'],
      useGolfSizes = true,
      preserveAspectRatio = true,
      backgroundRemoval = false
    } = options;

    const results = {};
    const metadata = await this.extractMetadata(buffer);
    
    try {
      // 각 크기별로 최적화
      for (const sizeName of sizes) {
        const sizeConfig = useGolfSizes && this.config.golf[sizeName] 
          ? this.config.golf[sizeName] 
          : this.config.sizes[sizeName];
          
        if (!sizeConfig) {
          console.warn(`Unknown size configuration: ${sizeName}`);
          continue;
        }

        results[sizeName] = {};

        // 각 포맷으로 변환
        for (const format of formats) {
          const formatConfig = this.config.formats[format];
          if (!formatConfig) continue;

          try {
            let pipeline = sharp(buffer);

            // 배경 제거 (선택사항)
            if (backgroundRemoval && format !== 'jpeg') {
              pipeline = pipeline.removeAlpha();
            }

            // 리사이징
            if (sizeConfig.width && sizeConfig.height) {
              const resizeOptions = {
                width: sizeConfig.width,
                height: sizeConfig.height,
                fit: preserveAspectRatio ? 'inside' : 'cover',
                withoutEnlargement: true
              };

              pipeline = pipeline.resize(resizeOptions);
            }

            // 포맷별 최적화 적용
            switch (format) {
              case 'webp':
                pipeline = pipeline.webp({
                  quality: sizeConfig.quality || formatConfig.quality,
                  effort: formatConfig.effort
                });
                break;

              case 'jpeg':
                pipeline = pipeline.jpeg({
                  quality: sizeConfig.quality || formatConfig.quality,
                  progressive: formatConfig.progressive,
                  mozjpeg: formatConfig.mozjpeg
                });
                break;

              case 'png':
                pipeline = pipeline.png({
                  compressionLevel: formatConfig.compressionLevel,
                  adaptiveFiltering: formatConfig.adaptiveFiltering,
                  quality: sizeConfig.quality || 85
                });
                break;

              case 'avif':
                pipeline = pipeline.avif({
                  quality: sizeConfig.quality || formatConfig.quality,
                  effort: formatConfig.effort
                });
                break;
            }

            // 최적화 실행
            const optimizedBuffer = await pipeline.toBuffer();
            const optimizedMetadata = await sharp(optimizedBuffer).metadata();

            results[sizeName][format] = {
              buffer: optimizedBuffer,
              size: optimizedBuffer.length,
              width: optimizedMetadata.width,
              height: optimizedMetadata.height,
              format,
              compressionRatio: (buffer.length - optimizedBuffer.length) / buffer.length,
              base64: `data:image/${format};base64,${optimizedBuffer.toString('base64')}`
            };

          } catch (error) {
            console.error(`Optimization failed for ${sizeName}/${format}:`, error.message);
          }
        }
      }

      return {
        original: {
          metadata,
          size: buffer.length
        },
        optimized: results,
        processingTime: Date.now(),
        totalVariants: Object.keys(results).reduce((acc, size) => acc + Object.keys(results[size]).length, 0)
      };

    } catch (error) {
      throw new Error(`Image optimization failed: ${error.message}`);
    }
  }

  // 골프 스윙 분석용 특화 최적화
  async optimizeForGolfAnalysis(base64String) {
    const startTime = Date.now();
    
    try {
      // Base64 검증 및 디코딩
      const { buffer, hash } = await this.validateAndDecodeBase64(base64String);
      
      // 분석용 최적화
      const result = await this.optimizeImage(buffer, {
        sizes: ['analysis', 'preview', 'thumbnail'],
        formats: ['webp', 'jpeg'],
        useGolfSizes: true,
        preserveAspectRatio: true
      });

      // 분석 최적화 결과
      return {
        hash,
        analysis: result.optimized.analysis?.webp || result.optimized.analysis?.jpeg,
        preview: result.optimized.preview?.webp || result.optimized.preview?.jpeg,
        thumbnail: result.optimized.thumbnail?.webp || result.optimized.thumbnail?.jpeg,
        metadata: result.original.metadata,
        processingTime: Date.now() - startTime,
        optimizationStats: {
          originalSize: result.original.size,
          analysisSize: result.optimized.analysis?.webp?.size || result.optimized.analysis?.jpeg?.size,
          compressionRatio: result.optimized.analysis?.webp?.compressionRatio || result.optimized.analysis?.jpeg?.compressionRatio
        }
      };

    } catch (error) {
      throw new Error(`Golf analysis optimization failed: ${error.message}`);
    }
  }

  // 배치 이미지 최적화
  async batchOptimize(images, options = {}) {
    const results = [];
    const errors = [];

    for (let i = 0; i < images.length; i++) {
      try {
        const result = await this.optimizeForGolfAnalysis(images[i]);
        results.push({ index: i, success: true, data: result });
      } catch (error) {
        errors.push({ index: i, success: false, error: error.message });
      }
    }

    return {
      results,
      errors,
      summary: {
        total: images.length,
        successful: results.length,
        failed: errors.length,
        successRate: (results.length / images.length) * 100
      }
    };
  }

  // 이미지 파일 저장
  async saveOptimizedImage(optimizedData, filename = null) {
    try {
      // 파일명 생성
      if (!filename) {
        filename = `${optimizedData.hash}_${Date.now()}`;
      }

      const savedFiles = {};

      // 각 크기와 포맷별로 저장
      for (const [sizeName, formats] of Object.entries(optimizedData.optimized)) {
        savedFiles[sizeName] = {};

        for (const [format, data] of Object.entries(formats)) {
          const filepath = path.join(this.uploadDir, `${filename}_${sizeName}.${format}`);
          
          // 디렉토리 생성
          await fs.mkdir(path.dirname(filepath), { recursive: true });
          
          // 파일 저장
          await fs.writeFile(filepath, data.buffer);
          
          savedFiles[sizeName][format] = {
            filepath,
            url: `/uploads/${path.basename(filepath)}`,
            size: data.size
          };
        }
      }

      return savedFiles;

    } catch (error) {
      throw new Error(`File save failed: ${error.message}`);
    }
  }

  // 이미지 품질 분석
  async analyzeImageQuality(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      const stats = await sharp(buffer).stats();

      // 기본 품질 지표 계산
      const qualityScore = this.calculateQualityScore(metadata, stats);
      
      // 블러 감지 (라플라시안 변화량 기반 근사)
      const isBlurry = await this.detectBlur(buffer);
      
      // 밝기 분석
      const brightnessAnalysis = this.analyzeBrightness(stats);
      
      return {
        qualityScore,
        isBlurry,
        brightness: brightnessAnalysis,
        resolution: {
          width: metadata.width,
          height: metadata.height,
          megapixels: (metadata.width * metadata.height) / 1000000
        },
        colorAnalysis: {
          channels: metadata.channels,
          hasAlpha: metadata.hasAlpha,
          colorSpace: metadata.space
        },
        recommendations: this.generateQualityRecommendations(qualityScore, isBlurry, brightnessAnalysis)
      };

    } catch (error) {
      throw new Error(`Quality analysis failed: ${error.message}`);
    }
  }

  // 품질 점수 계산 (0-100)
  calculateQualityScore(metadata, stats) {
    let score = 100;

    // 해상도 점수 (30점 만점)
    const megapixels = (metadata.width * metadata.height) / 1000000;
    if (megapixels < 0.5) score -= 20;
    else if (megapixels < 1) score -= 10;
    else if (megapixels < 2) score -= 5;

    // 밝기 점수 (30점 만점)
    const avgBrightness = stats.channels[0].mean;
    if (avgBrightness < 50 || avgBrightness > 200) score -= 20;
    else if (avgBrightness < 80 || avgBrightness > 180) score -= 10;

    // 대비 점수 (20점 만점)
    const contrast = stats.channels[0].max - stats.channels[0].min;
    if (contrast < 100) score -= 15;
    else if (contrast < 150) score -= 5;

    // 채널 균형 점수 (20점 만점)
    if (metadata.channels >= 3) {
      const rMean = stats.channels[0].mean;
      const gMean = stats.channels[1].mean;
      const bMean = stats.channels[2].mean;
      
      const colorBalance = Math.max(
        Math.abs(rMean - gMean),
        Math.abs(gMean - bMean),
        Math.abs(bMean - rMean)
      );
      
      if (colorBalance > 50) score -= 15;
      else if (colorBalance > 30) score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  // 블러 감지 (간단한 구현)
  async detectBlur(buffer) {
    try {
      // 그레이스케일로 변환하고 엣지 감지
      const edges = await sharp(buffer)
        .greyscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
        })
        .raw()
        .toBuffer();

      // 엣지 강도 계산 (간단한 분산)
      const pixels = new Uint8Array(edges);
      let sum = 0;
      let sumSquared = 0;

      for (let i = 0; i < pixels.length; i++) {
        sum += pixels[i];
        sumSquared += pixels[i] * pixels[i];
      }

      const mean = sum / pixels.length;
      const variance = (sumSquared / pixels.length) - (mean * mean);
      
      // 분산이 낮으면 블러로 판정
      return variance < 100;

    } catch (error) {
      console.error('Blur detection failed:', error);
      return false;
    }
  }

  // 밝기 분석
  analyzeBrightness(stats) {
    const avgBrightness = stats.channels[0].mean;
    
    let level;
    if (avgBrightness < 60) level = 'dark';
    else if (avgBrightness < 100) level = 'dim';
    else if (avgBrightness < 160) level = 'normal';
    else if (avgBrightness < 200) level = 'bright';
    else level = 'overexposed';

    return {
      average: avgBrightness,
      level,
      histogram: stats.channels.map(channel => ({
        min: channel.min,
        max: channel.max,
        mean: channel.mean
      }))
    };
  }

  // 품질 개선 권장사항 생성
  generateQualityRecommendations(qualityScore, isBlurry, brightness) {
    const recommendations = [];

    if (qualityScore < 70) {
      recommendations.push('이미지 품질이 낮습니다. 더 좋은 조명에서 촬영해보세요.');
    }

    if (isBlurry) {
      recommendations.push('이미지가 흐릿합니다. 카메라를 안정적으로 잡고 촬영해보세요.');
    }

    if (brightness.level === 'dark') {
      recommendations.push('이미지가 너무 어둡습니다. 조명을 밝게 하거나 플래시를 사용해보세요.');
    } else if (brightness.level === 'overexposed') {
      recommendations.push('이미지가 과도하게 밝습니다. 조명을 줄이거나 그늘에서 촬영해보세요.');
    }

    if (recommendations.length === 0) {
      recommendations.push('이미지 품질이 좋습니다!');
    }

    return recommendations;
  }

  // 메모리 정리
  cleanup() {
    // Sharp 인스턴스 정리 등 필요시 구현
  }
}

// ===========================================
// 싱글톤 인스턴스
// ===========================================
const imageOptimizer = new ImageOptimizer();

// ===========================================
// Export
// ===========================================
module.exports = {
  ImageOptimizer,
  imageOptimizer,
  optimizationConfig
};