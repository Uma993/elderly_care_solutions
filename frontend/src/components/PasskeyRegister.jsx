import React, { useState, useEffect } from 'react';
import Button from './ui/Button.jsx';
import { API_BASE_URL, getAuthHeaders } from '../api';
import { toRegistrationOptions, registrationCredentialToJSON, supportsWebAuthn } from '../webauthnHelpers.js';

function PasskeyRegister({ token, onDone }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [hasExistingCreds, setHasExistingCreds] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`${API_BASE_URL}/auth/webauthn/register-options`, { method: 'GET', headers: getAuthHeaders(token) })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.excludeCredentials?.length > 0) setHasExistingCreds(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token]);

  const handleRegisterPasskey = async () => {
    if (!token) return;
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const optionsRes = await fetch(`${API_BASE_URL}/auth/webauthn/register-options`, {
        method: 'GET',
        headers: getAuthHeaders(token)
      });
      const optionsData = await optionsRes.json();
      if (!optionsRes.ok) {
        setError(optionsData.message || 'Could not start passkey registration.');
        return;
      }
      const publicKey = toRegistrationOptions(optionsData);
      let credential;
      try {
        credential = await navigator.credentials.create({ publicKey });
      } catch (createErr) {
        const msg = createErr?.message ?? '';
        const isAlreadyRegistered =
          createErr?.name === 'NotAllowedError' ||
          /already registered|credentials? already|authenticator.*contains.*credentials?/i.test(msg);
        if (isAlreadyRegistered) {
          setError('This device is already set up for fingerprint login. Use Sign in with passkey on the login page.');
          return;
        }
        throw createErr;
      }
      if (!credential) {
        setError('Registration was cancelled.');
        return;
      }
      const verifyRes = await fetch(`${API_BASE_URL}/auth/webauthn/register-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(token)
        },
        body: JSON.stringify(registrationCredentialToJSON(credential))
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyData.message || 'Verification failed.');
        return;
      }
      setMessage(verifyData.message || 'Fingerprint login enabled.');
      onDone?.();
    } catch (err) {
      setError(err.message || 'Passkey registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!supportsWebAuthn()) return null;

  const buttonLabel = hasExistingCreds ? 'Add fingerprint login' : 'Enable fingerprint login';

  return (
    <div style={{ marginTop: '1rem' }}>
      <Button
        type="button"
        variant="secondary"
        onClick={handleRegisterPasskey}
        disabled={loading}
        style={{ minHeight: '44px', fontSize: '1rem' }}
      >
        {loading ? 'Registering…' : buttonLabel}
      </Button>
      {message && <p style={{ margin: '0.5rem 0 0 0', color: 'var(--success-text, #166534)', fontSize: '0.95rem' }}>{message}</p>}
      {error && <p style={{ margin: '0.5rem 0 0 0', color: 'var(--error-text, #b91c1c)', fontSize: '0.95rem' }}>{error}</p>}
    </div>
  );
}

export default PasskeyRegister;
