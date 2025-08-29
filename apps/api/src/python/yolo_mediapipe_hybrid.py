#!/usr/bin/env python3
"""
YOLO + MediaPipe 하이브리드 골프 분석기
- YOLO: 골프 자세/클럽/공 객체 탐지
- MediaPipe: 정밀한 관절 포인트 추출
"""

import base64
import cv2
import numpy as np
import json
import sys
import mediapipe as mp
from ultralytics import YOLO
import torch

class HybridGolfAnalyzer:
    def __init__(self):
        # MediaPipe 초기화
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=True,
            model_complexity=1,  # 중간 복잡도
            enable_segmentation=False,
            min_detection_confidence=0.3  # 더 낮춰서 감지율 향상
        )
        
        # YOLO 초기화 (사람 감지용)
        try:
            self.yolo = YOLO('yolov8n.pt')  # nano 모델 (빠름)
            self.yolo_available = True
        except:
            self.yolo_available = False
            print("YOLO 모델 로드 실패, MediaPipe만 사용", file=sys.stderr)
    
    def detect_golfer_with_yolo(self, image):
        """YOLO로 골퍼 위치 탐지"""
        if not self.yolo_available:
            return None
            
        try:
            results = self.yolo(image, conf=0.3)
            
            # 사람(person) 클래스 찾기
            for r in results:
                boxes = r.boxes
                if boxes is not None:
                    for box in boxes:
                        # 클래스 0 = person
                        if int(box.cls) == 0:
                            x1, y1, x2, y2 = box.xyxy[0].tolist()
                            confidence = float(box.conf)
                            return {
                                'bbox': [int(x1), int(y1), int(x2), int(y2)],
                                'confidence': confidence
                            }
            return None
        except Exception as e:
            print(f"YOLO 감지 실패: {e}", file=sys.stderr)
            return None
    
    def analyze_golf_pose(self, image, bbox=None):
        """MediaPipe로 골프 자세 분석"""
        try:
            # YOLO 바운딩 박스가 있으면 해당 영역만 분석
            if bbox:
                x1, y1, x2, y2 = bbox
                roi = image[y1:y2, x1:x2]
                if roi.size == 0:
                    roi = image
            else:
                roi = image
            
            # RGB 변환
            image_rgb = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)
            results = self.pose.process(image_rgb)
            
            if not results.pose_landmarks:
                return None
            
            # 주요 관절 추출
            landmarks = results.pose_landmarks.landmark
            
            # 골프 자세 분석
            left_shoulder = landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER]
            right_shoulder = landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER]
            left_hip = landmarks[self.mp_pose.PoseLandmark.LEFT_HIP]
            right_hip = landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP]
            left_knee = landmarks[self.mp_pose.PoseLandmark.LEFT_KNEE]
            right_knee = landmarks[self.mp_pose.PoseLandmark.RIGHT_KNEE]
            
            # 어깨 회전각
            shoulder_angle = np.arctan2(
                right_shoulder.y - left_shoulder.y,
                right_shoulder.x - left_shoulder.x
            ) * 180 / np.pi
            
            # 엉덩이 회전각
            hip_angle = np.arctan2(
                right_hip.y - left_hip.y,
                right_hip.x - left_hip.x
            ) * 180 / np.pi
            
            # X-Factor (어깨-엉덩이 회전 차이)
            x_factor = abs(shoulder_angle - hip_angle)
            
            # 무릎 각도 (스탠스 체크)
            knee_distance = np.sqrt(
                (right_knee.x - left_knee.x)**2 + 
                (right_knee.y - left_knee.y)**2
            )
            
            # 척추 각도 추정
            spine_angle = np.arctan2(
                (left_shoulder.y + right_shoulder.y)/2 - (left_hip.y + right_hip.y)/2,
                (left_shoulder.x + right_shoulder.x)/2 - (left_hip.x + right_hip.x)/2
            ) * 180 / np.pi
            
            return {
                'shoulder_rotation': float(shoulder_angle),
                'hip_rotation': float(hip_angle),
                'x_factor': float(x_factor),
                'spine_angle': float(abs(spine_angle)),
                'knee_distance': float(knee_distance * 100),
                'landmarks_count': len(landmarks)
            }
            
        except Exception as e:
            print(f"MediaPipe 분석 실패: {e}", file=sys.stderr)
            return None
    
    def calculate_golf_score(self, pose_data):
        """골프 자세 점수 계산"""
        if not pose_data:
            return 0
        
        score = 100
        feedback = []
        
        # X-Factor 평가 (이상적: 45-50도)
        x_factor = pose_data['x_factor']
        if x_factor < 40:
            score -= 10
            feedback.append("상체 회전이 부족합니다")
        elif x_factor > 60:
            score -= 5
            feedback.append("과도한 상체 회전")
        
        # 척추 각도 평가 (이상적: 15-30도)
        spine_angle = pose_data['spine_angle']
        if spine_angle < 10:
            score -= 10
            feedback.append("척추 각도가 너무 직립")
        elif spine_angle > 35:
            score -= 10
            feedback.append("척추 각도가 너무 기울어짐")
        
        # 무릎 간격 평가
        knee_distance = pose_data['knee_distance']
        if knee_distance < 15:
            score -= 5
            feedback.append("스탠스가 너무 좁음")
        elif knee_distance > 35:
            score -= 5
            feedback.append("스탠스가 너무 넓음")
        
        return max(score, 0), feedback
    
    def analyze(self, base64_image):
        """통합 분석 함수"""
        try:
            # Base64 디코딩
            if base64_image.startswith('data:'):
                base64_image = base64_image.split(',')[1]
            
            # 공백 제거
            base64_image = base64_image.replace('\n', '').replace('\r', '').replace(' ', '')
            
            # 패딩 추가 (필요한 경우)
            missing_padding = len(base64_image) % 4
            if missing_padding:
                base64_image += '=' * (4 - missing_padding)
            
            image_data = base64.b64decode(base64_image)
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return {'success': False, 'error': 'Invalid image data'}
            
            # 1단계: YOLO로 골퍼 위치 탐지
            detection = self.detect_golfer_with_yolo(image)
            
            # 2단계: MediaPipe로 자세 분석
            bbox = detection['bbox'] if detection else None
            pose_data = self.analyze_golf_pose(image, bbox)
            
            if not pose_data:
                # YOLO와 MediaPipe 모두 실패
                return {
                    'success': False,
                    'detected': False,
                    'error': 'No golfer detected',
                    'method': 'YOLO+MediaPipe'
                }
            
            # 3단계: 점수 계산
            score, feedback = self.calculate_golf_score(pose_data)
            
            # 개선사항 생성
            improvements = []
            if score < 90:
                improvements.append("어드레스 자세 개선 필요")
            if pose_data['x_factor'] < 45:
                improvements.append("백스윙 시 상체 회전 늘리기")
            if pose_data['spine_angle'] > 30:
                improvements.append("척추 각도 유지하기")
            
            return {
                'success': True,
                'detected': True,
                'score': score,
                'pose': {
                    'shoulderRotation': pose_data['shoulder_rotation'],
                    'hipRotation': pose_data['hip_rotation'],
                    'xFactor': pose_data['x_factor'],
                    'spineAngle': pose_data['spine_angle'],
                    'kneeDistance': pose_data['knee_distance']
                },
                'feedback': feedback if feedback else ["좋은 자세입니다!"],
                'improvements': improvements if improvements else ["현재 자세를 유지하세요"],
                'method': 'YOLO+MediaPipe Hybrid',
                'detection_confidence': detection['confidence'] if detection else 0,
                'yolo_used': detection is not None,
                'landmarks_count': pose_data['landmarks_count']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'method': 'YOLO+MediaPipe Hybrid'
            }

# 메인 실행
if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No image data provided'}))
        sys.exit(1)
    
    analyzer = HybridGolfAnalyzer()
    result = analyzer.analyze(sys.argv[1])
    print(json.dumps(result))