import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import DayStrip from '../components/calendar/DayStrip.jsx';
import DailyTimeline from '../components/calendar/DailyTimeline.jsx';
import FAB from '../components/calendar/FAB.jsx';
import { colors, timelineTheme, radii } from '../design/tokens';
import { getElderDashboardData } from '../firebase/dashboardData.js';
import { API_BASE_URL, getAuthHeaders } from '../api';
import { useFamilyElder } from '../context/FamilyElderContext.jsx';
import { useActionState } from '../hooks/useActionState';
import { playReminderBell } from '../utils/reminderBell.js';
import { parseTimeToMinutes } from '../utils/timeUtils.js';

const today = () => new Date().toISOString().slice(0, 10);

function TimelinePage() {
  const { currentUser, token } = useOutletContext();
  const { selectedElderId } = useFamilyElder() || {};
  const elderId = currentUser?.role === 'elderly' ? currentUser?.id : selectedElderId;
  const isElder = currentUser?.role === 'elderly';

  const [selectedDate, setSelectedDate] = useState(today());
  const [medicines, setMedicines] = useState([]);
  const [medicineIntakeLogs, setMedicineIntakeLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const addReminderAction = useActionState({ autoResetMs: 3000 });

  useEffect(() => {
    if (!elderId || !token) {
      if (currentUser?.role === 'family' && !selectedElderId) return;
      setMedicines([]);
      setMedicineIntakeLogs([]);
      setTasks([]);
      setReminders([]);
      setChecklist([]);
      return;
    }
    let cancelled = false;
    (async () => {
      if (isElder) {
        try {
          const data = await getElderDashboardData(elderId, token);
          if (cancelled || !data) return;
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
          const [medRes, taskRes, remRes, listRes] = await Promise.all([
            fetch(`${API_BASE_URL}/elders/${elderId}/medicines`, { headers: getAuthHeaders(token) }),
            fetch(`${API_BASE_URL}/elders/${elderId}/tasks`, { headers: getAuthHeaders(token) }),
            fetch(`${API_BASE_URL}/elders/${elderId}/reminders`, { headers: getAuthHeaders(token) }),
            fetch(`${API_BASE_URL}/elders/${elderId}/checklist`, { headers: getAuthHeaders(token) })
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
          if (remRes.ok) {
            const d = await remRes.json().catch(() => ({}));
            setReminders(Array.isArray(d.reminders) ? d.reminders : []);
          }
          if (listRes.ok) {
            const d = await listRes.json().catch(() => ({}));
            setChecklist(Array.isArray(d.checklist) ? d.checklist : []);
          }
          setMedicineIntakeLogs([]);
        } catch (_) {}
      }
    })();
    return () => { cancelled = true; };
  }, [elderId, token, isElder, refreshTrigger, currentUser?.role, selectedElderId]);

  const remindersForSelectedDay = useMemo(() => {
    const todayStr = today();
    return reminders.filter((r) => (r.date || '').slice(0, 10) === selectedDate || (!r.date && selectedDate === todayStr));
  }, [reminders, selectedDate]);

  const reminderBellPlayedIds = useRef(new Set());
  useEffect(() => {
    if (selectedDate !== today()) return;
    const tick = () => {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      remindersForSelectedDay.forEach((r) => {
        if (r.done) return;
        const remMin = parseTimeToMinutes(r.at);
        if (remMin < 0) return;
        if (remMin === currentMin && !reminderBellPlayedIds.current.has(r.id)) {
          reminderBellPlayedIds.current.add(r.id);
          playReminderBell();
        }
      });
    };
    tick();
    const id = setInterval(tick, 30 * 1000);
    return () => clearInterval(id);
  }, [selectedDate, remindersForSelectedDay]);

  const eventCountByDay = useMemo(() => {
    const todayStr = today();
    const weekDates = (() => {
      const d = new Date(selectedDate + 'T12:00:00');
      const dayOfWeek = d.getDay();
      const start = new Date(d);
      start.setDate(d.getDate() - dayOfWeek);
      const out = {};
      for (let i = 0; i < 7; i++) {
        const x = new Date(start);
        x.setDate(start.getDate() + i);
        out[x.toISOString().slice(0, 10)] = { medicines: 0, tasks: 0, reminders: 0, checklist: 0 };
      }
      return out;
    })();
    Object.keys(weekDates).forEach((dateStr) => {
      weekDates[dateStr].medicines = medicines.length;
      weekDates[dateStr].tasks = tasks.filter((t) => (t.date || '').slice(0, 10) === dateStr || (!t.date && dateStr === todayStr)).length;
      weekDates[dateStr].reminders = reminders.filter((r) => (r.date || '').slice(0, 10) === dateStr || (!r.date && dateStr === todayStr)).length;
      weekDates[dateStr].checklist = checklist.filter((c) => {
        const createdDate = c.createdAt ? c.createdAt.slice(0, 10) : '';
        return createdDate ? createdDate === dateStr : dateStr === todayStr;
      }).length;
    });
    return weekDates;
  }, [selectedDate, medicines.length, tasks, reminders, checklist]);

  const handleAddReminderFromTimeline = async (payload) => {
    if (!isElder || !token) return;
    const { text, at = '', date = '' } = payload || {};
    if (!text?.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/ai/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ text: text.trim(), at: (at || '').trim(), date: (date || '').trim() })
      });
      if (res.ok) setRefreshTrigger((t) => t + 1);
    } catch (_) {}
  };

  const handleAddChecklistFromTimeline = async (payload) => {
    if (!isElder || !token) return;
    const { text } = payload || {};
    if (!text?.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/ai/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ text: text.trim() })
      });
      if (res.ok) setRefreshTrigger((t) => t + 1);
    } catch (_) {}
  };

  if (!currentUser) return null;
  if (currentUser.role === 'family' && !selectedElderId) {
    return (
      <div>
        <Link to="/" style={{ fontSize: '1rem', color: colors.primary, marginBottom: '1rem', display: 'inline-block' }}>← Back to Dashboard</Link>
        <p>Select an elder from the dashboard to view their timeline.</p>
      </div>
    );
  }

  return (
    <div>
      <Link to="/" style={{ fontSize: '1rem', color: colors.primary, marginBottom: '1rem', display: 'inline-block' }}>← Back to Dashboard</Link>
      <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 700, textAlign: 'center' }}>Timeline</h2>
      <p style={{ marginTop: 0, marginBottom: '1rem', color: colors.textMuted, fontSize: '0.95rem', textAlign: 'center' }}>
        {isElder ? 'Your day at a glance. Mark done in Overview or via voice.' : "Elder's day at a glance."}
      </p>
      <div
        style={{
          background: timelineTheme.timelineBg,
          color: timelineTheme.timelineText,
          fontFamily: timelineTheme.timelineFontFamily,
          padding: '1rem',
          borderRadius: radii.card,
          minHeight: 'min(400px, 60vh)'
        }}
      >
        <DayStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} eventCountByDay={eventCountByDay} />
        <DailyTimeline
          date={selectedDate}
          medicines={medicines}
          tasks={tasks}
          reminders={remindersForSelectedDay}
          checklist={checklist}
          medicineIntakeLogs={medicineIntakeLogs}
          onMarkTaken={undefined}
          onTaskComplete={undefined}
          onReminderDone={undefined}
          onToggleTodo={undefined}
          readOnly={true}
        />
        {isElder && (
          <FAB
            selectedDate={selectedDate}
            onAddReminder={handleAddReminderFromTimeline}
            onAddChecklist={handleAddChecklistFromTimeline}
            onReminderStateChange={(s) => s === 'pending' && addReminderAction.setPending()}
          />
        )}
      </div>
    </div>
  );
}

export default TimelinePage;
