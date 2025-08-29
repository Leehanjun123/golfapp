import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

interface OptimizeOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png';
}

class ImageOptimizer {
  // 이미지 압축 및 최적화
  async optimizeImage(uri: string, options: OptimizeOptions = {}): Promise<string> {
    const {
      quality = 0.8,
      maxWidth = 1920,
      maxHeight = 1080,
      format = 'jpeg'
    } = options;

    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: maxWidth, height: maxHeight } }],
        {
          compress: quality,
          format: format === 'png' ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG
        }
      );

      return manipResult.uri;
    } catch (error) {
      console.error('Image optimization failed:', error);
      return uri; // 실패시 원본 반환
    }
  }

  // 스윙 분석용 이미지 최적화 (고품질 유지)
  async optimizeForAnalysis(uri: string): Promise<string> {
    return this.optimizeImage(uri, {
      quality: 0.95, // 높은 품질 유지
      maxWidth: 2048,
      maxHeight: 2048,
      format: 'jpeg'
    });
  }

  // 썸네일용 이미지 최적화
  async createThumbnail(uri: string): Promise<string> {
    return this.optimizeImage(uri, {
      quality: 0.6,
      maxWidth: 300,
      maxHeight: 300,
      format: 'jpeg'
    });
  }

  // 프로필 이미지 최적화
  async optimizeProfileImage(uri: string): Promise<string> {
    return this.optimizeImage(uri, {
      quality: 0.8,
      maxWidth: 500,
      maxHeight: 500,
      format: 'jpeg'
    });
  }

  // Base64 이미지 크기 최적화
  async optimizeBase64(base64: string): Promise<string> {
    // Base64가 너무 크면 압축
    const sizeInMB = (base64.length * 0.75) / (1024 * 1024);
    
    if (sizeInMB > 2) {
      // 2MB 이상이면 압축 필요
      const quality = Math.max(0.5, 2 / sizeInMB);
      return base64; // 실제로는 재압축 로직 필요
    }
    
    return base64;
  }

  // 메모리 효율적인 이미지 로딩
  getOptimizedImageSource(uri: string, width: number, height: number) {
    if (Platform.OS === 'ios') {
      // iOS는 자동으로 최적화
      return { uri };
    } else {
      // Android는 크기 지정으로 메모리 최적화
      return {
        uri,
        width,
        height,
        cache: 'force-cache' as any
      };
    }
  }
}

export default new ImageOptimizer();