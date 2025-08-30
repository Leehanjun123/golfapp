// Vercel Serverless Function - Video Analysis
module.exports = async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        message: 'Video Analysis API is ready',
        supported_formats: ['mp4', 'mov', 'avi', 'webm'],
        max_file_size: '100MB',
        analysis_time: '30-60 seconds'
      });
    }

    if (req.method === 'POST') {
      const { video_data, analysis_type = 'full', user_id } = req.body || {};

      // 비디오 분석 시뮬레이션 (VideoAnalysisScreen 호환 형식)
      const analysisResult = {
        success: true,
        analysis_id: `video_${Date.now()}`,
        user_id: user_id || 'anonymous',
        data: {
          // VideoAnalysisScreen이 기대하는 형식
          overall_score: Math.floor(Math.random() * 25) + 75,
          phase_scores: {
            address: Math.floor(Math.random() * 20) + 80,
            backswing: Math.floor(Math.random() * 25) + 75,
            impact: Math.floor(Math.random() * 25) + 75,
            follow_through: Math.floor(Math.random() * 20) + 80
          },
          improvements: [
            '백스윙 시 왼팔을 조금 더 곧게 펴보세요',
            '임팩트 순간 체중을 왼쪽으로 더 이동하세요',
            '팔로우 스루를 더 완전하게 마무리하세요'
          ],
          strengths: [
            '어드레스 자세가 안정적입니다',
            '템포가 일정합니다',
            '균형 유지가 우수합니다'
          ],
          coaching: {
            tempo: '백스윙과 다운스윙의 리듬이 좋습니다',
            rotation: '회전 동작이 부드럽게 연결됩니다',
            trajectory: '클럽 궤도가 일관성 있습니다'
          },
          trajectory_analysis: {
            tempo_ratio: (Math.random() * 0.5 + 2.5), // 2.5-3.0 이상적
            max_shoulder_rotation: Math.floor(Math.random() * 30) + 100,
            max_x_factor: Math.floor(Math.random() * 20) + 35
          }
        },
        // 추가 메타데이터 (기존 format 유지)
        analysis: {
          video_quality: 'good',
          frame_count: Math.floor(Math.random() * 200) + 150,
          duration_seconds: (Math.random() * 10 + 5).toFixed(1),
          
          // 스윙 단계별 분석
          swing_phases: [
            {
              phase: 'setup',
              start_frame: 0,
              end_frame: 25,
              score: Math.floor(Math.random() * 20) + 80,
              feedback: '어드레스 자세가 안정적입니다'
            },
            {
              phase: 'backswing',
              start_frame: 26,
              end_frame: 75,
              score: Math.floor(Math.random() * 25) + 75,
              feedback: '백스윙 톱에서 클럽 위치가 좋습니다'
            },
            {
              phase: 'downswing',
              start_frame: 76,
              end_frame: 100,
              score: Math.floor(Math.random() * 30) + 70,
              feedback: '하체 선행이 잘 이루어지고 있습니다'
            },
            {
              phase: 'impact',
              start_frame: 101,
              end_frame: 110,
              score: Math.floor(Math.random() * 25) + 75,
              feedback: '임팩트 순간 볼을 정확히 타격했습니다'
            },
            {
              phase: 'follow_through',
              start_frame: 111,
              end_frame: 150,
              score: Math.floor(Math.random() * 20) + 80,
              feedback: '팔로우 스루가 완전하게 이루어졌습니다'
            }
          ],

          // 기술적 메트릭
          technical_metrics: {
            club_head_speed: (Math.random() * 30 + 85).toFixed(1) + ' mph',
            ball_speed: (Math.random() * 40 + 120).toFixed(1) + ' mph',
            launch_angle: (Math.random() * 10 + 8).toFixed(1) + '°',
            attack_angle: (Math.random() * 8 - 4).toFixed(1) + '°',
            club_path: (Math.random() * 6 - 3).toFixed(1) + '°',
            face_angle: (Math.random() * 4 - 2).toFixed(1) + '°'
          },

          // 자세 분석
          posture_analysis: {
            spine_angle: (Math.random() * 15 + 25).toFixed(1) + '°',
            hip_rotation: (Math.random() * 40 + 40).toFixed(1) + '°',
            shoulder_rotation: (Math.random() * 50 + 80).toFixed(1) + '°',
            weight_shift: Math.floor(Math.random() * 20) + 70 + '%',
            balance_score: Math.floor(Math.random() * 25) + 75
          },

          // 개선 제안
          improvement_suggestions: [
            {
              area: 'backswing',
              priority: 'high',
              suggestion: '백스윙 시 왼팔을 조금 더 곧게 펴보세요'
            },
            {
              area: 'impact',
              priority: 'medium',
              suggestion: '임팩트 순간 체중을 왼쪽으로 더 이동하세요'
            },
            {
              area: 'follow_through',
              priority: 'low',
              suggestion: '피니시에서 균형을 더 오래 유지해보세요'
            }
          ],

          // 전체 점수
          overall_score: Math.floor(Math.random() * 25) + 75,
          confidence: Math.floor(Math.random() * 15) + 85,
          processed_at: new Date().toISOString()
        }
      };

      return res.status(200).json(analysisResult);
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Video analysis error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Video analysis failed',
      message: error.message 
    });
  }
};