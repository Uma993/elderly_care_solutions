import React from 'react';
import { colors, radii, spacing } from '../../design/tokens';

function Card({ children, style }) {
  const cardStyle = {
    width: '100%',
    maxWidth: '520px',
    background: colors.surface,
    borderRadius: radii.card,
    padding: spacing['2xl'],
    boxShadow: '0 24px 60px rgba(0,0,0,0.65)',
    border: `1px solid ${colors.borderSubtle}`,
    ...style
  };

  return <main style={cardStyle}>{children}</main>;
}

export default Card;

