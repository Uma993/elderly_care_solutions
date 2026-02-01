import React from 'react';
import { timelineTheme, colors, spacing } from '../../design/tokens';

const typeColors = {
  medicine: timelineTheme.timelineMedicine,
  task: timelineTheme.timelineTask,
  reminder: timelineTheme.timelineReminder,
  checklist: timelineTheme.timelineChecklist
};

const typeIcons = {
  medicine: '\u26C7', // pill / medicine
  task: '\u2713',    // check
  reminder: '\u23F0', // alarm
  checklist: '\u2630' // list
};

function EventBlock({ type, title, subtitle, time, done, onToggle, onClick, fillPercent }) {
  const color = typeColors[type] || timelineTheme.timelineChecklist;
  const icon = typeIcons[type] || '\u2022';
  const percent = fillPercent != null ? Math.min(100, Math.max(0, fillPercent)) : (done ? 100 : null);
  const showFill = percent != null && percent < 100;

  return (
    <div
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing.md,
        padding: `${spacing.sm} 0`,
        borderBottom: `1px dotted ${timelineTheme.timelineDotLine}`,
        cursor: onClick ? 'pointer' : 'default',
        minHeight: '3rem',
        fontFamily: timelineTheme.timelineFontFamily
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: showFill
            ? `conic-gradient(${color} 0% ${percent}%, ${timelineTheme.timelineSurface} ${percent}% 100%)`
            : color,
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.1rem',
          flexShrink: 0
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: '1rem',
            color: timelineTheme.timelineText
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: '0.9rem',
              fontWeight: 400,
              color: timelineTheme.timelineTextMuted,
              marginTop: '0.15rem'
            }}
          >
            {subtitle}
          </div>
        )}
        {time && (
          <div
            style={{
              fontSize: '0.85rem',
              fontWeight: 500,
              color: timelineTheme.timelineTextMuted,
              marginTop: '0.2rem'
            }}
          >
            {time}
          </div>
        )}
      </div>
      {onToggle != null && (
        <button
          type="button"
          aria-label={done ? 'Mark not done' : 'Mark done'}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: `2px solid ${done ? colors.successText : timelineTheme.timelineBorder}`,
            background: done ? colors.successBg : 'transparent',
            cursor: 'pointer',
            flexShrink: 0,
            marginTop: 2
          }}
        />
      )}
    </div>
  );
}

export default EventBlock;
