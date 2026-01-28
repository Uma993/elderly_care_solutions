import React from 'react';
import { colors, radii, spacing, typography } from '../../design/tokens';

const baseStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  padding: `${spacing.md} ${spacing.lg}`,
  borderRadius: radii.button,
  border: 'none',
  fontSize: typography.baseSize,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.15s ease, transform 0.05s ease',
  marginTop: spacing.md
};

function Button({ children, variant = 'primary', disabled, style, ...rest }) {
  let background = colors.primary;
  let color = colors.surfaceSoft;

  if (variant === 'secondary') {
    background = 'transparent';
    color = colors.text;
  } else if (variant === 'danger') {
    background = '#ef4444';
    color = '#fef2f2';
  }

  const computedStyle = {
    ...baseStyle,
    background,
    color,
    opacity: disabled ? 0.6 : 1,
    ...(variant === 'secondary'
      ? {
          border: `1px solid ${colors.borderSubtle}`
        }
      : {}),
    ...style
  };

  return (
    <button type="button" {...rest} disabled={disabled} style={computedStyle}>
      {children}
    </button>
  );
}

export default Button;

