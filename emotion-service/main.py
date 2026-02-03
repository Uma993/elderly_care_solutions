"""
FastAPI service for face emotion detection using OpenCV + ONNX.
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from emotion_detector import analyze_image

app = FastAPI(title="Emotion Detection Service")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    try:
        contents = await file.read()
        result = analyze_image(contents)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
