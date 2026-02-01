import React from 'react';
import { colors, radii, spacing } from '../../design/tokens';

function Card({ children, style, variant }) {
  const isGlass = variant === 'glass';
  const cardStyle = {
    width: '100%',
    maxWidth: '520px',
    background: isGlass ? 'rgba(255, 255, 255, 0.92)' : colors.surface,
    backdropFilter: isGlass ? 'saturate(180%) blur(12px)' : undefined,
    WebkitBackdropFilter: isGlass ? 'saturate(180%) blur(12px)' : undefined,
    borderRadius: radii.card,
    padding: spacing['2xl'],
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    border: `1px solid ${colors.borderSubtle}`,
    ...style
  };

  return <main style={cardStyle}>{children}</main>;
}

export default Card;

