import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { colors, radii, spacing } from '../design/tokens';
import { API_BASE_URL, getAuthHeaders } from '../api';

const cardStyle = {
  padding: spacing.xl,
  borderRadius: radii.card,
  border: `1px solid ${colors.borderSubtle}`,
  background: colors.surfaceSoft,
  marginBottom: spacing.lg
};

const WELLBEING_MESSAGES = {
  positive: { text: 'You seem in good spirits!', color: colors.successText, bg: colors.successBg },
  neutral: { text: 'Feeling neutral. Take care of yourself.', color: colors.textMuted, bg: colors.surfaceSoft },
  needs_attention: { text: 'Consider reaching out to someone you trust.', color: colors.warningText, bg: colors.warningBg }
};

const CAPTURE_INTERVAL_MS = 1500;

function EmotionCheckPage() {
  const { token } = useOutletContext();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  const [streamReady, setStreamReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const captureAndAnalyze = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !token || loading || !streamReady || video.readyState < 2) return;

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.save();
    ctx.translate(0, canvas.height);
    ctx.scale(1, -1);
    ctx.drawImage(video, 0, 0);
    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            resolve();
            return;
          }
          setLoading(true);
          setError('');
          try {
            const form = new FormData();
            form.append('image', blob, 'frame.jpg');
            const res = await fetch(`${API_BASE_URL}/wellbeing/analyze-face`, {
              method: 'POST',
              headers: getAuthHeaders(token),
              body: form
            });
            const data = await res.json();
            if (res.ok) {
              setResult(data);
            } else {
              setError(data.message || 'Analysis failed.');
            }
          } catch {
            setError('Unable to reach the server.');
          }
          setLoading(false);
          resolve();
        },
        'image/jpeg',
        0.95
      );
    });
  }, [token, loading, streamReady]);

  useEffect(() => {
    let mounted = true;
    async function startCamera() {
      setCameraError('');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(() => {
              if (mounted) setStreamReady(true);
            });
          };
        }
      } catch (err) {
        if (mounted) {
          setCameraError(err.message || 'Could not access camera. Please allow camera access.');
        }
      }
    }
    startCamera();
    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setStreamReady(false);
    };
  }, []);

  useEffect(() => {
    if (!streamReady || isPaused || !token) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(captureAndAnalyze, CAPTURE_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [streamReady, isPaused, token, captureAndAnalyze]);

  return (
    <div>
      <h2 style={{ marginTop: 0, fontSize: '1.5rem', textAlign: 'center' }}>Emotion & Wellbeing Check</h2>
      <p style={{ textAlign: 'center', color: colors.textMuted, marginBottom: spacing.lg }}>
        Live camera detection. Position your face in view. Results update every few seconds.
      </p>

      <div style={cardStyle}>
        <div style={{ position: 'relative', marginBottom: spacing.md, maxWidth: 480, margin: '0 auto' }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: '100%',
              borderRadius: radii.card,
              background: '#000',
              transform: 'scaleX(-1)'
            }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {result?.faceDetected && result?.dominant && (
            <div
              style={{
                position: 'absolute',
                bottom: spacing.md,
                left: '50%',
                transform: 'translateX(-50%) scaleX(-1)',
                padding: `${spacing.sm} ${spacing.lg}`,
                borderRadius: radii.button,
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '1.1rem',
                textTransform: 'capitalize'
              }}
            >
              {result.dominant}
            </div>
          )}
        </div>

        {cameraError && (
          <p style={{ color: colors.errorText, marginBottom: spacing.md }}>{cameraError}</p>
        )}

        <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => setIsPaused((p) => !p)}
            disabled={!streamReady}
            style={{
              padding: `${spacing.sm} ${spacing.lg}`,
              borderRadius: radii.button,
              background: isPaused ? colors.primary : colors.textMuted,
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              cursor: streamReady ? 'pointer' : 'not-allowed',
              opacity: streamReady ? 1 : 0.6
            }}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          {loading && (
            <span style={{ color: colors.textMuted, alignSelf: 'center' }}>Analyzing...</span>
          )}
        </div>
      </div>

      {error && <p style={{ textAlign: 'center', color: colors.errorText, marginBottom: spacing.lg }}>{error}</p>}

      {result && (
        <>
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <h3 style={{ marginTop: 0, marginBottom: spacing.md }}>Result</h3>
            {result.faceDetected ? (
              <>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, margin: `0 0 ${spacing.sm} 0`, textTransform: 'capitalize' }}>
                  {result.dominant}
                </p>
                {result.wellbeing && (
                  <div style={{
                    marginTop: spacing.md,
                    padding: spacing.md,
                    borderRadius: radii.card,
                    background: WELLBEING_MESSAGES[result.wellbeing]?.bg || colors.surfaceSoft,
                    color: WELLBEING_MESSAGES[result.wellbeing]?.color || colors.text
                  }}>
                    {WELLBEING_MESSAGES[result.wellbeing]?.text || result.wellbeing}
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: colors.textMuted }}>{result.message || 'No face detected.'}</p>
            )}
          </div>

          {result.faceDetected && result.emotions && Object.keys(result.emotions).length > 0 && (
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, marginBottom: spacing.md }}>Emotion breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                {Object.entries(result.emotions).map(([emotion, score]) => (
                  <div key={emotion} style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                    <span style={{ width: 80, textTransform: 'capitalize' }}>{emotion}</span>
                    <div style={{ flex: 1, height: 8, background: colors.borderSubtle, borderRadius: radii.pill, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.round(score * 100)}%`,
                          height: '100%',
                          background: colors.primary,
                          borderRadius: radii.pill
                        }}
                      />
                    </div>
                    <span style={{ width: 40, fontSize: '0.9rem', color: colors.textMuted }}>{Math.round(score * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default EmotionCheckPage;
