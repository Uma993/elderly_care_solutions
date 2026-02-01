import React, { useState, useRef, useCallback } from 'react';
import { API_BASE_URL, getAuthHeaders } from '../api';
import { colors } from '../design/tokens';
import { useActionState } from '../hooks/useActionState';

const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '');

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

function VoiceAssistant({ token, onAction }) {
  const [status, setStatus] = useState('idle'); // idle | listening | thinking
  const [error, setError] = useState('');
  const [lastTranscript, setLastTranscript] = useState('');
  const [lastReply, setLastReply] = useState('');
  const recognitionRef = useRef(null);
  const actionState = useActionState({ autoResetMs: 3000 });

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
  }, []);

  const handlePressStart = () => {
    if (!token) return;
    if (!SpeechRecognitionAPI) {
      setError('Voice not supported in this browser.');
      return;
    }
    setError('');
    actionState.setPending();
    setStatus('listening');
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const results = event.results;
      if (results.length === 0) return;
      const transcript = (results[results.length - 1][0].transcript || '').trim();
      try {
        recognition.stop();
      } catch (_) {}
      recognitionRef.current = null;
      if (!transcript) {
        setStatus('idle');
        setError("I didn't catch that.");
        return;
      }
      setStatus('thinking');
      fetch(`${baseUrl}/api/ai/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ transcript })
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          return { ok: res.ok, data };
        })
        .then(({ ok, data }) => {
          if (!ok && data.message) {
            setError(data.message);
            actionState.setError(data.message);
            return;
          }
          actionState.setSuccess();
          if (data.transcript) setLastTranscript(data.transcript);
          if (data.replyText) {
            setLastReply(data.replyText);
            if (window.speechSynthesis) {
              window.speechSynthesis.cancel();
              const u = new SpeechSynthesisUtterance(data.replyText);
              window.speechSynthesis.speak(u);
            }
          }
          if (data.action && typeof onAction === 'function') {
            onAction(data.action);
          }
        })
        .catch((err) => {
          setError(err.message || 'Request failed.');
          actionState.setError(err.message || 'Request failed.');
        })
        .finally(() => {
          setStatus('idle');
        });
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        setError("I didn't catch that.");
        actionState.setError("I didn't catch that.");
      } else if (event.error !== 'aborted') {
        setError(event.error || 'Recognition error.');
        actionState.setError(event.error || 'Recognition error.');
      }
      setStatus('idle');
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
        if (status === 'listening') {
          setStatus('idle');
        }
      }
    };

    try {
      recognition.start();
    } catch (err) {
      setError(err.message || 'Could not start recognition.');
      actionState.setError(err.message || 'Could not start recognition.');
      setStatus('idle');
      recognitionRef.current = null;
    }
  };

  const handlePressEnd = () => {
    stopRecognition();
    if (status === 'listening') {
      setStatus('idle');
    }
  };

  if (!token) return null;

  if (!SpeechRecognitionAPI) {
    return (
      <div style={{ marginTop: '1rem' }}>
        <p style={{ color: colors.errorText, fontSize: '0.95rem' }}>
          Voice not supported in this browser.
        </p>
      </div>
    );
  }

  const MicIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );

  const ThinkingSpinner = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
      <path d="M12 2a10 10 0 019 7" strokeOpacity={1} />
    </svg>
  );

  return (
    <div style={{ marginTop: '1rem' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          aria-label="Hold to talk"
          className={status === 'listening' ? 'mic-button-listening' : ''}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={(e) => { e.preventDefault(); handlePressStart(); }}
          onTouchEnd={(e) => { e.preventDefault(); handlePressEnd(); }}
          disabled={status === 'thinking'}
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            border: 'none',
            background: status === 'thinking' ? colors.primary : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
            color: '#fff',
            cursor: status === 'thinking' ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: status === 'listening' ? undefined : '0 4px 14px rgba(37, 99, 235, 0.4)'
          }}
        >
          {status === 'thinking' ? <ThinkingSpinner /> : <MicIcon />}
        </button>
        <span style={{ fontSize: '1rem', color: colors.textMuted }}>
          {status === 'idle' && 'Hold to talk'}
          {status === 'listening' && 'Listening…'}
          {status === 'thinking' && 'Thinking…'}
        </span>
      </div>
      {(lastTranscript || lastReply) && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: colors.surfaceSoft, borderRadius: 8, fontSize: '0.9rem' }}>
          {lastTranscript && (
            <p style={{ margin: 0, marginBottom: lastReply ? '0.5rem' : 0, color: colors.textMuted }}>
              <strong>You:</strong> {lastTranscript}
            </p>
          )}
          {lastReply && (
            <p style={{ margin: 0, color: colors.text }}>
              <strong>Assistant:</strong> {lastReply}
            </p>
          )}
        </div>
      )}
      {error && (
        <p style={{ margin: '0.5rem 0 0', color: colors.errorText, fontSize: '0.95rem' }}>{error}</p>
      )}
    </div>
  );
}

export default VoiceAssistant;
