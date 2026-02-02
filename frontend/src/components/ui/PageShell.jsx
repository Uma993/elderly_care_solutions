import React from 'react';
import { colors, spacing, typography } from '../../design/tokens';

function PageShell({ title, subtitle, children, actions, isAuthPage, authNavLabel }) {
  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: `${spacing['2xl']} ${spacing.md}`,
    paddingTop: isAuthPage ? '4.5rem' : spacing['2xl'],
    background: 'transparent',
    color: colors.text,
    fontFamily: typography.fontFamily
  };

  const topBarStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '3.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `0 ${spacing.xl}`,
    background: 'rgba(255, 255, 255, 0.95)',
    borderBottom: `1px solid ${colors.borderSubtle}`,
    zIndex: 10
  };

  const logoStyle = {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: colors.link || colors.primary,
    textDecoration: 'none'
  };

  const navStyle = {
    fontSize: '0.95rem',
    color: colors.textMuted,
    fontWeight: 500
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: spacing.xl,
    maxWidth: '640px'
  };

  const titleStyle = {
    fontSize: typography.heading1,
    letterSpacing: '0.04em',
    textTransform: isAuthPage ? 'none' : 'uppercase',
    marginBottom: spacing.sm,
    fontWeight: 700,
    color: colors.title
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
      {isAuthPage && (
        <header style={topBarStyle} role="banner">
          <span style={logoStyle}>Elderly Care</span>
          <span style={navStyle}>{authNavLabel || 'Login / Signup'}</span>
        </header>
      )}
      {!isAuthPage && (title || subtitle || actions) && (
        <header style={headerStyle}>
          <h1 style={titleStyle}>{title}</h1>
          {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
          {actions && <div style={actionsStyle}>{actions}</div>}
        </header>
      )}
      {children}
    </div>
  );
}

export default PageShell;

