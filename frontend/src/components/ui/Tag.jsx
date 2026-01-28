import React from 'react';
import { colors, radii, spacing } from '../../design/tokens';

function Tag({ children, tone = 'default' }) {
  let bg = colors.surfaceSoft;
  let color = colors.textMuted;

  if (tone === 'success') {
    bg = colors.successBg;
    color = colors.successText;
  } else if (tone === 'warning') {
    bg = colors.warningBg;
    color = colors.warningText;
  }

  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: radii.pill,
    background: bg,
    color,
    fontSize: '0.85rem'
  };

  return <span style={style}>{children}</span>;
}

export default Tag;

