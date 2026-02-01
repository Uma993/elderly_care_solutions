import React from 'react';
import { timelineTheme, spacing } from '../../design/tokens';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekDates(centerDate) {
  const d = new Date(centerDate + 'T12:00:00');
  const dayOfWeek = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - dayOfWeek);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    dates.push(x.toISOString().slice(0, 10));
  }
  return dates;
}

function getMonthYear(isoDate) {
  const d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function DayStrip({ selectedDate, onSelectDate, eventCountByDay }) {
  const weekDates = getWeekDates(selectedDate);
  const monthYear = getMonthYear(selectedDate);

  return (
    <div style={{ marginBottom: spacing.lg, fontFamily: timelineTheme.timelineFontFamily }}>
      <div
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: timelineTheme.timelineText,
          marginBottom: spacing.sm
        }}
      >
        {monthYear}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: spacing.xs,
          overflowX: 'auto',
          paddingBottom: spacing.sm
        }}
      >
        {weekDates.map((dateStr) => {
          const d = new Date(dateStr + 'T12:00:00');
          const dayLabel = DAY_LABELS[d.getDay()];
          const dayNum = d.getDate();
          const isSelected = dateStr === selectedDate;
          const counts = eventCountByDay && eventCountByDay[dateStr];
          const hasEvents = counts && (counts.medicines > 0 || counts.tasks > 0 || counts.reminders > 0 || counts.checklist > 0);

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: 44,
                padding: `${spacing.sm} ${spacing.xs}`,
                border: 'none',
                borderRadius: '50%',
                background: isSelected ? timelineTheme.timelineSelectedDayBg : 'transparent',
                color: isSelected ? timelineTheme.timelineSelectedDayText : timelineTheme.timelineText,
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
                fontFamily: timelineTheme.timelineFontFamily
              }}
            >
              <span style={{ opacity: 0.9 }}>{dayLabel}</span>
              <span style={{ fontWeight: 600, fontSize: '1rem', marginTop: 2 }}>{dayNum}</span>
              {hasEvents && (
                <div style={{ display: 'flex', gap: 2, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {counts.medicines > 0 && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: timelineTheme.timelineMedicine
                      }}
                      aria-hidden
                    />
                  )}
                  {counts.tasks > 0 && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: timelineTheme.timelineTask
                      }}
                      aria-hidden
                    />
                  )}
                  {counts.reminders > 0 && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: timelineTheme.timelineReminder
                      }}
                      aria-hidden
                    />
                  )}
                  {counts.checklist > 0 && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: timelineTheme.timelineChecklist
                      }}
                      aria-hidden
                    />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default DayStrip;
export { getWeekDates, getMonthYear };
