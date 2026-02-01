import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { API_BASE_URL, getAuthHeaders } from '../api';
import { useFamilyElder } from '../context/FamilyElderContext.jsx';
import { colors } from '../design/tokens';

const RANGE_OPTIONS = [7, 14, 30];

function RoutinePage() {
  const { currentUser, token } = useOutletContext();
  const { selectedElderId } = useFamilyElder() || {};
  const elderId = currentUser?.role === 'elderly' ? currentUser?.id : selectedElderId;

  const [rangeDays, setRangeDays] = useState(30);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!elderId || !token) {
      setData([]);
      setLoading(false);
      if (currentUser?.role === 'family' && !selectedElderId) setError('Select an elder to view routine.');
      return;
    }
    setError('');
    setLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/elders/${elderId}/routine?days=${rangeDays}`,
          { headers: getAuthHeaders(token) }
        );
        if (cancelled) return;
        if (!res.ok) {
          const msg = (await res.json().catch(() => ({}))).message || 'Failed to load routine.';
          setError(msg);
          setData([]);
          return;
        }
        const summary = await res.json();
        if (!cancelled) setData(Array.isArray(summary) ? summary : []);
      } catch {
        if (!cancelled) {
          setError('Unable to load routine.');
          setData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [elderId, token, rangeDays, currentUser?.role, selectedElderId]);

  if (!currentUser) return null;
  if (currentUser.role === 'family' && !selectedElderId) {
    return (
      <div>
        <Link to="/" style={{ fontSize: '1rem', color: colors.primary, marginBottom: '1rem', display: 'inline-block' }}>
          ← Back to Dashboard
        </Link>
        <p style={{ color: colors.textMuted }}>Select an elder from the dashboard to view their routine.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    dateLabel: d.date ? new Date(d.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : d.date
  }));

  return (
    <div>
      <Link to="/" style={{ fontSize: '1rem', color: colors.primary, marginBottom: '1rem', display: 'inline-block' }}>
        ← Back to Dashboard
      </Link>
      <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.5rem', textAlign: 'center' }}>Routine summary</h2>
      <p style={{ marginTop: 0, marginBottom: '1rem', color: colors.textMuted }}>
        Medicine adherence, task completion, and overall score over time (0–100).
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {RANGE_OPTIONS.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => setRangeDays(days)}
            style={{
              padding: '0.5rem 1rem',
              border: `2px solid ${rangeDays === days ? colors.primary : colors.borderSubtle}`,
              borderRadius: '0.5rem',
              background: rangeDays === days ? colors.primary : colors.surface,
              color: rangeDays === days ? colors.surface : colors.text,
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: rangeDays === days ? 600 : 400
            }}
          >
            {days} days
          </button>
        ))}
      </div>

      {error && <p style={{ color: colors.errorText, marginBottom: '1rem' }}>{error}</p>}
      {loading && <p style={{ color: colors.textMuted }}>Loading…</p>}

      {!loading && chartData.length > 0 && (
        <div style={{ marginTop: '1rem', width: '100%', minHeight: 320 }}>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.borderSubtle} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} stroke={colors.textMuted} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke={colors.textMuted} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload;
                  if (!row) return null;
                  return (
                    <div
                      style={{
                        background: colors.surface,
                        border: `1px solid ${colors.borderSubtle}`,
                        borderRadius: '0.5rem',
                        padding: '0.75rem 1rem',
                        fontSize: '0.9rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>{row.date}</div>
                      <div>Medicine adherence: {row.medicineAdherence ?? '—'}%</div>
                      <div>Task completion: {row.taskCompletion ?? '—'}%</div>
                      <div>Composite score: {row.compositeScore ?? '—'}%</div>
                      <div>Wellbeing logged: {row.wellbeingDone ? 'Yes' : 'No'}</div>
                    </div>
                  );
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="medicineAdherence" name="Medicine adherence %" stroke="#f97316" fill="#f97316" fillOpacity={0.3} strokeWidth={2} />
              <Area type="monotone" dataKey="taskCompletion" name="Task completion %" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} strokeWidth={2} />
              <Line type="monotone" dataKey="compositeScore" name="Composite score %" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {!loading && !error && chartData.length === 0 && (
        <p style={{ color: colors.textMuted }}>No routine data for this period.</p>
      )}
    </div>
  );
}

export default RoutinePage;
