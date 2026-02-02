import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { colors, radii, spacing } from '../design/tokens';
import { API_BASE_URL, getAuthHeaders } from '../api';

const cardStyle = {
  padding: spacing.xl,
  borderRadius: radii.card,
  border: `1px solid ${colors.borderSubtle}`,
  background: colors.surfaceSoft,
  marginBottom: spacing.lg
};

// AccuWeather icons: backend returns iconUrl, fallback for icon number
const getWeatherIconUrl = (icon, iconUrlFromApi) =>
  iconUrlFromApi || `https://developer.accuweather.com/sites/default/files/${String(icon || '01').padStart(2, '0')}-s.png`;

function WeatherPage() {
  const { token } = useOutletContext();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/weather/current`, {
          headers: getAuthHeaders(token)
        });
        if (!isMounted) return;
        const data = await res.json();
        if (res.ok) {
          setWeather(data);
        } else {
          setError(data.message || 'Failed to load weather.');
        }
      } catch {
        if (isMounted) setError('Unable to reach the server.');
      }
      if (isMounted) setLoading(false);
    }
    load();
    return () => { isMounted = false; };
  }, [token]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div>
      <Link to="/" style={{ display: 'inline-block', marginBottom: '1rem', color: colors.primary, textDecoration: 'none', fontWeight: 500 }}>
        Back to Dashboard
      </Link>
      <h2 style={{ marginTop: 0, fontSize: '1.5rem', textAlign: 'center' }}>Today&apos;s Weather</h2>
      <p style={{ textAlign: 'center', color: colors.textMuted, marginBottom: spacing.lg }}>{today}</p>

      {loading && <p style={{ textAlign: 'center', color: colors.textMuted }}>Loading weather...</p>}
      {error && <p style={{ textAlign: 'center', color: colors.errorText }}>{error}</p>}

      {weather && (
        <>
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
              <img src={getWeatherIconUrl(weather.icon, weather.iconUrl)} alt={weather.condition} style={{ width: 80, height: 80 }} />
              <div>
                <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: 700 }}>{weather.temp}°C</p>
                <p style={{ margin: 0, color: colors.textMuted }}>Feels like {weather.feelsLike}°C</p>
              </div>
            </div>
            <p style={{ margin: `${spacing.md} 0 0 0`, fontSize: '1.25rem', fontWeight: 600 }}>{weather.condition}</p>
            <p style={{ margin: 0, color: colors.textMuted, textTransform: 'capitalize' }}>{weather.description}</p>
            <p style={{ margin: `${spacing.sm} 0 0 0`, color: colors.textMuted, fontSize: '1rem' }}>{weather.city}</p>
          </div>

          <div style={{ ...cardStyle }}>
            <h3 style={{ marginTop: 0, marginBottom: spacing.md, fontSize: '1.1rem' }}>Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: spacing.md }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>{weather.humidity}%</p>
                <p style={{ margin: 0, color: colors.textMuted, fontSize: '0.9rem' }}>Humidity</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>{weather.windSpeed} km/h</p>
                <p style={{ margin: 0, color: colors.textMuted, fontSize: '0.9rem' }}>Wind</p>
              </div>
            </div>
          </div>

          {weather.walkingTip && (
            <div style={{
              ...cardStyle,
              background: weather.walkingTip.suitable ? colors.successBg : colors.warningBg,
              borderColor: weather.walkingTip.suitable ? colors.successText : colors.warningText
            }}>
              <h3 style={{ marginTop: 0, marginBottom: spacing.sm, fontSize: '1.1rem', color: weather.walkingTip.suitable ? colors.successText : colors.warningText }}>
                Walking Recommendation
              </h3>
              <p style={{ margin: 0, fontSize: '1rem', color: weather.walkingTip.suitable ? colors.successText : colors.warningText }}>
                {weather.walkingTip.message}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default WeatherPage;
