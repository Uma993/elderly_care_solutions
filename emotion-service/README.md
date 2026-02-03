# Emotion Detection Service

OpenCV DNN + ONNX (no TensorFlow, no ONNX Runtime). Uses emotion-ferplus-8 model.

## Setup

```bash
pip uninstall deepface tensorflow -y
pip install -r requirements.txt
```

## Run

```bash
uvicorn main:app --host 0.0.0.0 --port 5001
```

Models are downloaded automatically on first run:
- emotion-ferplus-8.onnx (~34 MB)
- face_detection_yunet_2023mar.onnx (~338 KB) for YuNet face detection; falls back to Haar if unavailable.

## API

- `GET /health` - Health check
- `POST /analyze` - Multipart form with `file` (image). Returns emotions and wellbeing.
