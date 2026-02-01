import React from 'react';
import { Link } from 'react-router-dom';
import { colors } from '../design/tokens';

/**
 * Placeholder for a route until the real page is implemented. Shows "Back to Dashboard" and title.
 */
function PlaceholderPage({ title }) {
  return (
    <div>
      <Link
        to="/"
        style={{
          display: 'inline-block',
          marginBottom: '1rem',
          fontSize: '1rem',
          color: colors.primary,
          textDecoration: 'none',
          fontWeight: 500
        }}
      >
        Back to Dashboard
      </Link>
      <h2 style={{ marginTop: 0, fontSize: '1.5rem' }}>{title}</h2>
      <p style={{ color: colors.textMuted }}>Content for this page will be added next.</p>
    </div>
  );
}

export default PlaceholderPage;
