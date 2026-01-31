import React from 'react';
import { useSearchParams } from 'react-router-dom';

function SosAlertPage() {
  const [searchParams] = useSearchParams();
  const elderName = searchParams.get('elderName') || 'Elder';
  const time = searchParams.get('time') || '';
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const hasLocation = lat != null && lat !== '' && lng != null && lng !== '';

  const mapUrl = hasLocation
    ? `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`
    : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(180deg, #8b0000 0%, #4a0000 100%)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        boxSizing: 'border-box'
      }}
    >
      <h1
        style={{
          fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
          margin: '0 0 0.5rem',
          fontWeight: 700
        }}
      >
        SOS
      </h1>
      <p style={{ fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', margin: '0 0 1rem' }}>
        {elderName} needs help
      </p>
      {time && (
        <p style={{ fontSize: '1rem', opacity: 0.9, margin: '0 0 1rem' }}>
          Time: {new Date(time).toLocaleString()}
        </p>
      )}
      {hasLocation && (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ fontSize: '0.95rem', opacity: 0.9, margin: '0 0 0.5rem' }}>
            Location: {lat}, {lng}
          </p>
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: '#fff',
              color: '#8b0000',
              borderRadius: '8px',
              fontWeight: 600,
              textDecoration: 'none',
              marginTop: '0.5rem'
            }}
          >
            Open in map
          </a>
        </div>
      )}
      <a
        href="/"
        style={{
          display: 'inline-block',
          marginTop: '2rem',
          padding: '0.5rem 1rem',
          color: 'rgba(255,255,255,0.9)',
          textDecoration: 'underline'
        }}
      >
        Back to app
      </a>
    </div>
  );
}

export default SosAlertPage;
