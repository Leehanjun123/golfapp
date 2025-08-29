# YOLOv8 골프 특화 설정
# 골프 클럽, 볼, 사람 감지 특화

from ultralytics import YOLO
import cv2
import numpy as np

class GolfYOLO:
    def __init__(self):
        # 골프 특화 클래스
        self.golf_classes = {
            0: 'person',
            1: 'golf_club',
            2: 'golf_ball',
            3: 'tee',
            4: 'flag'
        }
        
        # YOLOv8 모델 로드 (골프 특화 가중치 필요시)
        self.model = YOLO('yolov8n.pt')
    
    def detect_golf_elements(self, image):
        """골프 관련 객체 감지"""
        results = self.model(image)
        
        detections = {
            'person': [],
            'golf_equipment': [],
            'confidence': 0
        }
        
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    class_id = int(box.cls[0])
                    confidence = float(box.conf[0])
                    
                    if class_id == 0:  # person
                        detections['person'].append({
                            'bbox': box.xyxy[0].tolist(),
                            'confidence': confidence
                        })
                    
                    detections['confidence'] = max(detections['confidence'], confidence)
        
        return detections
