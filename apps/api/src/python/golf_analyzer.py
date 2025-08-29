#!/usr/bin/env python3
# GolfFix 스타일 골프 분석 - MediaPipe 사용

import base64
import cv2
import mediapipe as mp
import numpy as np
import json
import sys

class GolfSwingAnalyzer:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        # 속도 최적화된 설정
        self.pose = self.mp_pose.Pose(
            static_image_mode=True,
            model_complexity=0,  # 최고속 모델 사용
            enable_segmentation=False,
            min_detection_confidence=0.5,  # 더 낮춰서 속도 향상
            min_tracking_confidence=0.5
        )
        # 캐시용 변수들
        self.last_result = None
        self.last_image_hash = None
        
    def analyze_image(self, base64_image):
        """Base64 이미지를 분석하여 골프 자세 감지"""
        try:
            # Base64 디코딩 - 더 유연하게 처리
            try:
                # Data URL 처리
                if base64_image.startswith('data:'):
                    base64_image = base64_image.split(',')[1]
                
                # 공백과 줄바꿈 제거
                base64_image = base64_image.replace('\n', '').replace('\r', '').replace(' ', '')
                
                image_data = base64.b64decode(base64_image)
                nparr = np.frombuffer(image_data, np.uint8)
                image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            except Exception as e:
                return {'detected': False, 'error': f'Base64 decode error: {str(e)}', 'score': 0}
            
            if image is None:
                return {'detected': False, 'error': 'Invalid image data', 'score': 0}
            
            # 빠른 이미지 전처리
            height, width = image.shape[:2]
            
            # 이미지 해시 계산 (캐싱용)
            image_hash = hash(image.data.tobytes())
            if self.last_image_hash == image_hash and self.last_result:
                print("📋 캐시된 결과 사용")
                return self.last_result
                
            # 초고속 처리: 작은 크기로 리사이즈
            target_size = 416  # 더 작은 크기로 속도 향상
            if width != target_size or height != target_size:
                image = cv2.resize(image, (target_size, target_size), interpolation=cv2.INTER_LINEAR)
            
            # 최소한의 전처리만 (속도 우선)
            # 전처리 생략하여 속도 향상
            
            # 이미지 처리
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # 단일 최적화된 분석 (속도 향상)
            results = self.pose.process(image_rgb)
            
            # 결과 캐싱
            if results.pose_landmarks:
                confidence = self.calculate_landmark_confidence(results.pose_landmarks)
                print(f"✅ 분석 성공 (신뢰도: {confidence:.3f})")
                # 캐시 저장
                self.last_image_hash = image_hash
            
            output = {
                'detected': False,
                'landmarks': [],
                'angles': {},
                'faults': [],
                'score': 50
            }
            
            if results.pose_landmarks:
                print("✅ MediaPipe 자세 감지 성공!")
                
                # 랜드마크 추출
                landmarks = []
                for idx, landmark in enumerate(results.pose_landmarks.landmark):
                    landmarks.append({
                        'id': idx,
                        'x': landmark.x,
                        'y': landmark.y,
                        'z': landmark.z,
                        'visibility': landmark.visibility
                    })
                
                # 골프 자세인지 판별
                is_golf_pose = self.is_golf_posture(landmarks)
                
                if is_golf_pose:
                    print("🏌️ 골프 자세로 판별됨")
                    output['detected'] = True
                    output['landmarks'] = landmarks
                    
                    # 속도 최적화: 핵심 각도만 계산
                    angles = self.calculate_golf_angles(results.pose_landmarks.landmark)
                    output['angles'] = angles
                    
                    # 스윙 결함 감지 (간소화)
                    faults = self.detect_swing_faults(angles, landmarks)
                    output['faults'] = faults
                    
                    # 점수 계산
                    output['score'] = self.calculate_score(angles, faults)
                    
                    # 결과 캐싱
                    self.last_result = output
                    self.last_image_hash = image_hash
                    
                else:
                    print("❌ 골프 자세가 아님 (다른 스포츠)")
                    output['detected'] = False
                    output['error'] = 'Not a golf posture'
                    output['score'] = 0
                    
            else:
                print("❌ MediaPipe 자세 감지 실패")
                
            return output
            
        except cv2.error as e:
            print(f"❌ OpenCV 오류: {str(e)}")
            return {
                'detected': False,
                'error': f'이미지 처리 오류: {str(e)}',
                'score': 0,
                'fallback': True
            }
        except ValueError as e:
            print(f"❌ 값 오류: {str(e)}")
            return {
                'detected': False,
                'error': f'잘못된 데이터: {str(e)}',
                'score': 0,
                'fallback': True
            }
        except MemoryError as e:
            print(f"❌ 메모리 오류: {str(e)}")
            return {
                'detected': False,
                'error': '메모리 부족으로 분석할 수 없습니다',
                'score': 0,
                'fallback': True
            }
        except Exception as e:
            print(f"❌ 예상치 못한 오류: {str(e)}")
            return {
                'detected': False,
                'error': f'분석 중 알 수 없는 오류: {str(e)}',
                'score': 0,
                'fallback': True,
                'error_type': type(e).__name__
            }
    
    def calculate_golf_angles(self, landmarks):
        """골프 스윙 관련 핵심 각도만 계산 (속도 최적화)"""
        angles = {}
        
        # 핵심 랜드마크만
        left_shoulder = landmarks[11]
        right_shoulder = landmarks[12]
        left_hip = landmarks[23]
        right_hip = landmarks[24]
        
        # 간단한 어깨 각도 (2D 계산으로 속도 향상)
        shoulder_angle = abs(left_shoulder.x - right_shoulder.x) * 180
        angles['shoulder_rotation'] = shoulder_angle
        
        # 간단한 힙 각도
        hip_angle = abs(left_hip.x - right_hip.x) * 150
        angles['hip_rotation'] = hip_angle
        
        # X-Factor (간소화)
        angles['x_factor'] = abs(shoulder_angle - hip_angle)
        
        # 척추 각도 (간소화)
        spine_angle = abs((left_shoulder.y + right_shoulder.y)/2 - (left_hip.y + right_hip.y)/2) * 90
        angles['spine_angle'] = spine_angle
        
        return angles
    
    def calculate_angle_3d(self, p1, p2, p3):
        """3D 공간에서 세 점 사이의 각도 계산"""
        v1 = np.array(p1) - np.array(p2)
        v2 = np.array(p3) - np.array(p2)
        
        cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
        angle = np.arccos(np.clip(cos_angle, -1, 1))
        
        return np.degrees(angle)
    
    def calculate_spine_angle(self, nose, left_shoulder, right_shoulder, left_hip, right_hip):
        """척추 각도 계산"""
        # 어깨 중심점
        shoulder_center = [
            (left_shoulder.x + right_shoulder.x) / 2,
            (left_shoulder.y + right_shoulder.y) / 2,
            (left_shoulder.z + right_shoulder.z) / 2
        ]
        
        # 힙 중심점
        hip_center = [
            (left_hip.x + right_hip.x) / 2,
            (left_hip.y + right_hip.y) / 2,
            (left_hip.z + right_hip.z) / 2
        ]
        
        # 척추 벡터
        spine_vector = np.array(shoulder_center) - np.array(hip_center)
        
        # 수직 벡터
        vertical = np.array([0, -1, 0])
        
        # 각도 계산
        cos_angle = np.dot(spine_vector, vertical) / (np.linalg.norm(spine_vector) * np.linalg.norm(vertical))
        angle = np.arccos(np.clip(cos_angle, -1, 1))
        
        return np.degrees(angle)
    
    def detect_swing_faults(self, angles, landmarks):
        """스윙 결함 감지"""
        faults = []
        
        # 1. 오버스윙 체크
        if angles.get('shoulder_rotation', 0) > 110:
            faults.append({
                'type': 'over_swing',
                'severity': 'medium',
                'message': '백스윙이 너무 큽니다',
                'fix': '클럽이 평행선을 넘지 않도록 제한하세요'
            })
        
        # 2. 불충분한 어깨 회전
        elif angles.get('shoulder_rotation', 0) < 75:
            faults.append({
                'type': 'insufficient_turn',
                'severity': 'high',
                'message': '어깨 회전이 부족합니다',
                'fix': '백스윙시 어깨를 90도까지 회전하세요'
            })
        
        # 3. X-Factor 부족
        if angles.get('x_factor', 0) < 25:
            faults.append({
                'type': 'poor_x_factor',
                'severity': 'medium',
                'message': 'X-Factor가 부족합니다',
                'fix': '상체와 하체의 회전 차이를 늘리세요'
            })
        
        # 4. 무릎 각도 문제
        if angles.get('knee_flex', 0) < 130 or angles.get('knee_flex', 0) > 170:
            faults.append({
                'type': 'knee_flex_issue',
                'severity': 'low',
                'message': '무릎 각도가 적절하지 않습니다',
                'fix': '어드레스시 무릎을 적당히 굽히세요'
            })
        
        # 5. 팔 굽힘
        if angles.get('elbow_angle', 0) < 150:
            faults.append({
                'type': 'bent_arm',
                'severity': 'medium',
                'message': '백스윙시 팔이 굽어있습니다',
                'fix': '왼팔을 곧게 펴세요'
            })
        
        # 6. 척추 각도
        if angles.get('spine_angle', 0) < 20 or angles.get('spine_angle', 0) > 40:
            faults.append({
                'type': 'spine_angle_issue',
                'severity': 'high',
                'message': '척추 각도가 적절하지 않습니다',
                'fix': '어드레스시 적절한 전경각을 유지하세요'
            })
        
        # 7. 머리 위치 체크
        nose = landmarks[0] if landmarks else None
        if nose and nose['y'] < 0.25:  # 머리가 너무 올라감
            faults.append({
                'type': 'head_up',
                'severity': 'critical',
                'message': '헤드업이 발생했습니다',
                'fix': '임팩트까지 공을 주시하세요'
            })
        
        return faults
    
    def calculate_score(self, angles, faults):
        """종합 점수 계산"""
        base_score = 70
        
        # 각도 기반 점수
        if 85 <= angles.get('shoulder_rotation', 0) <= 95:
            base_score += 10
        
        if 40 <= angles.get('hip_rotation', 0) <= 50:
            base_score += 5
        
        if angles.get('x_factor', 0) >= 40:
            base_score += 10
        
        if 140 <= angles.get('knee_flex', 0) <= 160:
            base_score += 5
        
        # 결함에 따른 감점
        severity_penalty = {
            'critical': 15,
            'high': 10,
            'medium': 5,
            'low': 2
        }
        
        for fault in faults:
            base_score -= severity_penalty.get(fault['severity'], 0)
        
        return max(0, min(100, base_score))
    
    def is_golf_posture(self, landmarks):
        """고정밀 골프 자세 판별"""
        try:
            # 주요 랜드마크 추출
            left_shoulder = landmarks[11]
            right_shoulder = landmarks[12] 
            left_hip = landmarks[23]
            right_hip = landmarks[24]
            left_wrist = landmarks[15]
            right_wrist = landmarks[16]
            left_elbow = landmarks[13]
            right_elbow = landmarks[14]
            nose = landmarks[0]
            left_knee = landmarks[25]
            right_knee = landmarks[26]
            
            score = 0  # 골프 자세 점수 (0-100)
            
            # 1. 어깨선 수평성 (20점)
            shoulder_tilt = abs(left_shoulder['y'] - right_shoulder['y'])
            if shoulder_tilt < 0.08:
                score += 20
            elif shoulder_tilt < 0.15:
                score += 15
            elif shoulder_tilt < 0.25:
                score += 10
            print(f"📐 어깨 기울기: {shoulder_tilt:.3f} (점수: {min(20, int(20*(0.25-shoulder_tilt)/0.25))})")
            
            # 2. 손목 위치 일관성 (15점)
            wrist_diff = abs(left_wrist['y'] - right_wrist['y'])
            if wrist_diff < 0.2:
                score += 15
            elif wrist_diff < 0.4:
                score += 10
            elif wrist_diff < 0.6:
                score += 5
            print(f"🤲 손목 높이차: {wrist_diff:.3f}")
            
            # 3. 팔꿈치 위치 (골프 특징) (15점)
            elbow_shoulder_relation = (left_elbow['y'] + right_elbow['y'])/2 - (left_shoulder['y'] + right_shoulder['y'])/2
            if 0.1 < elbow_shoulder_relation < 0.4:  # 팔꿈치가 어깨보다 적당히 아래
                score += 15
            elif 0.05 < elbow_shoulder_relation < 0.5:
                score += 10
            print(f"💪 팔꿈치 위치: {elbow_shoulder_relation:.3f}")
            
            # 4. 상체 전경각 (20점)
            shoulder_center_y = (left_shoulder['y'] + right_shoulder['y']) / 2
            hip_center_y = (left_hip['y'] + right_hip['y']) / 2
            forward_lean = hip_center_y - shoulder_center_y  # 양수면 상체가 앞으로 기울어짐
            if 0.1 < forward_lean < 0.4:  # 적절한 전경각
                score += 20
            elif 0.05 < forward_lean < 0.5:
                score += 15
            elif forward_lean > 0:
                score += 10
            print(f"📏 상체 전경각: {forward_lean:.3f}")
            
            # 5. 무릎 굽힘 (10점)
            knee_hip_relation = ((left_knee['y'] + right_knee['y'])/2) - hip_center_y
            if 0.15 < knee_hip_relation < 0.35:  # 적절한 무릎 굽힘
                score += 10
            elif 0.1 < knee_hip_relation < 0.4:
                score += 7
            print(f"🦵 무릎 굽힘: {knee_hip_relation:.3f}")
            
            # 6. 머리 위치 (10점)
            if 0.15 < nose['y'] < 0.6:
                score += 10
            elif 0.1 < nose['y'] < 0.7:
                score += 7
            print(f"🗣️ 머리 위치: {nose['y']:.3f}")
            
            # 7. 손-몸체 중심 거리 (10점)
            wrist_center_x = (left_wrist['x'] + right_wrist['x']) / 2
            body_center_x = (left_shoulder['x'] + right_shoulder['x']) / 2
            hand_body_distance = abs(wrist_center_x - body_center_x)
            if hand_body_distance < 0.3:
                score += 10
            elif hand_body_distance < 0.5:
                score += 7
            elif hand_body_distance < 0.7:
                score += 3
            print(f"✋ 손-몸체 거리: {hand_body_distance:.3f}")
            
            # 추가 골프 특징 검증 (보너스 점수)
            bonus_score = 0
            
            # 골프 스탠스 폭 체크 (어깨 너비와 비슷해야 함)
            stance_width = abs(left_knee['x'] - right_knee['x'])
            shoulder_width = abs(left_shoulder['x'] - right_shoulder['x'])
            stance_ratio = stance_width / max(shoulder_width, 0.1)
            if 0.8 <= stance_ratio <= 1.5:  # 적절한 스탠스 폭
                bonus_score += 5
                print(f"👣 스탠스 폭 적절: {stance_ratio:.2f}")
            
            # 체중 분배 체크 (양발 균등)
            weight_balance = abs(left_knee['x'] - right_knee['x']) / 2
            body_center = abs((left_shoulder['x'] + right_shoulder['x'])/2)
            if abs(weight_balance - body_center) < 0.1:
                bonus_score += 5
                print("⚖️ 체중 분배 균등")
            
            score += bonus_score
            
            # 다른 스포츠와 구별하는 강화된 체크
            is_other_sport = False
            disqualification_reasons = []
            
            # 축구 슈팅 자세 체크 (강화)
            if left_knee['y'] < hip_center_y - 0.15 or right_knee['y'] < hip_center_y - 0.15:
                print("⚽ 축구 슈팅 자세 의심 (무릎이 너무 높음)")
                is_other_sport = True
                disqualification_reasons.append('축구 자세')
                
            # 농구 슈팅 자세 체크 (강화)
            if wrist_center_x > body_center_x + 0.5 and nose['y'] < 0.25:
                print("🏀 농구 슈팅 자세 의심 (손이 옆으로, 머리가 올라감)")
                is_other_sport = True
                disqualification_reasons.append('농구 자세')
                
            # 런닝 자세 체크
            if abs(left_shoulder['x'] - right_shoulder['x']) > 0.35:
                print("🏃 런닝 자세 의심 (어깨 회전 과도)")
                is_other_sport = True
                disqualification_reasons.append('런닝 자세')
                
            # 댄싱/체조 자세 체크
            if nose['y'] < 0.15 and hand_body_distance > 0.6:
                print("💃 댄싱/체조 자세 의심 (머리 높고 팔 넓게)")
                is_other_sport = True
                disqualification_reasons.append('댄싱/체조 자세')
            
            # 앉아있는 자세 체크
            if hip_center_y > 0.7:
                print("🪑 앉은 자세 의심 (힙이 너무 낮음)")
                is_other_sport = True
                disqualification_reasons.append('앉은 자세')
            
            # 최종 판별 (기준 상향: 75점)
            final_result = score >= 75 and not is_other_sport
            
            result_msg = f"🎯 골프 자세 점수: {score}/105"
            if disqualification_reasons:
                result_msg += f" - 제외사유: {', '.join(disqualification_reasons)}"
            print(result_msg)
            
            print(f"✅ 최종 판별: {'골프 자세' if final_result else '비골프 자세'}")
            
            return final_result
            
        except (IndexError, KeyError) as e:
            print(f"❌ 랜드마크 접근 오류: {e}")
            return False
    
    def calculate_landmark_confidence(self, pose_landmarks):
        """랜드마크 신뢰도 계산"""
        if not pose_landmarks.landmark:
            return 0.0
        
        # 주요 골프 관련 랜드마크들의 visibility 평균
        key_landmarks = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26]  # 머리, 어깨, 팔, 힙, 무릎
        total_confidence = 0
        valid_landmarks = 0
        
        for idx in key_landmarks:
            if idx < len(pose_landmarks.landmark):
                landmark = pose_landmarks.landmark[idx]
                if hasattr(landmark, 'visibility'):
                    total_confidence += landmark.visibility
                    valid_landmarks += 1
        
        return total_confidence / max(valid_landmarks, 1)
    
    def close(self):
        """리소스 정리"""
        self.pose.close()

def main():
    """메인 실행 함수"""
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No image data provided'}))
        return
    
    analyzer = GolfSwingAnalyzer()
    result = analyzer.analyze_image(sys.argv[1])
    analyzer.close()
    
    print(json.dumps(result))

if __name__ == '__main__':
    main()