#!/usr/bin/env python3
# MediaPipe 실제 테스트
import cv2
import mediapipe as mp
import numpy as np
import base64
import json
import sys
import os

def test_mediapipe_basic():
    """MediaPipe 기본 기능 테스트"""
    print("🔍 MediaPipe 기본 테스트...")
    
    # 간단한 테스트 이미지 생성 (사람 모양)
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    
    # 사람 형태 그리기
    cv2.circle(img, (320, 120), 30, (255, 255, 255), -1)  # 머리
    cv2.rectangle(img, (300, 150), (340, 280), (255, 255, 255), -1)  # 몸통
    cv2.line(img, (300, 180), (250, 240), (255, 255, 255), 15)  # 왼팔
    cv2.line(img, (340, 180), (390, 240), (255, 255, 255), 15)  # 오른팔
    cv2.line(img, (310, 280), (290, 380), (255, 255, 255), 15)  # 왼다리
    cv2.line(img, (330, 280), (350, 380), (255, 255, 255), 15)  # 오른다리
    
    # MediaPipe 초기화
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(
        static_image_mode=True,
        min_detection_confidence=0.1,  # 낮은 임계값
        min_tracking_confidence=0.1
    )
    
    # 이미지 처리
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = pose.process(rgb_img)
    
    if results.pose_landmarks:
        print("✅ MediaPipe 자세 감지 성공!")
        landmarks = []
        for idx, landmark in enumerate(results.pose_landmarks.landmark):
            landmarks.append({
                'id': idx,
                'x': landmark.x,
                'y': landmark.y,
                'z': landmark.z,
                'visibility': landmark.visibility
            })
        
        # Base64로 인코딩
        _, buffer = cv2.imencode('.jpg', img)
        base64_img = base64.b64encode(buffer).decode()
        
        result = {
            'detected': True,
            'landmarks': landmarks[:5],  # 처음 5개만
            'total_landmarks': len(landmarks),
            'test_image': base64_img[:100] + '...'
        }
        
        print(json.dumps(result, indent=2))
        
    else:
        print("❌ MediaPipe 자세 감지 실패")
        print("💡 더 명확한 사람 이미지가 필요합니다")
    
    pose.close()

def test_with_real_photo():
    """실제 웹캠으로 테스트"""
    print("\n📷 웹캠 테스트 (5초간)...")
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ 웹캠을 열 수 없습니다")
        return
    
    mp_pose = mp.solutions.pose
    mp_drawing = mp.solutions.drawing_utils
    pose = mp_pose.Pose(min_detection_confidence=0.5)
    
    print("📸 웹캠 앞에서 팔을 들어보세요...")
    
    success_count = 0
    for i in range(50):  # 5초간 테스트 (10fps)
        ret, frame = cap.read()
        if not ret:
            continue
            
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb_frame)
        
        if results.pose_landmarks:
            success_count += 1
            if success_count == 1:  # 첫 성공시 저장
                _, buffer = cv2.imencode('.jpg', frame)
                base64_img = base64.b64encode(buffer).decode()
                
                landmarks = []
                for idx, landmark in enumerate(results.pose_landmarks.landmark):
                    landmarks.append({
                        'id': idx,
                        'x': landmark.x,
                        'y': landmark.y,
                        'visibility': landmark.visibility
                    })
                
                result = {
                    'detected': True,
                    'landmarks': landmarks,
                    'success_rate': f"{success_count}/50",
                    'base64_sample': base64_img[:200] + '...'
                }
                
                print("✅ 웹캠 자세 감지 성공!")
                print(json.dumps(result, indent=2))
                break
    
    cap.release()
    pose.close()
    
    if success_count == 0:
        print("❌ 웹캠에서 자세 감지 실패")
        print("💡 카메라 앞에서 전신이 보이도록 해보세요")

if __name__ == "__main__":
    print("🧪 MediaPipe 실제 동작 테스트")
    print("="*50)
    
    try:
        test_mediapipe_basic()
        test_with_real_photo()
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        print("💡 MediaPipe 설치 확인: pip install mediapipe opencv-python")