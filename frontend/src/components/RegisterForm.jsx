import React, { useState } from 'react';

function RegisterForm({ apiBaseUrl, onRegistered }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('elderly');
  const [relation, setRelation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!fullName || !email || !password || !confirmPassword || !role) {
      return 'Please fill in all required fields.';
    }
    if (!email.includes('@')) {
      return 'Please enter a valid email address.';
    }
    if (password.length < 6) {
      return 'Password should be at least 6 characters long.';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }
    if (role === 'family' && !relation) {
      return 'Please specify your relation for family members.';
    }
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName,
          email,
          password,
          confirmPassword,
          role,
          phone,
          relation
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'Registration failed. Please try again.');
      } else {
        onRegistered?.(data.message);
        // Clear the form a bit
        setPassword('');
        setConfirmPassword('');
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
        <label htmlFor="register-full-name">Full name</label>
        <input
          id="register-full-name"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="register-email">Email address</label>
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="register-phone">Phone (optional)</label>
        <input
          id="register-phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="role-group">
        <span>Registering as</span>
        <div className="role-options">
          <label>
            <input
              type="radio"
              name="role"
              value="elderly"
              checked={role === 'elderly'}
              onChange={() => setRole('elderly')}
            />{' '}
            Elderly user
          </label>
          <label>
            <input
              type="radio"
              name="role"
              value="family"
              checked={role === 'family'}
              onChange={() => setRole('family')}
            />{' '}
            Family member
          </label>
        </div>
      </div>

      {role === 'family' && (
        <div>
          <label htmlFor="register-relation">Relation (e.g. daughter, son)</label>
          <input
            id="register-relation"
            type="text"
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
          />
        </div>
      )}

      <div>
        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="register-confirm-password">Confirm password</label>
        <input
          id="register-confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      {error && <p className="error-message">{error}</p>}

      <button className="primary-button" type="submit" disabled={loading}>
        {loading ? 'Registering…' : 'Create account'}
      </button>
    </form>
  );
}

export default RegisterForm;

