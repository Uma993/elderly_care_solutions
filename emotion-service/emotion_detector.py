"""
OpenCV + ONNX emotion detection. No TensorFlow, no ONNX Runtime.
- Face detection: YuNet (OpenCV 4.5.4+), fallback to Haar cascade
- Emotion: emotion-ferplus-8 from ONNX Model Zoo
"""
import os
import cv2
import numpy as np
import requests

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
EMOTION_MODEL_URL = "https://github.com/onnx/models/raw/main/validated/vision/body_analysis/emotion_ferplus/model/emotion-ferplus-8.onnx"
EMOTION_MODEL_PATH = os.path.join(MODEL_DIR, "emotion-ferplus-8.onnx")
YUNET_MODEL_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
YUNET_MODEL_PATH = os.path.join(MODEL_DIR, "face_detection_yunet_2023mar.onnx")

# FER+ 8 emotions in model output order
EMOTION_LABELS = ["neutral", "happiness", "surprise", "sadness", "anger", "disgust", "fear", "contempt"]

EMOTION_TO_WELLBEING = {
    "happiness": "positive",
    "surprise": "positive",
    "neutral": "neutral",
    "sadness": "needs_attention",
    "fear": "needs_attention",
    "anger": "needs_attention",
    "disgust": "needs_attention",
    "contempt": "needs_attention",
}

_net = None
_yunet = None


def _download_model(url, path, name):
    os.makedirs(MODEL_DIR, exist_ok=True)
    if os.path.isfile(path):
        return
    print(f"[Emotion] Downloading {name} to {path}...")
    r = requests.get(url, timeout=60)
    r.raise_for_status()
    with open(path, "wb") as f:
        f.write(r.content)
    print(f"[Emotion] {name} downloaded.")


def _get_net():
    global _net
    if _net is None:
        _download_model(EMOTION_MODEL_URL, EMOTION_MODEL_PATH, "emotion model")
        _net = cv2.dnn.readNetFromONNX(EMOTION_MODEL_PATH)
    return _net


def _get_yunet(img_h, img_w):
    """Get YuNet face detector, creating with input size matching image."""
    global _yunet
    if _yunet is None:
        _download_model(YUNET_MODEL_URL, YUNET_MODEL_PATH, "YuNet face detector")
        _yunet = cv2.FaceDetectorYN.create(
            model=YUNET_MODEL_PATH,
            config="",
            input_size=(320, 320),
            score_threshold=0.6,
            nms_threshold=0.3,
            top_k=5000,
        )
    _yunet.setInputSize((img_w, img_h))
    return _yunet


def _detect_face_haar(img, gray):
    """Fallback: Haar cascade face detection."""
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml")
    faces = cascade.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=4, minSize=(48, 48))
    if len(faces) == 0:
        return None
    x, y, w, h = max(faces, key=lambda r: r[2] * r[3])
    pad = int(0.1 * min(w, h))
    y1, y2 = max(0, y - pad), min(gray.shape[0], y + h + pad)
    x1, x2 = max(0, x - pad), min(gray.shape[1], x + w + pad)
    return gray[y1:y2, x1:x2]


def _detect_face(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray_clahe = clahe.apply(gray)
    h, w = img.shape[:2]

    # Try YuNet first (more accurate, OpenCV >= 4.5.4)
    try:
        detector = _get_yunet(h, w)
        _, faces = detector.detect(img)
        if faces is not None and len(faces) > 0:
            # faces: [x, y, w, h, ... landmarks ..., score], pick largest by area
            best = max(faces, key=lambda f: f[2] * f[3])
            x, y, w, h = int(best[0]), int(best[1]), int(best[2]), int(best[3])
            pad = int(0.1 * min(w, h))
            y1, y2 = max(0, y - pad), min(gray_clahe.shape[0], y + h + pad)
            x1, x2 = max(0, x - pad), min(gray_clahe.shape[1], x + w + pad)
            return gray_clahe[y1:y2, x1:x2]
    except Exception:
        pass

    # Fallback to Haar
    return _detect_face_haar(img, gray_clahe)


def _preprocess(face_gray):
    # CLAHE for robustness to varying lighting
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    face_gray = clahe.apply(face_gray)
    face_64 = cv2.resize(face_gray, (64, 64), interpolation=cv2.INTER_LINEAR)
    face_float = face_64.astype(np.float32)
    # No normalization - FER+ expects raw pixel values 0–255 (ONNX Model Zoo spec)
    inp = face_float.reshape(1, 1, 64, 64)
    return inp


def analyze_image(image_bytes: bytes) -> dict:
    """Analyze image for emotions. Returns result dict."""
    npy = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(npy, cv2.IMREAD_COLOR)
    if img is None:
        return {"success": False, "faceDetected": False, "message": "Invalid image"}

    face = _detect_face(img)
    if face is None:
        return {
            "success": True,
            "faceDetected": False,
            "emotions": {},
            "dominant": None,
            "wellbeing": None,
            "message": "No face detected. Please ensure your face is visible.",
        }

    try:
        net = _get_net()
        inp = _preprocess(face)
        net.setInput(inp)
        out = net.forward()
        logits = np.array(out).flatten()
        exp = np.exp(logits - np.max(logits))
        scores = exp / exp.sum()
    except Exception as e:
        return {"success": False, "faceDetected": True, "message": str(e)}

    emotions = {EMOTION_LABELS[i]: float(scores[i]) for i in range(len(EMOTION_LABELS))}
    idx = int(np.argmax(scores))
    dominant = EMOTION_LABELS[idx]
    wellbeing = EMOTION_TO_WELLBEING.get(dominant, "neutral")

    # Map labels to match frontend (e.g. happiness -> happy)
    emotions_display = {}
    for k, v in emotions.items():
        key = "happy" if k == "happiness" else ("sad" if k == "sadness" else ("angry" if k == "anger" else k))
        emotions_display[key] = v

    return {
        "success": True,
        "faceDetected": True,
        "emotions": emotions_display,
        "dominant": "happy" if dominant == "happiness" else ("sad" if dominant == "sadness" else ("angry" if dominant == "anger" else dominant)),
        "wellbeing": wellbeing,
        "message": None,
    }
