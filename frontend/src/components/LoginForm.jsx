import React, { useState } from 'react';
import Button from './ui/Button.jsx';
import { toAuthenticationOptions, credentialToJSON, supportsWebAuthn } from '../webauthnHelpers.js';

function LoginForm({ apiBaseUrl, onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  const handlePasskeySignIn = async () => {
    const emailTrim = email.trim();
    if (!emailTrim) {
      setError('Enter your email to sign in with passkey.');
      return;
    }
    setError('');
    setPasskeyLoading(true);
    try {
      const optionsRes = await fetch(`${apiBaseUrl}/auth/webauthn/login-options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrim })
      });
      const optionsData = await optionsRes.json();
      if (!optionsRes.ok) {
        setError(optionsData.message || 'Could not start passkey sign-in.');
        return;
      }
      const publicKey = toAuthenticationOptions(optionsData);
      const credential = await navigator.credentials.get({ publicKey });
      if (!credential) {
        setError('Passkey sign-in was cancelled.');
        return;
      }
      const verifyRes = await fetch(`${apiBaseUrl}/auth/webauthn/login-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentialToJSON(credential))
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyData.message || 'Passkey verification failed.');
        return;
      }
      onSuccess?.(verifyData.user, verifyData.message, verifyData.token);
    } catch (err) {
      setError(err.message || 'Passkey sign-in failed. Try password instead.');
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'Login failed. Please try again.');
      } else {
        onSuccess?.(data.user, data.message, data.token);
      }
    } catch (err) {
      setError('Unable to reach the server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="login-email">Email address</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <p className="error-message">{error}</p>}

      <Button type="submit" disabled={loading} style={{ minHeight: '52px', fontSize: '1.15rem', marginTop: '0.5rem' }}>
        {loading ? 'Logging in…' : 'Log in'}
      </Button>

      {supportsWebAuthn() && (
        <Button
          type="button"
          variant="secondary"
          onClick={handlePasskeySignIn}
          disabled={passkeyLoading || loading}
          style={{ minHeight: '52px', fontSize: '1.15rem', marginTop: '0.5rem' }}
        >
          {passkeyLoading ? 'Signing in…' : 'Sign in with passkey'}
        </Button>
      )}
    </form>
  );
}

export default LoginForm;

