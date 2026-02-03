import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { colors } from '../design/tokens';
import { useFamilyElder } from '../context/FamilyElderContext.jsx';

function SosAlertsPage() {
  const { currentUser } = useOutletContext();
  const { elders } = useFamilyElder() || {};

  if (!currentUser || currentUser.role !== 'family') return null;

  const allSosAlerts = (elders || [])
    .flatMap((e) =>
      (e.sosAlerts || []).map((a) => ({
        ...a,
        elderName: a.elderName || e.name || 'Elder',
        elderId: e.id
      }))
    )
    .sort((a, b) => (b.time || '').localeCompare(a.time || ''));

  return (
    <div>
      <h2 style={{ marginTop: 0, fontSize: '1.5rem', textAlign: 'center' }}>SOS Alerts</h2>
      {allSosAlerts.length === 0 ? (
        <p style={{ color: colors.textMuted }}>No SOS alerts.</p>
      ) : (
        <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {allSosAlerts.slice(0, 20).map((alert) => {
            const hasLocation = alert.location?.lat != null && alert.location?.lng != null;
            const mapUrl = hasLocation
              ? `https://www.google.com/maps?q=${encodeURIComponent(alert.location.lat)},${encodeURIComponent(alert.location.lng)}`
              : null;
            const detailUrl = `/sos-alert?alertId=${encodeURIComponent(alert.id || '')}&elderId=${encodeURIComponent(alert.elderId || '')}&elderName=${encodeURIComponent(alert.elderName || 'Elder')}&time=${encodeURIComponent(alert.time || '')}${hasLocation ? `&lat=${encodeURIComponent(alert.location.lat)}&lng=${encodeURIComponent(alert.location.lng)}` : ''}`;
            return (
              <div
                key={alert.id || alert.time}
                className="hover-card"
                style={{
                  borderRadius: '0.8rem',
                  padding: '0.75rem 0.9rem',
                  border: `2px solid ${colors.errorText}`,
                  background: colors.surfaceSoft,
                  fontWeight: 600,
                  fontSize: '1rem',
                  color: colors.text
                }}
              >
                <span style={{ color: colors.errorText }}>SOS</span> — {alert.elderName || 'Elder'} · {alert.time ? new Date(alert.time).toLocaleString() : '—'}
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Link
                    to={detailUrl}
                    style={{
                      fontSize: '0.95rem',
                      color: colors.primary,
                      fontWeight: 500,
                      textDecoration: 'none'
                    }}
                  >
                    View details
                  </Link>
                  {mapUrl && (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.95rem', color: colors.primary, fontWeight: 500 }}
                    >
                      Open in map
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SosAlertsPage;
