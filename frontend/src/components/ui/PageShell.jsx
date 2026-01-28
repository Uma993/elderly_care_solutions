import React from 'react';
import { colors, spacing, typography } from '../../design/tokens';

function PageShell({ title, subtitle, children, actions }) {
  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: `${spacing['2xl']} ${spacing.md}`,
    background: `radial-gradient(circle at top, #1d4ed8 0, ${colors.background} 50%, #020617 100%)`,
    color: colors.text,
    fontFamily: typography.fontFamily
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: spacing.xl,
    maxWidth: '640px'
  };

  const titleStyle = {
    fontSize: typography.heading1,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginBottom: spacing.sm
  };

  const subtitleStyle = {
    margin: 0,
    color: colors.textMuted,
    fontSize: '1.02rem'
  };

  const actionsStyle = {
    marginTop: spacing.sm
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h1 style={titleStyle}>{title}</h1>
        {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
        {actions && <div style={actionsStyle}>{actions}</div>}
      </header>
      {children}
    </div>
  );
}

export default PageShell;

