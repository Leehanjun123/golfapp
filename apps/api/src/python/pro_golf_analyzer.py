#!/usr/bin/env python3
"""
프로 수준 골프 AI 분석기
- 정확도 80% 이상 목표
- 골프 전용 최적화
"""

import base64
import cv2
import numpy as np
import json
import sys
import mediapipe as mp
from ultralytics import YOLO
import math

class ProGolfAnalyzer:
    def __init__(self):
        # MediaPipe 초기화
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        
        # 골프 자세 감지를 위한 최적화된 설정 - 실제 사진 최적화
        self.pose = self.mp_pose.Pose(
            static_image_mode=True,
            model_complexity=2,  # 최고 복잡도
            min_detection_confidence=0.1,  # 매우 관대한 감지 (0.3 → 0.1)
            min_tracking_confidence=0.1,   # 매우 관대한 추적 (0.3 → 0.1)
            enable_segmentation=True,  # 세그멘테이션 활성화
            smooth_segmentation=True
        )
        
        # 비디오 분석용 추가 설정
        self.pose_video = self.mp_pose.Pose(
            static_image_mode=False,  # 비디오 모드
            model_complexity=1,       # 성능 최적화
            min_detection_confidence=0.1,
            min_tracking_confidence=0.1,
            enable_segmentation=False,  # 비디오는 세그멘테이션 끔
            smooth_segmentation=False
        )
        
        # YOLO 초기화
        try:
            self.yolo = YOLO('yolov8n.pt')
            self.yolo_available = True
        except:
            self.yolo_available = False
        
        # 골프 스윙 단계별 이상적인 각도 (PGA 프로 데이터 기반)
        self.ideal_angles = {
            'address': {
                'spine_tilt': 25,  # 척추 기울기
                'knee_flex': 25,   # 무릎 굽힘
                'hip_bend': 30,    # 엉덩이 굽힘
                'shoulder_tilt': 5  # 어깨 기울기
            },
            'backswing': {
                'shoulder_rotation': 90,  # 어깨 회전
                'hip_rotation': 45,       # 엉덩이 회전
                'x_factor': 45,          # X-Factor
                'wrist_hinge': 90        # 손목 코킹
            },
            'downswing': {
                'hip_lead': 30,          # 엉덩이 리드
                'lag_angle': 90,         # 래그 각도
                'shoulder_drop': 10      # 어깨 드롭
            },
            'impact': {
                'shaft_lean': 10,        # 샤프트 기울기
                'hip_open': 45,          # 엉덩이 오픈
                'shoulder_square': 0     # 어깨 정렬
            }
        }
    
    def preprocess_image(self, image):
        """실제 사진 분석을 위한 이미지 전처리"""
        # 1. 이미지 크기 체크 및 리사이즈
        h, w = image.shape[:2]
        print(f"🖼️ 원본 이미지 크기: {w}x{h}", file=sys.stderr)
        
        # 너무 작은 이미지 (300px 미만) 확대
        if min(w, h) < 300:
            scale = 300 / min(w, h)
            new_w, new_h = int(w * scale), int(h * scale)
            image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
            print(f"📈 이미지 확대: {new_w}x{new_h} (scale: {scale:.2f})", file=sys.stderr)
        
        # 너무 큰 이미지 (2000px 초과) 축소
        elif max(w, h) > 2000:
            scale = 2000 / max(w, h)
            new_w, new_h = int(w * scale), int(h * scale)
            image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
            print(f"📉 이미지 축소: {new_w}x{new_h} (scale: {scale:.2f})", file=sys.stderr)
        
        # 2. 대비 및 밝기 조정 (CLAHE - Contrast Limited Adaptive Histogram Equalization)
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        # L 채널에 CLAHE 적용
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        l = clahe.apply(l)
        
        # 이미지 재결합
        image = cv2.merge([l, a, b])
        image = cv2.cvtColor(image, cv2.COLOR_LAB2BGR)
        
        # 3. 가우시안 블러로 노이즈 제거
        image = cv2.GaussianBlur(image, (3, 3), 0)
        
        print("✨ 이미지 전처리 완료: 크기조정 + 대비개선 + 노이즈제거", file=sys.stderr)
        return image
    
    def analyze_video_frame(self, frame):
        """비디오 프레임 분석 (최적화된 설정)"""
        try:
            # RGB 변환
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.pose_video.process(frame_rgb)
            
            if not results.pose_landmarks:
                return None
            
            landmarks = results.pose_landmarks.landmark
            
            # 기본 골프 자세 특징만 추출 (속도 최적화)
            left_shoulder = landmarks[11]
            right_shoulder = landmarks[12]
            left_hip = landmarks[23]
            right_hip = landmarks[24]
            
            # 어깨 회전각
            shoulder_dx = right_shoulder.x - left_shoulder.x
            shoulder_dy = right_shoulder.y - left_shoulder.y
            shoulder_rotation = math.degrees(math.atan2(shoulder_dy, shoulder_dx))
            
            # 엉덩이 회전각
            hip_dx = right_hip.x - left_hip.x
            hip_dy = right_hip.y - left_hip.y
            hip_rotation = math.degrees(math.atan2(hip_dy, hip_dx))
            
            # X-Factor
            x_factor = abs(shoulder_rotation - hip_rotation)
            
            # 신뢰도
            avg_visibility = np.mean([lm.visibility for lm in landmarks])
            
            return {
                'shoulder_rotation': shoulder_rotation,
                'hip_rotation': hip_rotation,
                'x_factor': x_factor,
                'confidence': avg_visibility,
                'frame_valid': True
            }
            
        except Exception as e:
            print(f"프레임 분석 오류: {e}", file=sys.stderr)
            return None
    
    def detect_person(self, image):
        """YOLO로 사람 감지"""
        if not self.yolo_available:
            return None
            
        try:
            results = self.yolo(image, conf=0.3)
            
            for r in results:
                if r.boxes is not None:
                    for box in r.boxes:
                        if int(box.cls) == 0:  # person
                            x1, y1, x2, y2 = box.xyxy[0].tolist()
                            return {
                                'bbox': [int(x1), int(y1), int(x2), int(y2)],
                                'confidence': float(box.conf)
                            }
            return None
        except Exception as e:
            return None
    
    def calculate_angle_3points(self, p1, p2, p3):
        """3점 사이의 각도 계산"""
        v1 = np.array([p1.x - p2.x, p1.y - p2.y])
        v2 = np.array([p3.x - p2.x, p3.y - p2.y])
        
        cosine = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
        angle = np.arccos(np.clip(cosine, -1, 1))
        
        return math.degrees(angle)
    
    def analyze_golf_pose(self, image):
        """골프 자세 정밀 분석"""
        try:
            # RGB 변환
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = self.pose.process(image_rgb)
            
            if not results.pose_landmarks:
                return None
            
            landmarks = results.pose_landmarks.landmark
            
            # 주요 랜드마크
            nose = landmarks[0]
            left_shoulder = landmarks[11]
            right_shoulder = landmarks[12]
            left_elbow = landmarks[13]
            right_elbow = landmarks[14]
            left_wrist = landmarks[15]
            right_wrist = landmarks[16]
            left_hip = landmarks[23]
            right_hip = landmarks[24]
            left_knee = landmarks[25]
            right_knee = landmarks[26]
            left_ankle = landmarks[27]
            right_ankle = landmarks[28]
            
            # 1. 어깨 회전각 (정확한 계산)
            shoulder_dx = right_shoulder.x - left_shoulder.x
            shoulder_dy = right_shoulder.y - left_shoulder.y
            shoulder_rotation = math.degrees(math.atan2(shoulder_dy, shoulder_dx))
            
            # 2. 엉덩이 회전각
            hip_dx = right_hip.x - left_hip.x
            hip_dy = right_hip.y - left_hip.y
            hip_rotation = math.degrees(math.atan2(hip_dy, hip_dx))
            
            # 3. X-Factor (어깨-엉덩이 회전 차이)
            x_factor = abs(shoulder_rotation - hip_rotation)
            
            # 4. 척추 각도 (올바른 계산)
            mid_shoulder_x = (left_shoulder.x + right_shoulder.x) / 2
            mid_shoulder_y = (left_shoulder.y + right_shoulder.y) / 2
            mid_hip_x = (left_hip.x + right_hip.x) / 2
            mid_hip_y = (left_hip.y + right_hip.y) / 2
            
            # 수직선 대비 척추 기울기
            spine_angle = math.degrees(math.atan2(
                abs(mid_shoulder_x - mid_hip_x),
                abs(mid_hip_y - mid_shoulder_y)
            ))
            
            # 5. 무릎 굽힘 각도
            left_knee_angle = self.calculate_angle_3points(left_hip, left_knee, left_ankle)
            right_knee_angle = self.calculate_angle_3points(right_hip, right_knee, right_ankle)
            avg_knee_flex = 180 - (left_knee_angle + right_knee_angle) / 2
            
            # 6. 팔꿈치 각도 (백스윙 체크)
            left_elbow_angle = self.calculate_angle_3points(left_shoulder, left_elbow, left_wrist)
            right_elbow_angle = self.calculate_angle_3points(right_shoulder, right_elbow, right_wrist)
            
            # 7. 체중 분배 (발목 위치 기반)
            weight_distribution = (left_ankle.y + left_knee.y) / (right_ankle.y + right_knee.y + 1e-6)
            
            # 8. 스탠스 너비
            stance_width = abs(left_ankle.x - right_ankle.x) * 100
            
            # 9. 손 위치 (그립 체크)
            hands_together = abs(left_wrist.x - right_wrist.x) < 0.1
            hand_height = (left_wrist.y + right_wrist.y) / 2
            
            # 10. 머리 위치 (헤드업 체크)
            head_stability = abs(nose.x - mid_shoulder_x) < 0.1
            
            # 신뢰도 계산
            avg_visibility = np.mean([lm.visibility for lm in landmarks])
            
            return {
                'shoulder_rotation': shoulder_rotation,
                'hip_rotation': hip_rotation,
                'x_factor': x_factor,
                'spine_angle': spine_angle,
                'knee_flex': avg_knee_flex,
                'left_elbow_angle': left_elbow_angle,
                'right_elbow_angle': right_elbow_angle,
                'weight_distribution': weight_distribution,
                'stance_width': stance_width,
                'hands_together': hands_together,
                'hand_height': hand_height,
                'head_stability': head_stability,
                'confidence': avg_visibility
            }
            
        except Exception as e:
            print(f"분석 오류: {e}", file=sys.stderr)
            return None
    
    def determine_swing_phase(self, features):
        """스윙 단계 판별"""
        if features['hands_together'] and features['hand_height'] > 0.6:
            if features['x_factor'] > 30:
                return 'backswing'
            else:
                return 'address'
        elif features['x_factor'] < 20:
            return 'impact'
        else:
            return 'downswing'
    
    def calculate_pro_score(self, features):
        """프로 수준 점수 계산"""
        if not features:
            return 60, ["자세를 감지할 수 없습니다"], []
        
        # 기본 점수 85점에서 시작 (관대한 채점)
        score = 85
        feedback = []
        improvements = []
        
        # 스윙 단계 판별
        phase = self.determine_swing_phase(features)
        
        # 1. X-Factor 평가 (가중치 높음)
        x_factor = features['x_factor']
        ideal_x = self.ideal_angles['backswing']['x_factor']
        x_diff = abs(x_factor - ideal_x)
        
        if x_diff <= 5:
            score += 10
            feedback.append(f"✨ 완벽한 X-Factor: {x_factor:.0f}°")
        elif x_diff <= 10:
            score += 5
            feedback.append(f"⭐ 좋은 X-Factor: {x_factor:.0f}°")
        elif x_diff <= 20:
            score -= 5
            feedback.append(f"X-Factor 개선 필요: {x_factor:.0f}° (이상: {ideal_x}°)")
        else:
            score -= 10
            improvements.append("상체와 하체 회전 차이를 늘리세요")
        
        # 2. 척추 각도 평가
        spine = features['spine_angle']
        ideal_spine = self.ideal_angles['address']['spine_tilt']
        spine_diff = abs(spine - ideal_spine)
        
        if spine_diff <= 5:
            score += 5
            feedback.append(f"✅ 좋은 척추 각도: {spine:.0f}°")
        elif spine_diff <= 15:
            score -= 3
        else:
            score -= 7
            improvements.append(f"척추 각도 조정: 현재 {spine:.0f}° → {ideal_spine}°")
        
        # 3. 무릎 굽힘 평가
        knee = features['knee_flex']
        if 20 <= knee <= 35:
            score += 3
            feedback.append("적절한 무릎 굽힘")
        elif knee < 15:
            score -= 5
            improvements.append("무릎을 더 굽히세요")
        elif knee > 40:
            score -= 5
            improvements.append("무릎을 덜 굽히세요")
        
        # 4. 체중 분배 평가
        weight = features['weight_distribution']
        if 0.9 <= weight <= 1.1:
            score += 3
            feedback.append("균형잡힌 체중 분배")
        else:
            score -= 3
            improvements.append("체중을 양발에 균등하게 분배하세요")
        
        # 5. 머리 안정성 (헤드업 체크)
        if features['head_stability']:
            score += 2
            feedback.append("머리 위치 안정적")
        else:
            score -= 5
            improvements.append("머리를 고정하세요 (헤드업 주의)")
        
        # 6. 신뢰도 보너스
        if features['confidence'] > 0.9:
            score += 5
        elif features['confidence'] > 0.8:
            score += 3
        
        # 최종 점수 조정 (70-95 범위)
        score = max(70, min(95, score))
        
        # 점수별 등급
        if score >= 90:
            feedback.insert(0, "🏆 프로 수준의 자세입니다!")
        elif score >= 85:
            feedback.insert(0, "⭐ 매우 좋은 자세입니다")
        elif score >= 80:
            feedback.insert(0, "👍 좋은 자세입니다")
        elif score >= 75:
            feedback.insert(0, "💪 개선이 필요하지만 기본기는 좋습니다")
        else:
            feedback.insert(0, "🎯 기본기 강화가 필요합니다")
        
        # 개선사항이 없으면 긍정적 피드백 추가
        if not improvements:
            improvements.append("현재 자세를 유지하면서 연습하세요")
            improvements.append("일관성 있는 스윙이 중요합니다")
        
        return int(score), feedback, improvements
    
    def detect_swing_faults(self, features):
        """실제 AI 기반 골프 스윙 결함 감지"""
        faults = []
        
        # X-Factor 체크
        if features['x_factor'] < 30:
            faults.append({
                'type': 'insufficient_turn',
                'severity': 'medium',
                'message': '상체 회전 부족',
                'fix': '어깨를 더 많이 돌리세요'
            })
        elif features['x_factor'] > 60:
            faults.append({
                'type': 'over_turn',
                'severity': 'low',
                'message': '과도한 상체 회전',
                'fix': '어깨 회전을 줄이세요'
            })
        
        # 척추 각도 체크
        if features['spine_angle'] > 35:
            faults.append({
                'type': 'excessive_spine_tilt',
                'severity': 'high',
                'message': '과도한 척추 기울기',
                'fix': '상체를 더 세우세요'
            })
        elif features['spine_angle'] < 15:
            faults.append({
                'type': 'insufficient_spine_tilt',
                'severity': 'medium',
                'message': '척추 기울기 부족',
                'fix': '상체를 약간 앞으로 기울이세요'
            })
        
        # 무릎 굽힘 체크
        if features['knee_flex'] > 40:
            faults.append({
                'type': 'excessive_knee_flex',
                'severity': 'medium',
                'message': '과도한 무릎 굽힘',
                'fix': '무릎을 덜 굽히세요'
            })
        elif features['knee_flex'] < 15:
            faults.append({
                'type': 'insufficient_knee_flex',
                'severity': 'high',
                'message': '무릎 굽힘 부족',
                'fix': '무릎을 더 굽히세요'
            })
        
        # 체중 분배 체크
        if features['weight_distribution'] < 0.8:
            faults.append({
                'type': 'weight_left',
                'severity': 'medium',
                'message': '체중이 왼쪽으로 치우침',
                'fix': '체중을 중앙으로 분배하세요'
            })
        elif features['weight_distribution'] > 1.2:
            faults.append({
                'type': 'weight_right',
                'severity': 'medium',
                'message': '체중이 오른쪽으로 치우침',
                'fix': '체중을 중앙으로 분배하세요'
            })
        
        # 머리 위치 체크
        if not features['head_stability']:
            faults.append({
                'type': 'head_movement',
                'severity': 'high',
                'message': '머리 움직임',
                'fix': '머리를 고정하고 스윙하세요'
            })
        
        return faults
    
    def analyze_video(self, base64_video):
        """비디오 분석 함수"""
        try:
            # Base64 디코딩
            if base64_video.startswith('data:'):
                base64_video = base64_video.split(',')[1]
            
            # 모든 공백 문자 제거
            base64_video = base64_video.replace('\n', '').replace('\r', '').replace(' ', '').replace('\t', '')
            
            # Base64 패딩 수정
            missing_padding = len(base64_video) % 4
            if missing_padding:
                base64_video += '=' * (4 - missing_padding)
            
            # 비디오 데이터 디코딩
            video_data = base64.b64decode(base64_video, validate=True)
            
            if len(video_data) == 0:
                return {'success': False, 'error': '빈 비디오 데이터'}
            
            print(f"✅ 비디오 데이터 로드: {len(video_data)} 바이트", file=sys.stderr)
            
            # 임시 파일에 비디오 저장
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as temp_video:
                temp_video.write(video_data)
                temp_video_path = temp_video.name
            
            # OpenCV로 비디오 읽기
            cap = cv2.VideoCapture(temp_video_path)
            
            if not cap.isOpened():
                return {'success': False, 'error': '비디오 파일을 열 수 없습니다'}
            
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            duration = frame_count / fps if fps > 0 else 0
            
            print(f"📹 비디오 정보: {frame_count}프레임, {fps}fps, {duration:.1f}초", file=sys.stderr)
            
            # 프레임별 분석 결과 저장
            frame_results = []
            valid_frames = 0
            
            # 5프레임마다 분석 (성능 최적화)
            frame_interval = max(1, frame_count // 20)  # 최대 20프레임 분석
            
            for i in range(0, frame_count, frame_interval):
                cap.set(cv2.CAP_PROP_POS_FRAMES, i)
                ret, frame = cap.read()
                
                if not ret:
                    break
                
                # 프레임 분석
                result = self.analyze_video_frame(frame)
                
                if result and result['frame_valid']:
                    frame_results.append({
                        'frame_number': i,
                        'timestamp': i / fps if fps > 0 else 0,
                        **result
                    })
                    valid_frames += 1
            
            cap.release()
            
            # 임시 파일 삭제
            import os
            os.unlink(temp_video_path)
            
            if valid_frames == 0:
                return {
                    'success': False,
                    'error': '비디오에서 골프 자세를 감지할 수 없습니다',
                    'message': '골퍼가 명확히 보이는 비디오를 업로드해주세요'
                }
            
            # 비디오 전체 분석 결과
            avg_x_factor = np.mean([f['x_factor'] for f in frame_results])
            max_x_factor = max([f['x_factor'] for f in frame_results])
            avg_confidence = np.mean([f['confidence'] for f in frame_results])
            
            # 스윙 단계 감지
            swing_phases = []
            for result in frame_results:
                if result['x_factor'] > 30:
                    swing_phases.append('backswing')
                elif result['x_factor'] < 15:
                    swing_phases.append('impact')
                else:
                    swing_phases.append('downswing')
            
            # 스윙 완성도 점수
            swing_completeness = len(set(swing_phases)) / 3 * 100  # 3단계 모두 있으면 100%
            
            return {
                'success': True,
                'detected': True,
                'video_analysis': True,
                'score': 70 + (avg_confidence * 25),  # 70-95 범위
                'frame_count': frame_count,
                'analyzed_frames': valid_frames,
                'duration': duration,
                'pose': {
                    'avgXFactor': round(avg_x_factor, 1),
                    'maxXFactor': round(max_x_factor, 1),
                    'swingCompleteness': round(swing_completeness, 1)
                },
                'swing_phases': list(set(swing_phases)),
                'frame_results': frame_results[-5:],  # 마지막 5프레임만 반환
                'feedback': [
                    f"✅ {valid_frames}개 프레임에서 골프 자세 감지됨",
                    f"📊 평균 X-Factor: {avg_x_factor:.1f}°",
                    f"🎯 스윙 완성도: {swing_completeness:.1f}%"
                ],
                'improvements': [
                    "비디오 분석을 통한 연속 동작 확인 완료",
                    f"감지된 스윙 단계: {', '.join(set(swing_phases))}"
                ],
                'confidence': round(avg_confidence * 100, 1),
                'method': 'Real MediaPipe Video Analysis',
                'isReal': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'비디오 분석 오류: {str(e)}',
                'method': 'Video Analysis Error'
            }
    
    def analyze(self, base64_image):
        """메인 분석 함수"""
        try:
            # Base64 디코딩 강화
            if base64_image.startswith('data:'):
                base64_image = base64_image.split(',')[1]
            
            # 모든 공백 문자 제거
            base64_image = base64_image.replace('\n', '').replace('\r', '').replace(' ', '').replace('\t', '')
            
            # Base64 패딩 수정
            missing_padding = len(base64_image) % 4
            if missing_padding:
                base64_image += '=' * (4 - missing_padding)
            
            # 이미지 데이터 검증 및 디코딩
            try:
                image_data = base64.b64decode(base64_image, validate=True)
            except Exception as decode_error:
                return {'success': False, 'error': f'Base64 디코딩 실패: {str(decode_error)}'}
            
            if len(image_data) == 0:
                return {'success': False, 'error': '빈 이미지 데이터'}
            
            # NumPy 배열 생성
            nparr = np.frombuffer(image_data, np.uint8)
            if len(nparr) == 0:
                return {'success': False, 'error': '이미지 버퍼가 비어있음'}
            
            # OpenCV로 이미지 디코딩
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return {'success': False, 'error': 'OpenCV 이미지 디코딩 실패 - 지원되지 않는 형식'}
            
            if image.size == 0:
                return {'success': False, 'error': '디코딩된 이미지가 비어있음'}
            
            print(f"✅ 이미지 성공적으로 로드: {image.shape}", file=sys.stderr)
            
            # 실제 사진 최적화: 이미지 전처리
            image = self.preprocess_image(image)
            print(f"🔧 이미지 전처리 완료: {image.shape}", file=sys.stderr)
            
            # 1. YOLO로 사람 감지
            detection = self.detect_person(image)
            
            # 2. 골프 자세 분석
            features = self.analyze_golf_pose(image)
            
            if not features:
                # 실제 AI 감지 실패시 명확한 오류
                return {
                    'success': False,
                    'detected': False,
                    'error': '실제 AI가 골프 자세를 감지하지 못했습니다',
                    'message': '명확한 골프 자세가 보이는 이미지를 업로드해주세요',
                    'method': 'Pro Golf Analyzer - Real AI Only'
                }
            
            # 3. 프로 수준 점수 계산
            score, feedback, improvements = self.calculate_pro_score(features)
            
            # 4. 실제 골프 스윙 결함 감지
            faults = self.detect_swing_faults(features)
            
            return {
                'success': True,
                'detected': True,
                'score': score,
                'pose': {
                    'shoulderRotation': round(features['shoulder_rotation'], 1),
                    'hipRotation': round(features['hip_rotation'], 1),
                    'xFactor': round(features['x_factor'], 1),
                    'spineAngle': round(features['spine_angle'], 1),
                    'kneeFlex': round(features['knee_flex'], 1),
                    'weightDistribution': round(features['weight_distribution'], 2),
                    'stanceWidth': round(features['stance_width'], 1)
                },
                'faults': faults,  # 실제 AI 결함 감지 결과
                'feedback': feedback,
                'improvements': improvements,
                'confidence': round(features['confidence'] * 100, 1),
                'method': 'Real MediaPipe AI Analysis',
                'yolo_confidence': round(detection['confidence'] * 100, 1) if detection else 0,
                'isReal': True  # 실제 AI 분석 표시
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'method': 'Pro Golf Analyzer Error'
            }

# 메인 실행
if __name__ == '__main__':
    analyzer = ProGolfAnalyzer()
    
    # 커맨드라인 인자 체크
    analysis_type = 'image'  # 기본값
    if len(sys.argv) > 2 and sys.argv[1] == '--video':
        analysis_type = 'video'
        with open(sys.argv[2], 'r') as f:
            base64_data = f.read().strip()
    elif len(sys.argv) > 1:
        if sys.argv[1] == '--video':
            analysis_type = 'video'
            base64_data = sys.stdin.read().strip()
        else:
            with open(sys.argv[1], 'r') as f:
                base64_data = f.read().strip()
    else:
        base64_data = sys.stdin.read().strip()
        # 데이터 타입 자동 감지
        if base64_data.startswith('data:video/') or 'mp4' in base64_data[:50]:
            analysis_type = 'video'
    
    # 분석 실행
    if analysis_type == 'video':
        print("🎬 비디오 분석 모드", file=sys.stderr)
        result = analyzer.analyze_video(base64_data)
    else:
        print("🖼️ 이미지 분석 모드", file=sys.stderr)
        result = analyzer.analyze(base64_data)
    
    print(json.dumps(result, ensure_ascii=False))