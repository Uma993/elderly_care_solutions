import React, { useMemo } from 'react';
import { timelineTheme, spacing, radii } from '../../design/tokens';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthGrid(viewDate) {
  const first = new Date(viewDate + 'T12:00:00');
  const y = first.getFullYear();
  const m = first.getMonth();
  const firstDayOfWeek = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const rows = [];
  let row = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    const prevMonth = new Date(y, m, 0);
    prevMonth.setDate(prevMonth.getDate() - (firstDayOfWeek - 1 - i));
    row.push({ dateStr: prevMonth.toISOString().slice(0, 10), isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    row.push({ dateStr, isCurrentMonth: true });
    if (row.length === 7) {
      rows.push(row);
      row = [];
    }
  }
  if (row.length > 0) {
    let nextD = 1;
    while (row.length < 7) {
      const nextMonth = new Date(y, m + 1, nextD);
      row.push({
        dateStr: nextMonth.toISOString().slice(0, 10),
        isCurrentMonth: false
      });
      nextD++;
    }
    rows.push(row);
  }
  return rows;
}

function getMonthYearLabel(viewDate) {
  const d = new Date(viewDate + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function MonthCalendar({ viewDate, selectedDate, onSelectDate, onPrevMonth, onNextMonth, eventCountByDay }) {
  const grid = useMemo(() => getMonthGrid(viewDate), [viewDate]);
  const monthYear = getMonthYearLabel(viewDate);
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <div style={{ fontFamily: timelineTheme.timelineFontFamily, marginBottom: spacing.lg }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.md
        }}
      >
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label="Previous month"
          style={{
            background: timelineTheme.timelineSurface,
            border: `1px solid ${timelineTheme.timelineBorder}`,
            color: timelineTheme.timelineText,
            borderRadius: radii.card,
            padding: `${spacing.sm} ${spacing.md}`,
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 600
          }}
        >
          ←
        </button>
        <div
          style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            color: timelineTheme.timelineText
          }}
        >
          {monthYear}
        </div>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="Next month"
          style={{
            background: timelineTheme.timelineSurface,
            border: `1px solid ${timelineTheme.timelineBorder}`,
            color: timelineTheme.timelineText,
            borderRadius: radii.card,
            padding: `${spacing.sm} ${spacing.md}`,
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 600
          }}
        >
          →
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 2,
          fontSize: '0.75rem'
        }}
      >
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            style={{
              textAlign: 'center',
              fontWeight: 600,
              color: timelineTheme.timelineTextMuted,
              padding: spacing.xs
            }}
          >
            {label}
          </div>
        ))}
        {grid.flat().map(({ dateStr, isCurrentMonth }) => {
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const counts = eventCountByDay?.[dateStr] || { medicines: 0, tasks: 0, reminders: 0, checklist: 0 };
          const hasEvents =
            counts.medicines > 0 || counts.tasks > 0 || counts.reminders > 0 || counts.checklist > 0;
          const d = new Date(dateStr + 'T12:00:00');
          const dayNum = d.getDate();

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 40,
                padding: spacing.xs,
                border: 'none',
                borderRadius: 6,
                background: isSelected
                  ? timelineTheme.timelineSelectedDayBg
                  : isCurrentMonth
                    ? 'transparent'
                    : timelineTheme.timelineSurface,
                color: isSelected
                  ? timelineTheme.timelineSelectedDayText
                  : isCurrentMonth
                    ? timelineTheme.timelineText
                    : timelineTheme.timelineTextMuted,
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: isToday ? 700 : 500,
                fontFamily: timelineTheme.timelineFontFamily,
                opacity: isCurrentMonth ? 1 : 0.6,
                boxShadow: isToday && !isSelected ? `0 0 0 2px ${timelineTheme.timelineTask}` : 'none'
              }}
            >
              <span>{dayNum}</span>
              {hasEvents && (
                <div
                  style={{
                    display: 'flex',
                    gap: 2,
                    marginTop: 2,
                    flexWrap: 'wrap',
                    justifyContent: 'center'
                  }}
                >
                  {counts.medicines > 0 && (
                    <span
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: timelineTheme.timelineMedicine
                      }}
                      aria-hidden
                    />
                  )}
                  {counts.tasks > 0 && (
                    <span
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: timelineTheme.timelineTask
                      }}
                      aria-hidden
                    />
                  )}
                  {counts.reminders > 0 && (
                    <span
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: timelineTheme.timelineReminder
                      }}
                      aria-hidden
                    />
                  )}
                  {counts.checklist > 0 && (
                    <span
                      style={{
                        width: 4,
                        height: 4,
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

export default MonthCalendar;
