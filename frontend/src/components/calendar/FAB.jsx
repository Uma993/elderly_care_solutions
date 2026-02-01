import React, { useState } from 'react';
import { colors, timelineTheme, radii, spacing } from '../../design/tokens';

function FAB({ selectedDate, onAddReminder, onAddChecklist, onReminderStateChange }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null);
  const [text, setText] = useState('');
  const [at, setAt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmitReminder = async (e) => {
    e.preventDefault();
    if (!text.trim() || loading || !onAddReminder) return;
    setLoading(true);
    onReminderStateChange?.('pending');
    try {
      await onAddReminder({ text: text.trim(), at: at.trim(), date: selectedDate });
      setText('');
      setAt('');
      setMode(null);
      setOpen(false);
    } catch (_) {}
    setLoading(false);
  };

  const handleSubmitChecklist = async (e) => {
    e.preventDefault();
    if (!text.trim() || loading || !onAddChecklist) return;
    setLoading(true);
    try {
      await onAddChecklist({ text: text.trim(), date: selectedDate });
      setText('');
      setMode(null);
      setOpen(false);
    } catch (_) {}
    setLoading(false);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Add event"
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: 'none',
          background: timelineTheme.timelineFAB,
          color: '#ffffff',
          fontSize: '1.5rem',
          fontWeight: 300,
          fontFamily: timelineTheme.timelineFontFamily,
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(225, 29, 72, 0.4)',
          zIndex: 100
        }}
      >
        +
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 101,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center'
          }}
          onClick={() => !mode && setOpen(false)}
          role="presentation"
        >
          <div
            style={{
              background: colors.surface,
              borderTopLeftRadius: radii.card,
              borderTopRightRadius: radii.card,
              padding: spacing.lg,
              width: '100%',
              maxWidth: 400,
              maxHeight: '70vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {!mode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                <p style={{ margin: 0, fontSize: '1rem', color: colors.text, fontFamily: timelineTheme.timelineFontFamily }}>Add for {selectedDate}</p>
                <button
                  type="button"
                  onClick={() => setMode('reminder')}
                  style={{
                    padding: spacing.md,
                    borderRadius: radii.button,
                    border: `1px solid ${colors.borderSubtle}`,
                    background: colors.surfaceSoft,
                    cursor: 'pointer',
                    fontSize: '1rem',
                    textAlign: 'left'
                  }}
                >
                  Add reminder
                </button>
                <button
                  type="button"
                  onClick={() => setMode('checklist')}
                  style={{
                    padding: spacing.md,
                    borderRadius: radii.button,
                    border: `1px solid ${colors.borderSubtle}`,
                    background: colors.surfaceSoft,
                    cursor: 'pointer',
                    fontSize: '1rem',
                    textAlign: 'left'
                  }}
                >
                  Add to list
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    padding: spacing.sm,
                    border: 'none',
                    background: 'transparent',
                    color: colors.textMuted,
                    cursor: 'pointer',
                    fontSize: '0.95rem'
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : mode === 'reminder' ? (
              <form onSubmit={handleSubmitReminder}>
                <h3 style={{ marginTop: 0, marginBottom: spacing.md, fontFamily: timelineTheme.timelineFontFamily, fontWeight: 700 }}>Add reminder</h3>
                <input
                  type="text"
                  placeholder="What to remind"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: spacing.sm,
                    marginBottom: spacing.sm,
                    border: `1px solid ${colors.borderSubtle}`,
                    borderRadius: radii.button,
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                />
                <input
                  type="text"
                  placeholder="Time (e.g. 17:00)"
                  value={at}
                  onChange={(e) => setAt(e.target.value)}
                  style={{
                    width: '100%',
                    padding: spacing.sm,
                    marginBottom: spacing.md,
                    border: `1px solid ${colors.borderSubtle}`,
                    borderRadius: radii.button,
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ display: 'flex', gap: spacing.sm }}>
                  <button
                    type="button"
                    onClick={() => { setMode(null); setText(''); setAt(''); }}
                    style={{
                      padding: `${spacing.sm} ${spacing.md}`,
                      border: `1px solid ${colors.borderSubtle}`,
                      borderRadius: radii.button,
                      background: colors.surfaceSoft,
                      cursor: 'pointer'
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={!text.trim() || loading}
                    style={{
                      padding: `${spacing.sm} ${spacing.md}`,
                      border: 'none',
                      borderRadius: radii.button,
                      background: colors.primary,
                      color: colors.surface,
                      cursor: loading ? 'wait' : 'pointer'
                    }}
                  >
                    {loading ? '…' : 'Add reminder'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmitChecklist}>
                <h3 style={{ marginTop: 0, marginBottom: spacing.md, fontFamily: timelineTheme.timelineFontFamily, fontWeight: 700 }}>Add to list</h3>
                <input
                  type="text"
                  placeholder="To-do item"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: spacing.sm,
                    marginBottom: spacing.md,
                    border: `1px solid ${colors.borderSubtle}`,
                    borderRadius: radii.button,
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ display: 'flex', gap: spacing.sm }}>
                  <button
                    type="button"
                    onClick={() => { setMode(null); setText(''); }}
                    style={{
                      padding: `${spacing.sm} ${spacing.md}`,
                      border: `1px solid ${colors.borderSubtle}`,
                      borderRadius: radii.button,
                      background: colors.surfaceSoft,
                      cursor: 'pointer'
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={!text.trim() || loading}
                    style={{
                      padding: `${spacing.sm} ${spacing.md}`,
                      border: 'none',
                      borderRadius: radii.button,
                      background: colors.primary,
                      color: colors.surface,
                      cursor: loading ? 'wait' : 'pointer'
                    }}
                  >
                    {loading ? '…' : 'Add'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default FAB;
