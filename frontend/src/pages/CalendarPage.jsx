import React, { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import MonthCalendar from '../components/calendar/MonthCalendar.jsx';
import { timelineTheme, radii } from '../design/tokens';
import { getElderDashboardData } from '../firebase/dashboardData.js';
import { API_BASE_URL, getAuthHeaders } from '../api';
import { useFamilyElder } from '../context/FamilyElderContext.jsx';

const today = () => new Date().toISOString().slice(0, 10);

function CalendarPage() {
  const { currentUser, token } = useOutletContext();
  const { selectedElderId } = useFamilyElder() || {};
  const elderId = currentUser?.role === 'elderly' ? currentUser?.id : selectedElderId;
  const isElder = currentUser?.role === 'elderly';

  const [selectedDate, setSelectedDate] = useState(today());
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [medicines, setMedicines] = useState([]);
  const [medicineIntakeLogs, setMedicineIntakeLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!elderId || !token) {
      if (currentUser?.role === 'family' && !selectedElderId) return;
      setMedicines([]);
      setMedicineIntakeLogs([]);
      setTasks([]);
      if (isElder) {
        setReminders([]);
        setChecklist([]);
      }
      return;
    }
    let cancelled = false;
    (async () => {
      if (isElder) {
        try {
          const data = await getElderDashboardData(elderId, token);
          if (cancelled) return;
          if (data) {
            setMedicines(
              Array.isArray(data.medicines) && data.medicines.length > 0
                ? data.medicines.map((m) => ({
                    id: m.id,
                    name: m.title || m.name || 'Medicine',
                    dosage: m.details || m.dosage || '',
                    times: Array.isArray(m.times) ? m.times : m.time ? [m.time] : []
                  }))
                : []
            );
            setMedicineIntakeLogs(Array.isArray(data.medicineIntakeLogs) ? data.medicineIntakeLogs : []);
            setTasks(Array.isArray(data.tasks) ? data.tasks : []);
          }
        } catch (_) {}
        try {
          const [remRes, listRes] = await Promise.all([
            fetch(`${API_BASE_URL}/ai/reminders`, { headers: getAuthHeaders(token) }),
            fetch(`${API_BASE_URL}/ai/checklist`, { headers: getAuthHeaders(token) })
          ]);
          if (cancelled) return;
          if (remRes.ok) {
            const d = await remRes.json().catch(() => ({}));
            setReminders(Array.isArray(d.reminders) ? d.reminders : []);
          }
          if (listRes.ok) {
            const d = await listRes.json().catch(() => ({}));
            setChecklist(Array.isArray(d.checklist) ? d.checklist : []);
          }
        } catch (_) {}
      } else {
        try {
          const [medRes, taskRes] = await Promise.all([
            fetch(`${API_BASE_URL}/elders/${elderId}/medicines`, { headers: getAuthHeaders(token) }),
            fetch(`${API_BASE_URL}/elders/${elderId}/tasks`, { headers: getAuthHeaders(token) })
          ]);
          if (cancelled) return;
          if (medRes.ok) {
            const d = await medRes.json().catch(() => ({}));
            const arr = Array.isArray(d.medicines) ? d.medicines : [];
            setMedicines(
              arr.map((m) => ({
                id: m.id,
                name: m.name || 'Medicine',
                dosage: m.dosage || '',
                times: Array.isArray(m.times) ? m.times : m.time ? [m.time] : []
              }))
            );
          }
          if (taskRes.ok) {
            const d = await taskRes.json().catch(() => ({}));
            setTasks(Array.isArray(d.tasks) ? d.tasks : []);
          }
          setMedicineIntakeLogs([]);
          setReminders([]);
          setChecklist([]);
        } catch (_) {}
      }
    })();
    return () => { cancelled = true; };
  }, [elderId, token, isElder, refreshTrigger, currentUser?.role, selectedElderId]);

  const eventCountByDay = useMemo(() => {
    const todayStr = today();
    const viewFirst = new Date(viewDate + 'T12:00:00');
    const y = viewFirst.getFullYear();
    const m = viewFirst.getMonth();
    const firstDayOfWeek = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const out = {};
    const startPad = new Date(y, m, 1 - firstDayOfWeek);
    const endPad = new Date(y, m, daysInMonth + (6 - new Date(y, m, daysInMonth).getDay()));
    for (let d = new Date(startPad.getTime()); d.getTime() <= endPad.getTime(); d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      out[dateStr] = {
        medicines: medicines.length,
        tasks: tasks.filter((t) => (t.date || '').slice(0, 10) === dateStr || (!t.date && dateStr === todayStr)).length,
        reminders: reminders.filter((r) => (r.date || '').slice(0, 10) === dateStr || (!r.date && dateStr === todayStr)).length,
        checklist: checklist.filter((c) => {
          const createdDate = c.createdAt ? c.createdAt.slice(0, 10) : '';
          return createdDate ? createdDate === dateStr : dateStr === todayStr;
        }).length
      };
    }
    return out;
  }, [viewDate, medicines.length, tasks, reminders, checklist]);

  if (!currentUser) return null;
  if (currentUser.role === 'family' && !selectedElderId) {
    return (
      <div>
        <Link to="/" style={{ fontSize: '1rem', color: '#6366f1', marginBottom: '1rem', display: 'inline-block' }}>← Back to Dashboard</Link>
        <p>Select an elder from the dashboard to view their calendar.</p>
      </div>
    );
  }

  return (
    <div>
      <Link to="/" style={{ fontSize: '1rem', color: '#6366f1', marginBottom: '1rem', display: 'inline-block' }}>← Back to Dashboard</Link>
      <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 700, textAlign: 'center' }}>Calendar</h2>
      <p style={{ marginTop: 0, marginBottom: '1rem', color: '#64748b', fontSize: '0.95rem', textAlign: 'center' }}>
        {isElder ? 'Your medicines and tasks by date.' : 'Elder\'s medicines and tasks by date.'}
      </p>
      <div
        style={{
          background: timelineTheme.timelineBg,
          color: timelineTheme.timelineText,
          fontFamily: timelineTheme.timelineFontFamily,
          padding: '1rem',
          borderRadius: radii.card,
          minHeight: 'min(320px, 50vh)'
        }}
      >
        <MonthCalendar
          viewDate={viewDate}
          selectedDate={selectedDate}
          onSelectDate={(dateStr) => {
            setSelectedDate(dateStr);
            const d = new Date(dateStr + 'T12:00:00');
            setViewDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
          }}
          onPrevMonth={() => {
            const d = new Date(viewDate + 'T12:00:00');
            d.setMonth(d.getMonth() - 1);
            setViewDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
          }}
          onNextMonth={() => {
            const d = new Date(viewDate + 'T12:00:00');
            d.setMonth(d.getMonth() + 1);
            setViewDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
          }}
          eventCountByDay={eventCountByDay}
        />
      </div>
    </div>
  );
}

export default CalendarPage;
