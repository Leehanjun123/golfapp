import { ApiClient } from '../../../services/api/client';
import { SwingAnalysisResult, SwingComparisonRequest } from '../types';

/**
 * Service layer for swing analysis
 * Handles all API communication and data transformation
 */
export class SwingAnalysisService {
  private static readonly ENDPOINT = '/golf/swing-analysis';

  /**
   * Compare user's swing with professional golfer
   */
  static async compareWithPro(
    request: SwingComparisonRequest
  ): Promise<SwingAnalysisResult> {
    const formData = new FormData();
    
    formData.append('golfer_id', request.proGolferId);
    formData.append('media_type', request.mediaType);
    
    // Add media file
    formData.append('file', {
      uri: request.mediaUri,
      type: request.mediaType === 'image' ? 'image/jpeg' : 'video/mp4',
      name: `swing.${request.mediaType === 'image' ? 'jpg' : 'mp4'}`,
    } as any);

    const response = await ApiClient.post<SwingAnalysisResult>(
      `${this.ENDPOINT}/compare`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  }

  /**
   * Get list of available professional golfers
   */
  static async getProGolfers() {
    const response = await ApiClient.get(`${this.ENDPOINT}/pro-golfers`);
    return response.data;
  }

  /**
   * Get analysis history for current user
   */
  static async getAnalysisHistory() {
    const response = await ApiClient.get(`${this.ENDPOINT}/history`);
    return response.data;
  }
}