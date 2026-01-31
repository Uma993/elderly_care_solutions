import React, { useState, useRef, useCallback } from 'react';
import { API_BASE_URL, getAuthHeaders } from '../api';
import { colors } from '../design/tokens';

const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '');

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

function VoiceAssistant({ token, onAction }) {
  const [status, setStatus] = useState('idle'); // idle | listening | thinking
  const [error, setError] = useState('');
  const [lastTranscript, setLastTranscript] = useState('');
  const [lastReply, setLastReply] = useState('');
  const recognitionRef = useRef(null);

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
            return;
          }
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
        })
        .finally(() => {
          setStatus('idle');
        });
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        setError("I didn't catch that.");
      } else if (event.error !== 'aborted') {
        setError(event.error || 'Recognition error.');
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

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          aria-label="Hold to talk"
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={(e) => { e.preventDefault(); handlePressStart(); }}
          onTouchEnd={(e) => { e.preventDefault(); handlePressEnd(); }}
          disabled={status === 'thinking'}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: `3px solid ${status === 'listening' ? colors.primary : colors.borderSubtle}`,
            background: colors.surfaceSoft,
            cursor: status === 'thinking' ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem'
          }}
        >
          {status === 'thinking' ? '…' : '🎤'}
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
