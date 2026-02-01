import React, { useMemo, useState, useEffect } from 'react';
import EventBlock from './EventBlock';
import { timelineTheme, spacing } from '../../design/tokens';

function parseTimeToMinutes(str) {
  if (!str || typeof str !== 'string') return -1;
  const trimmed = str.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (match) return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  const match12 = trimmed.match(/^(\d{1,2})\s*(am|pm)/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    if (match12[2].toLowerCase() === 'pm' && h < 12) h += 12;
    if (match12[2].toLowerCase() === 'am' && h === 12) h = 0;
    return h * 60;
  }
  return -1;
}

function formatTime(str) {
  if (!str || typeof str !== 'string') return '';
  const m = parseTimeToMinutes(str);
  if (m < 0) return str;
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0 && min === 0) return 'All day';
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

/** Format minutes-since-midnight as 12h AM/PM (e.g. 780 -> "01:00 PM") */
function formatTime12h(minutes) {
  if (minutes < 0) return '–';
  if (minutes === 0) return 'All day';
  const h24 = Math.floor(minutes / 60);
  const min = minutes % 60;
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  return `${h12}:${min.toString().padStart(2, '0')} ${ampm}`;
}

const DEFAULT_DURATION_MINUTES = 5;

function DailyTimeline({
  date,
  medicines,
  tasks,
  reminders,
  checklist,
  medicineIntakeLogs,
  onMarkTaken,
  onTaskComplete,
  onReminderDone,
  onToggleTodo,
  readOnly = false
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [currentMinutesNow, setCurrentMinutesNow] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setCurrentMinutesNow(n.getHours() * 60 + n.getMinutes());
    };
    tick();
    const id = setInterval(tick, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const events = useMemo(() => {
    const list = [];
    const isToday = date === today;

    const takenForDate = new Set(
      (medicineIntakeLogs || [])
        .filter((log) => log.date === date && log.medicineId)
        .map((log) => log.medicineId)
    );

    (medicines || []).forEach((m) => {
      const times = Array.isArray(m.times) ? m.times : m.time ? [m.time] : [''];
      const canMarkTaken = !readOnly && isToday && onMarkTaken;
      times.forEach((t) => {
        const timeStr = typeof t === 'string' ? t.trim() : '';
        const sortMin = parseTimeToMinutes(timeStr) >= 0 ? parseTimeToMinutes(timeStr) : 0;
        const endMin = sortMin + DEFAULT_DURATION_MINUTES;
        let fillPercent = null;
        if (isToday && timeStr && sortMin >= 0) {
          if (takenForDate.has(m.id)) fillPercent = 100;
          else {
            const p = ((currentMinutesNow - sortMin) / (endMin - sortMin)) * 100;
            fillPercent = Math.min(100, Math.max(0, p));
          }
        }
        list.push({
          key: `med-${m.id}-${timeStr}`,
          type: 'medicine',
          title: m.name,
          subtitle: m.dosage ? m.dosage : undefined,
          time: timeStr ? `${formatTime12h(sortMin)} (${DEFAULT_DURATION_MINUTES} min)` : 'All day',
          timeDisplay12h: timeStr ? formatTime12h(sortMin) : 'All day',
          sortMinutes: sortMin,
          done: takenForDate.has(m.id),
          onToggle: canMarkTaken ? () => onMarkTaken(m.id) : undefined,
          fillPercent,
          payload: m
        });
      });
    });

    (tasks || []).forEach((t) => {
      const taskDate = t.date || '';
      if (taskDate && taskDate !== date) return;
      if (!taskDate && !isToday) return;
      const taskSortMin = parseTimeToMinutes(t.time) >= 0 ? parseTimeToMinutes(t.time) : 0;
      const endMin = taskSortMin + DEFAULT_DURATION_MINUTES;
      let fillPercent = null;
      if (isToday && t.time && taskSortMin >= 0 && !t.completed) {
        const p = ((currentMinutesNow - taskSortMin) / (endMin - taskSortMin)) * 100;
        fillPercent = Math.min(100, Math.max(0, p));
      } else if (t.completed) fillPercent = 100;
      list.push({
        key: `task-${t.id}`,
        type: 'task',
        title: t.title || 'Task',
        subtitle: t.description || undefined,
        time: t.time ? `${formatTime12h(taskSortMin)} (${DEFAULT_DURATION_MINUTES} min)` : '',
        timeDisplay12h: t.time ? formatTime12h(taskSortMin) : '–',
        sortMinutes: taskSortMin,
        done: !!t.completed,
        onToggle: !readOnly ? () => onTaskComplete && onTaskComplete(t.id) : undefined,
        fillPercent,
        payload: t
      });
    });

    (reminders || []).forEach((r) => {
      const remDate = r.date || '';
      if (remDate && remDate !== date) return;
      if (!remDate && !isToday) return;
      const remSortMin = parseTimeToMinutes(r.at) >= 0 ? parseTimeToMinutes(r.at) : 0;
      const endMin = remSortMin + DEFAULT_DURATION_MINUTES;
      let fillPercent = null;
      if (isToday && r.at && remSortMin >= 0 && !r.done) {
        const p = ((currentMinutesNow - remSortMin) / (endMin - remSortMin)) * 100;
        fillPercent = Math.min(100, Math.max(0, p));
      } else if (r.done) fillPercent = 100;
      list.push({
        key: `rem-${r.id}`,
        type: 'reminder',
        title: r.text || 'Reminder',
        subtitle: undefined,
        time: r.at ? `${formatTime12h(remSortMin)} (${DEFAULT_DURATION_MINUTES} min)` : '',
        timeDisplay12h: r.at ? formatTime12h(remSortMin) : '–',
        sortMinutes: remSortMin,
        done: !!r.done,
        onToggle: !readOnly ? () => onReminderDone && onReminderDone(r.id, !r.done) : undefined,
        fillPercent,
        payload: r
      });
    });

    (checklist || []).forEach((c) => {
      const createdDate = c.createdAt ? c.createdAt.slice(0, 10) : '';
      if (createdDate && createdDate !== date) return;
      if (!createdDate && !isToday) return;
      list.push({
        key: `check-${c.id}`,
        type: 'checklist',
        title: c.text || 'To-do',
        subtitle: undefined,
        time: '',
        timeDisplay12h: 'All day',
        sortMinutes: 0,
        done: !!c.done,
        onToggle: !readOnly ? () => onToggleTodo && onToggleTodo(c.id) : undefined,
        fillPercent: c.done ? 100 : null,
        payload: c
      });
    });

    list.sort((a, b) => {
      if (a.sortMinutes !== b.sortMinutes) return a.sortMinutes - b.sortMinutes;
      return a.key.localeCompare(b.key);
    });
    return list;
  }, [
    date,
    today,
    medicines,
    tasks,
    reminders,
    checklist,
    medicineIntakeLogs,
    onMarkTaken,
    onTaskComplete,
    onReminderDone,
    onToggleTodo,
    readOnly,
    currentMinutesNow
  ]);

  return (
    <div style={{ position: 'relative', fontFamily: timelineTheme.timelineFontFamily }}>
      <div
        style={{
          position: 'absolute',
          left: '4rem',
          top: 0,
          bottom: 0,
          width: 2,
          borderLeft: `2px dotted ${timelineTheme.timelineDotLine}`
        }}
        aria-hidden
      />
      {events.length === 0 && (
        <p
          style={{
            color: timelineTheme.timelineTextMuted,
            fontSize: '0.95rem',
            padding: spacing.lg,
            fontFamily: timelineTheme.timelineFontFamily
          }}
        >
          No events for this day. Use the + button to add a reminder or to-do.
        </p>
      )}
      {events.map((ev) => (
        <div
          key={ev.key}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 0,
            minHeight: '3rem'
          }}
        >
          <div
            style={{
              width: '4rem',
              flexShrink: 0,
              fontSize: '0.85rem',
              fontWeight: 500,
              color: timelineTheme.timelineTextMuted,
              paddingTop: spacing.sm,
              paddingRight: spacing.sm,
              textAlign: 'right'
            }}
          >
            {ev.timeDisplay12h || '–'}
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingLeft: spacing.md }}>
            <EventBlock
              type={ev.type}
              title={ev.title}
              subtitle={ev.subtitle}
              time={ev.time}
              done={ev.done}
              onToggle={ev.onToggle}
              fillPercent={ev.fillPercent}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default DailyTimeline;
