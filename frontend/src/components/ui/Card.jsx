import React from 'react';
import { colors, radii, spacing } from '../../design/tokens';

function Card({ children, style, variant, className }) {
  const isGlass = variant === 'glass';
  const isWarm = variant === 'warm';
  const cardStyle = {
    width: '100%',
    maxWidth: '520px',
    background: isWarm ? colors.cardYellow : isGlass ? 'rgba(255, 255, 255, 0.92)' : colors.surface,
    backdropFilter: isGlass ? 'saturate(180%) blur(12px)' : undefined,
    WebkitBackdropFilter: isGlass ? 'saturate(180%) blur(12px)' : undefined,
    borderRadius: isWarm ? '1.25rem' : radii.card,
    padding: spacing['2xl'],
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    border: `1px solid ${colors.borderSubtle}`,
    position: 'relative',
    zIndex: 1,
    ...style
  };

  return <main className={className} style={cardStyle}>{children}</main>;
}

export default Card;

