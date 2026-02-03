import React from 'react';
import { colors } from '../design/tokens';

/**
 * Placeholder for a route until the real page is implemented. Shows title.
 */
function PlaceholderPage({ title }) {
  return (
    <div>
      <h2 style={{ marginTop: 0, fontSize: '1.5rem' }}>{title}</h2>
      <p style={{ color: colors.textMuted }}>Content for this page will be added next.</p>
    </div>
  );
}

export default PlaceholderPage;
