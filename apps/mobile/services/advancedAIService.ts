import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import swingDetectionService from './swingDetectionService';

interface VisionAnalysisResult {
  success: boolean;
  analysis: {
    overall_score: number;
    posture_score: number;
    balance_score: number;
    angle_score: number;
    club_analysis: {
      club_type: string;
      face_angle: number;
      club_path: string;
      ball_direction: string;
      impact_quality: number;
    };
    detailed_angles: {
      shoulder_tilt: number;
      left_arm_angle: number;
      right_arm_angle: number;
      hip_rotation: number;
      left_knee_bend: number;
      right_knee_bend: number;
      spine_tilt: number;
      balance_score: number;
      weight_distribution: {
        left: number;
        right: number;
      };
    };
    professional_feedback: Array<{
      priority: 'high' | 'medium' | 'low';
      category: string;
      title: string;
      description: string;
      solution: string;
      impact_on_game: string;
    }>;
    swing_phases: Array<{
      name: string;
      score: number;
      comment: string;
      key_points: string[];
    }>;
    raw_analysis: string;
  };
}

// 전문가급 프롬프트 엔지니어링
const GOLF_ANALYSIS_PROMPT = `You are a world-class golf instructor with 30+ years of experience, trained by Butch Harmon and David Leadbetter. 
Analyze this golf swing image with extreme precision.

Provide a JSON response with the following structure:
{
  "overall_score": (0-100 based on PGA Tour standards),
  "posture_score": (0-100),
  "balance_score": (0-100),
  "angle_score": (0-100),
  "club_analysis": {
    "club_type": (driver/iron/wedge/putter),
    "face_angle": (degrees, + for open, - for closed),
    "club_path": (description like "In-to-Out +2.5°"),
    "ball_direction": (straight/fade/draw/slice/hook),
    "impact_quality": (0-100)
  },
  "detailed_angles": {
    "shoulder_tilt": (degrees),
    "left_arm_angle": (degrees at top of backswing),
    "right_arm_angle": (degrees),
    "hip_rotation": (degrees from address),
    "left_knee_bend": (degrees),
    "right_knee_bend": (degrees),
    "spine_tilt": (degrees),
    "balance_score": (0-10),
    "weight_distribution": {
      "left": (percentage),
      "right": (percentage)
    }
  },
  "professional_feedback": [
    {
      "priority": "high/medium/low",
      "category": "stance/backswing/impact/follow-through",
      "title": "specific issue",
      "description": "detailed explanation with exact measurements",
      "solution": "step-by-step correction method",
      "impact_on_game": "how this affects ball flight and distance"
    }
  ],
  "swing_phases": [
    {
      "name": "Address/Backswing/Top/Downswing/Impact/Follow-through",
      "score": (0-100),
      "comment": "technical analysis",
      "key_points": ["point1", "point2", "point3"]
    }
  ]
}

Analyze like you're preparing a $500/hour lesson. Compare to Tour pros like Rory McIlroy or Justin Thomas.
Focus on:
1. Spine angle maintenance
2. Hip-shoulder separation (X-Factor)
3. Lag and release timing
4. Weight transfer efficiency
5. Club face control through impact
6. Kinematic sequence
7. Ground force utilization`;

class AdvancedAIService {
  private openAIKey?: string;
  private googleCloudKey?: string;
  private vertexAIEndpoint?: string;

  constructor() {
    this.initializeKeys();
  }

  private async initializeKeys() {
    // 실제 배포시에는 환경 변수나 안전한 저장소에서 가져와야 함
    this.openAIKey = (await AsyncStorage.getItem('OPENAI_API_KEY')) || undefined;
    this.googleCloudKey = (await AsyncStorage.getItem('GOOGLE_CLOUD_KEY')) || undefined;
    this.vertexAIEndpoint = (await AsyncStorage.getItem('VERTEX_AI_ENDPOINT')) || undefined;
  }

  // OpenAI Vision API를 사용한 분석
  async analyzeWithOpenAI(imageBase64: string): Promise<VisionAnalysisResult> {
    try {
      if (!this.openAIKey) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openAIKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: GOLF_ANALYSIS_PROMPT,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`,
                    detail: 'high', // 최고 품질 분석
                  },
                },
              ],
            },
          ],
          max_tokens: 2000,
          temperature: 0.1, // 일관성 있는 분석을 위해 낮은 temperature
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const analysisText = data.choices[0].message.content;

      // JSON 파싱
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse JSON from OpenAI response');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      return {
        success: true,
        analysis: {
          ...analysis,
          raw_analysis: analysisText,
        },
      };
    } catch (error) {
      console.error('OpenAI Vision API error:', error);
      return this.getFallbackAnalysis(imageBase64);
    }
  }

  // Google Vertex AI를 사용한 분석
  async analyzeWithVertexAI(imageBase64: string): Promise<VisionAnalysisResult> {
    try {
      if (!this.googleCloudKey || !this.vertexAIEndpoint) {
        throw new Error('Google Cloud credentials not configured');
      }

      // Vertex AI Vision API 호출
      const response = await fetch(this.vertexAIEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.googleCloudKey}`,
        },
        body: JSON.stringify({
          instances: [
            {
              content: imageBase64,
            },
          ],
          parameters: {
            task: 'golf_swing_analysis',
            prompt: GOLF_ANALYSIS_PROMPT,
            max_tokens: 2000,
            temperature: 0.1,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Vertex AI error: ${response.statusText}`);
      }

      const data = await response.json();
      const analysis = data.predictions[0];

      return {
        success: true,
        analysis,
      };
    } catch (error) {
      console.error('Vertex AI error:', error);
      return this.getFallbackAnalysis(imageBase64);
    }
  }

  // Claude Vision API를 사용한 분석 (Anthropic)
  async analyzeWithClaude(imageBase64: string): Promise<VisionAnalysisResult> {
    try {
      const claudeKey = await AsyncStorage.getItem('ANTHROPIC_API_KEY');
      if (!claudeKey) {
        throw new Error('Claude API key not configured');
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-opus-20240229',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: imageBase64,
                  },
                },
                {
                  type: 'text',
                  text: GOLF_ANALYSIS_PROMPT,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.statusText}`);
      }

      const data = await response.json();
      const analysisText = data.content[0].text;

      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse JSON from Claude response');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      return {
        success: true,
        analysis: {
          ...analysis,
          raw_analysis: analysisText,
        },
      };
    } catch (error) {
      console.error('Claude Vision API error:', error);
      return this.getFallbackAnalysis(imageBase64);
    }
  }

  // 멀티 모델 앙상블 분석 (최고 정확도)
  async analyzeWithEnsemble(imageBase64: string): Promise<VisionAnalysisResult> {
    try {
      // 병렬로 3개 모델 실행
      const [openAIResult, vertexResult, claudeResult] = await Promise.allSettled([
        this.analyzeWithOpenAI(imageBase64),
        this.analyzeWithVertexAI(imageBase64),
        this.analyzeWithClaude(imageBase64),
      ]);

      // 성공한 결과들만 필터링
      const successfulResults = [openAIResult, vertexResult, claudeResult]
        .filter((r) => r.status === 'fulfilled' && r.value.success)
        .map((r) => (r as PromiseFulfilledResult<VisionAnalysisResult>).value.analysis);

      if (successfulResults.length === 0) {
        return this.getFallbackAnalysis(imageBase64);
      }

      // 앙상블 평균 계산
      const ensembleAnalysis = this.calculateEnsembleAverage(successfulResults);

      return {
        success: true,
        analysis: ensembleAnalysis,
      };
    } catch (error) {
      console.error('Ensemble analysis error:', error);
      return this.getFallbackAnalysis(imageBase64);
    }
  }

  private calculateEnsembleAverage(results: any[]): any {
    // 숫자 값들은 평균내기
    const avgScore = (key: string) => {
      const values = results.map((r) => r[key]).filter((v) => v !== undefined);
      return values.reduce((a, b) => a + b, 0) / values.length;
    };

    // 각도 평균 계산
    const avgAngles = (angleKey: string) => {
      const values = results
        .map((r) => r.detailed_angles?.[angleKey])
        .filter((v) => v !== undefined);
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    };

    // 피드백 통합 (모든 모델의 피드백 수집)
    const allFeedback = results
      .flatMap((r) => r.professional_feedback || [])
      .filter((item, index, self) => index === self.findIndex((f) => f.title === item.title))
      .sort((a, b) => {
        const priorityOrder: { [key: string]: number } = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, 5); // 상위 5개만

    return {
      overall_score: Math.round(avgScore('overall_score')),
      posture_score: Math.round(avgScore('posture_score')),
      balance_score: Math.round(avgScore('balance_score')),
      angle_score: Math.round(avgScore('angle_score')),
      club_analysis: results[0]?.club_analysis || this.getDefaultClubAnalysis(),
      detailed_angles: {
        shoulder_tilt: Math.round(avgAngles('shoulder_tilt') * 10) / 10,
        left_arm_angle: Math.round(avgAngles('left_arm_angle') * 10) / 10,
        right_arm_angle: Math.round(avgAngles('right_arm_angle') * 10) / 10,
        hip_rotation: Math.round(avgAngles('hip_rotation') * 10) / 10,
        left_knee_bend: Math.round(avgAngles('left_knee_bend') * 10) / 10,
        right_knee_bend: Math.round(avgAngles('right_knee_bend') * 10) / 10,
        spine_tilt: Math.round(avgAngles('spine_tilt') * 10) / 10,
        balance_score: Math.round(avgAngles('balance_score') * 10) / 10,
        weight_distribution: {
          left: 50,
          right: 50,
        },
      },
      professional_feedback: allFeedback,
      swing_phases: results[0]?.swing_phases || this.getDefaultSwingPhases(),
      raw_analysis: `Ensemble analysis from ${results.length} AI models`,
      confidence: results.length / 3, // 신뢰도 점수
    };
  }

  private getDefaultClubAnalysis() {
    return {
      club_type: 'driver',
      face_angle: 0,
      club_path: 'Square',
      ball_direction: 'Straight',
      impact_quality: 75,
    };
  }

  private getDefaultSwingPhases() {
    return [
      {
        name: 'Address',
        score: 80,
        comment: 'Good setup position',
        key_points: ['Balanced stance', 'Proper grip', 'Good posture'],
      },
      {
        name: 'Backswing',
        score: 75,
        comment: 'Needs more rotation',
        key_points: ['Complete shoulder turn', 'Maintain spine angle', 'Good tempo'],
      },
      {
        name: 'Impact',
        score: 70,
        comment: 'Work on consistency',
        key_points: ['Square club face', 'Weight transfer', 'Head behind ball'],
      },
      {
        name: 'Follow-through',
        score: 85,
        comment: 'Good extension',
        key_points: ['Full rotation', 'Balanced finish', 'Good release'],
      },
    ];
  }

  private getFallbackAnalysis(imageBase64?: string): VisionAnalysisResult {
    // 실제 골프 자세인지 먼저 확인
    if (imageBase64) {
      const detectionResult = swingDetectionService.detectGolfSwing(imageBase64);
      
      if (!detectionResult.isGolfSwing) {
        // 골프 자세가 아니면 낮은 점수와 명확한 피드백
        return {
          success: false,
          analysis: {
            overall_score: 0,
            posture_score: 0,
            balance_score: 0,
            angle_score: 0,
            club_analysis: {
              club_type: 'unknown',
              face_angle: 0,
              club_path: '감지 불가',
              ball_direction: '감지 불가',
              impact_quality: 0,
            },
            detailed_angles: {
              shoulder_tilt: 0,
              left_arm_angle: 0,
              right_arm_angle: 0,
              hip_rotation: 0,
              left_knee_bend: 0,
              right_knee_bend: 0,
              spine_tilt: 0,
              balance_score: 0,
              weight_distribution: { left: 0, right: 0 },
            },
            professional_feedback: [
              {
                priority: 'high',
                category: 'Setup',
                title: '골프 자세 감지 실패',
                description: detectionResult.message,
                solution: '골프 자세를 취하고 전신이 보이도록 다시 촬영해주세요.',
                impact_on_game: '정확한 분석을 위해 올바른 자세 촬영이 필요합니다.',
              },
            ],
            swing_phases: [
              {
                name: 'Detection',
                score: 0,
                comment: '골프 자세를 감지할 수 없습니다',
                key_points: ['전신이 보이도록 촬영', '골프 클럽 들고 촬영', '적절한 거리에서 촬영'],
              },
            ],
            raw_analysis: `Detection confidence: ${(detectionResult.confidence * 100).toFixed(1)}%`,
          },
        };
      }
      
      // 골프 자세가 감지되면 실제 점수 계산
      const realisticScore = swingDetectionService.calculateRealisticScore(
        imageBase64,
        detectionResult.isGolfSwing,
        detectionResult.confidence
      );
      
      return {
        success: false,
        analysis: {
          overall_score: realisticScore,
          posture_score: realisticScore - 5 + Math.random() * 10,
          balance_score: realisticScore - 3 + Math.random() * 6,
          angle_score: realisticScore - 2 + Math.random() * 4,
          club_analysis: this.getDefaultClubAnalysis(),
          detailed_angles: {
            shoulder_tilt: 28,
            left_arm_angle: 165,
            right_arm_angle: 145,
            hip_rotation: 22,
            left_knee_bend: 155,
            right_knee_bend: 150,
            spine_tilt: 35,
            balance_score: 8,
            weight_distribution: { left: 50, right: 50 },
          },
          professional_feedback: [
            {
              priority: 'medium',
              category: 'Setup',
              title: 'AI 서비스 연결 필요',
              description: '더 정확한 분석을 위해 AI 서비스 API 키를 설정해주세요.',
              solution: '설정 > AI 서비스에서 OpenAI 또는 Claude API 키를 입력하세요.',
              impact_on_game: '정확도 95% 이상의 전문가급 분석이 가능합니다.',
            },
          ],
          swing_phases: this.getDefaultSwingPhases(),
          raw_analysis: 'Fallback analysis - Configure AI services for better accuracy',
        },
      };
    }

    // 기본 fallback 분석 (이미지가 없거나 다른 경우)
    return {
      success: false,
      analysis: {
        overall_score: 75,
        posture_score: 73,
        balance_score: 78,
        angle_score: 72,
        club_analysis: this.getDefaultClubAnalysis(),
        detailed_angles: {
          shoulder_tilt: 28,
          left_arm_angle: 165,
          right_arm_angle: 145,
          hip_rotation: 22,
          left_knee_bend: 155,
          right_knee_bend: 150,
          spine_tilt: 35,
          balance_score: 8,
          weight_distribution: { left: 50, right: 50 },
        },
        professional_feedback: [
          {
            priority: 'high',
            category: 'Setup',
            title: 'AI 서비스 설정 필요',
            description: 'AI 분석을 위해 서비스 설정이 필요합니다.',
            solution: '설정에서 AI API 키를 입력해주세요.',
            impact_on_game: '정확한 분석이 가능해집니다.',
          },
        ],
        swing_phases: this.getDefaultSwingPhases(),
        raw_analysis: 'Default fallback analysis',
      },
    };
  }
}

const advancedAIService = new AdvancedAIService();
export default advancedAIService;
