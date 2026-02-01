import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL, getAuthHeaders } from '../api';
import { colors, radii } from '../design/tokens';
import { useActionState, ACTION_STATUS } from '../hooks/useActionState';

const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '');
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
const VALID_VALUES = ['good', 'okay', 'not_well'];

function normalizeVoiceToValue(transcript) {
  const t = (transcript || '').toLowerCase().trim();
  if (/^(good|great|fine|well|happy|good)$/.test(t)) return 'good';
  if (/^(okay|ok|okey|alright|so-so|meh)$/.test(t)) return 'okay';
  if (/^(not well|not good|bad|unwell|sad|not well|poor)$/.test(t)) return 'not_well';
  if (t.includes('not') && (t.includes('well') || t.includes('good'))) return 'not_well';
  return null;
}

function WellbeingCheck({ token, onClose, onSubmitted }) {
  const { status, error, setPending, setSuccess, setError } = useActionState({ autoResetMs: 0 });
  const [submitted, setSubmitted] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const recognitionRef = useRef(null);
  const loading = status === ACTION_STATUS.PENDING;

  useEffect(() => {
    if (!token) return;
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance('How are you feeling today?');
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, [token]);

  const submit = async (value) => {
    if (!token || loading || submitted) return;
    setPending();
    try {
      const res = await fetch(`${baseUrl}/api/wellbeing/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ value })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'Failed to save.');
        return;
      }
      setSuccess();
      setSubmitted(true);
      if (typeof onSubmitted === 'function') onSubmitted();
      setTimeout(() => {
        if (typeof onClose === 'function') onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Request failed.');
    }
  };

  const startVoice = () => {
    if (!SpeechRecognitionAPI || loading || submitted) return;
    setError('');
    setVoiceListening(true);
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;
    recognition.onresult = (event) => {
      const results = event.results;
      if (results.length > 0) {
        const transcript = (results[results.length - 1][0].transcript || '').trim();
        const value = normalizeVoiceToValue(transcript);
        if (value) submit(value);
      }
      setVoiceListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = () => {
      setVoiceListening(false);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      setVoiceListening(false);
    };
    try {
      recognition.start();
    } catch (_) {
      setVoiceListening(false);
    }
  };

  const cardStyle = (bg) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '1.25rem 1rem',
    minHeight: 100,
    borderRadius: radii.card,
    background: bg,
    color: '#fff',
    border: 'none',
    cursor: loading || submitted ? 'default' : 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    fontSize: '1.1rem',
    fontWeight: 600
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wellbeing-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        boxSizing: 'border-box'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        style={{
          background: colors.surface,
          borderRadius: radii.card,
          padding: '1.5rem',
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="wellbeing-title" style={{ margin: '0 0 1rem', fontSize: '1.5rem', fontWeight: 700, textAlign: 'center' }}>
          HOW ARE YOU FEELING TODAY?
        </h2>

        {submitted ? (
          <p style={{ textAlign: 'center', fontSize: '1.2rem', color: colors.successText, margin: '1rem 0' }}>
            Thank you. Take care.
          </p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <button type="button" onClick={() => submit('good')} disabled={loading} style={cardStyle('#22c55e')}>
                <span style={{ fontSize: '2rem' }}>🙂</span>
                Good
              </button>
              <button type="button" onClick={() => submit('okay')} disabled={loading} style={cardStyle('#f59e0b')}>
                <span style={{ fontSize: '2rem' }}>😐</span>
                Okay
              </button>
              <button type="button" onClick={() => submit('not_well')} disabled={loading} style={cardStyle('#dc2626')}>
                <span style={{ fontSize: '2rem' }}>😟</span>
                Not well
              </button>
            </div>

            {SpeechRecognitionAPI && (
              <button
                type="button"
                onClick={startVoice}
                disabled={loading || voiceListening}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  border: `1px solid ${colors.borderSubtle}`,
                  borderRadius: radii.button,
                  background: colors.surfaceSoft,
                  cursor: loading || voiceListening ? 'wait' : 'pointer',
                  fontWeight: 500
                }}
              >
                {voiceListening ? 'Listening…' : 'Say how you feel'}
              </button>
            )}

            {error && (
              <p style={{ margin: '0.75rem 0 0', color: colors.errorText, fontSize: '0.95rem' }}>{error}</p>
            )}
          </>
        )}

        {!submitted && (
          <button
            type="button"
            onClick={onClose}
            style={{
              marginTop: '1rem',
              width: '100%',
              padding: '0.5rem',
              fontSize: '0.95rem',
              border: 'none',
              background: 'transparent',
              color: colors.textMuted,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

export default WellbeingCheck;
