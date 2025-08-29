#!/usr/bin/env python3
"""
실제 골프 이미지/비디오 분석기
목업 데이터 없이 실제 MediaPipe로 분석
"""

import cv2
import numpy as np
import json
import sys
import os
import mediapipe as mp
import math
from pathlib import Path

class RealGolfAnalyzer:
    def __init__(self):
        # MediaPipe 초기화
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        
        # 실제 골프 분석용 설정 (높은 정확도)
        self.pose = self.mp_pose.Pose(
            static_image_mode=True,
            model_complexity=2,  # 최고 복잡도
            min_detection_confidence=0.6,  # 골프 자세 감지용
            min_tracking_confidence=0.5,
            enable_segmentation=True,
            smooth_segmentation=True
        )
        
        # 골프 관련 핵심 랜드마크 (MediaPipe 33개 포인트 중)
        self.golf_keypoints = {
            'nose': 0,
            'left_shoulder': 11, 'right_shoulder': 12,
            'left_elbow': 13, 'right_elbow': 14,
            'left_wrist': 15, 'right_wrist': 16,
            'left_hip': 23, 'right_hip': 24,
            'left_knee': 25, 'right_knee': 26,
            'left_ankle': 27, 'right_ankle': 28
        }
    
    def load_image(self, image_path):
        """실제 이미지 파일 로드"""
        try:
            if not os.path.exists(image_path):
                return None, f"파일이 존재하지 않습니다: {image_path}"
            
            # OpenCV로 이미지 읽기
            image = cv2.imread(image_path)
            if image is None:
                return None, "이미지를 읽을 수 없습니다"
            
            # RGB로 변환 (MediaPipe는 RGB 사용)
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            return image_rgb, None
            
        except Exception as e:
            return None, f"이미지 로드 오류: {str(e)}"
    
    def analyze_pose(self, image):
        """실제 포즈 분석 (목업 아님)"""
        try:
            # MediaPipe로 실제 포즈 감지
            results = self.pose.process(image)
            
            if not results.pose_landmarks:
                return {
                    'detected': False,
                    'confidence': 0,
                    'landmarks': [],
                    'error': 'No pose detected in image'
                }
            
            # 실제 랜드마크 데이터 추출
            landmarks = []
            key_points = {}
            
            for idx, landmark in enumerate(results.pose_landmarks.landmark):
                # 실제 3D 좌표 (x, y, z, visibility)
                landmarks.append({
                    'id': idx,
                    'x': landmark.x,
                    'y': landmark.y,
                    'z': landmark.z,
                    'visibility': landmark.visibility
                })
                
                # 골프 관련 키포인트 추출
                for name, point_id in self.golf_keypoints.items():
                    if idx == point_id:
                        key_points[name] = {
                            'x': landmark.x,
                            'y': landmark.y, 
                            'z': landmark.z,
                            'visibility': landmark.visibility
                        }
            
            # 평균 confidence 계산
            avg_confidence = np.mean([lm['visibility'] for lm in landmarks])
            
            return {
                'detected': True,
                'confidence': float(avg_confidence),
                'landmarks': landmarks,
                'key_points': key_points,
                'landmark_count': len(landmarks)
            }
            
        except Exception as e:
            return {
                'detected': False,
                'confidence': 0,
                'error': f'Pose analysis failed: {str(e)}'
            }
    
    def calculate_real_angles(self, key_points):
        """실제 골프 각도 계산 (3D 좌표 기반)"""
        try:
            angles = {}
            
            # 척추 각도 (목-허리 라인)
            if 'nose' in key_points and 'left_hip' in key_points and 'right_hip' in key_points:
                nose = key_points['nose']
                left_hip = key_points['left_hip']
                right_hip = key_points['right_hip']
                
                # 힙 중점
                hip_center = {
                    'x': (left_hip['x'] + right_hip['x']) / 2,
                    'y': (left_hip['y'] + right_hip['y']) / 2
                }
                
                # 척추 각도 계산
                spine_angle = math.atan2(
                    abs(nose['x'] - hip_center['x']),
                    abs(nose['y'] - hip_center['y'])
                ) * 180 / math.pi
                
                angles['spine_angle'] = spine_angle
            
            # 어깨 기울기
            if 'left_shoulder' in key_points and 'right_shoulder' in key_points:
                left_shoulder = key_points['left_shoulder']
                right_shoulder = key_points['right_shoulder']
                
                shoulder_tilt = math.atan2(
                    right_shoulder['y'] - left_shoulder['y'],
                    right_shoulder['x'] - left_shoulder['x']
                ) * 180 / math.pi
                
                angles['shoulder_tilt'] = abs(shoulder_tilt)
            
            # 무릎 굽힘 (간단 근사)
            if 'left_hip' in key_points and 'left_knee' in key_points and 'left_ankle' in key_points:
                hip = key_points['left_hip']
                knee = key_points['left_knee']
                ankle = key_points['left_ankle']
                
                # 무릎 각도 계산
                vec1 = np.array([hip['x'] - knee['x'], hip['y'] - knee['y']])
                vec2 = np.array([ankle['x'] - knee['x'], ankle['y'] - knee['y']])
                
                cos_angle = np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))
                cos_angle = np.clip(cos_angle, -1.0, 1.0)  # 수치 안정성
                knee_angle = math.acos(cos_angle) * 180 / math.pi
                
                angles['knee_flex'] = 180 - knee_angle  # 굽힘 각도
            
            return angles
            
        except Exception as e:
            print(f"각도 계산 오류: {e}", file=sys.stderr)
            return {}
    
    def evaluate_golf_posture(self, key_points, angles):
        """실제 골프 자세 평가"""
        score = 50  # 기본 점수
        feedback = []
        improvements = []
        
        try:
            # 포즈 감지 기본 점수
            if len(key_points) >= 8:  # 주요 키포인트 감지
                score += 20
                feedback.append("주요 신체 부위가 잘 감지되었습니다")
            else:
                improvements.append("전신이 더 잘 보이도록 촬영해주세요")
            
            # 척추 각도 평가
            if 'spine_angle' in angles:
                spine = angles['spine_angle']
                if 15 <= spine <= 35:  # 이상적인 범위
                    score += 15
                    feedback.append(f"척추 각도가 좋습니다 ({spine:.1f}°)")
                elif spine < 15:
                    score += 5
                    improvements.append("척추를 조금 더 앞으로 기울여보세요")
                elif spine > 35:
                    score += 5
                    improvements.append("척추를 조금 더 세워보세요")
            
            # 어깨 기울기 평가
            if 'shoulder_tilt' in angles:
                tilt = angles['shoulder_tilt']
                if tilt <= 10:  # 수평에 가까움
                    score += 10
                    feedback.append("어깨 라인이 좋습니다")
                else:
                    improvements.append("어깨를 더 수평으로 맞춰보세요")
            
            # 무릎 굽힘 평가
            if 'knee_flex' in angles:
                flex = angles['knee_flex']
                if 10 <= flex <= 30:  # 적절한 굽힘
                    score += 10
                    feedback.append("무릎 굽힘이 적절합니다")
                else:
                    improvements.append("무릎을 자연스럽게 굽혀보세요")
            
            # 양발 감지 확인
            if 'left_ankle' in key_points and 'right_ankle' in key_points:
                score += 5
                feedback.append("발 위치가 잘 감지되었습니다")
            else:
                improvements.append("발 전체가 보이도록 촬영해주세요")
            
            # 최종 점수 범위 조정
            score = max(30, min(95, score))
            
            if len(feedback) == 0:
                feedback = ["자세 분석이 완료되었습니다"]
            
            if len(improvements) == 0:
                improvements = ["현재 자세를 유지하시기 바랍니다"]
            
            return score, feedback, improvements
            
        except Exception as e:
            print(f"자세 평가 오류: {e}", file=sys.stderr)
            return 50, ["자세 분석 중 오류가 발생했습니다"], ["다시 촬영해보시기 바랍니다"]
    
    def analyze_image(self, image_path):
        """메인 분석 함수"""
        try:
            # 1. 실제 이미지 로드
            image, error = self.load_image(image_path)
            if image is None:
                return {
                    'success': False,
                    'error': error,
                    'detected': False
                }
            
            print(f"이미지 로드 성공: {image.shape}", file=sys.stderr)
            
            # 2. 실제 포즈 분석
            pose_result = self.analyze_pose(image)
            
            if not pose_result['detected']:
                return {
                    'success': False,
                    'detected': False,
                    'error': pose_result.get('error', 'Pose not detected'),
                    'message': '골프 자세를 감지할 수 없습니다'
                }
            
            print(f"포즈 감지 성공: {pose_result['landmark_count']}개 랜드마크", file=sys.stderr)
            
            # 3. 실제 각도 계산
            angles = self.calculate_real_angles(pose_result['key_points'])
            print(f"각도 계산 완료: {len(angles)}개", file=sys.stderr)
            
            # 4. 실제 자세 평가
            score, feedback, improvements = self.evaluate_golf_posture(
                pose_result['key_points'], 
                angles
            )
            
            # 5. 최종 결과 반환 (목업 데이터 없음)
            result = {
                'success': True,
                'detected': True,
                'confidence': pose_result['confidence'],
                'landmarks': pose_result['landmarks'],
                'key_points': pose_result['key_points'],
                'angles': angles,
                'score': score,
                'feedback': feedback,
                'improvements': improvements,
                'analysis_info': {
                    'method': 'Real MediaPipe Analysis',
                    'landmarks_count': pose_result['landmark_count'],
                    'image_size': f"{image.shape[1]}x{image.shape[0]}",
                    'confidence': pose_result['confidence']
                }
            }
            
            print(f"분석 완료: 점수 {score}, 신뢰도 {pose_result['confidence']:.2f}", file=sys.stderr)
            return result
            
        except Exception as e:
            error_msg = f"분석 중 오류 발생: {str(e)}"
            print(error_msg, file=sys.stderr)
            return {
                'success': False,
                'detected': False,
                'error': error_msg
            }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'Image path required'
        }))
        return
    
    image_path = sys.argv[1]
    
    # 실제 분석 실행
    analyzer = RealGolfAnalyzer()
    result = analyzer.analyze_image(image_path)
    
    # JSON 결과 출력
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()