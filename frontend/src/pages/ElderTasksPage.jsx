import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import DayStrip from '../components/calendar/DayStrip.jsx';
import DailyTimeline from '../components/calendar/DailyTimeline.jsx';
import FAB from '../components/calendar/FAB.jsx';
import { colors, timelineTheme, radii } from '../design/tokens';
import { getElderDashboardData } from '../firebase/dashboardData.js';
import { API_BASE_URL, getAuthHeaders } from '../api';
import { useActionState, ACTION_STATUS } from '../hooks/useActionState';

const today = () => new Date().toISOString().slice(0, 10);

function ElderTasksPage() {
  const { currentUser, token } = useOutletContext();
  const [medicines, setMedicines] = useState([]);
  const [medicineIntakeLogs, setMedicineIntakeLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [timelineSelectedDate, setTimelineSelectedDate] = useState(today());
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [markingId, setMarkingId] = useState(null);
  const [completingTaskId, setCompletingTaskId] = useState(null);
  const [togglingReminderId, setTogglingReminderId] = useState(null);
  const [togglingTodoId, setTogglingTodoId] = useState(null);
  const addReminderAction = useActionState({ autoResetMs: 3000 });

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const data = await getElderDashboardData(currentUser?.id, token);
        if (!isMounted || !data) return;
        if (Array.isArray(data.medicines) && data.medicines.length > 0) {
          setMedicines(
            data.medicines.map((m) => ({
              id: m.id,
              name: m.title || m.name || 'Medicine',
              dosage: m.details || m.dosage || '',
              times: Array.isArray(m.times) ? m.times : (m.time ? [m.time] : [''])
            }))
          );
        } else setMedicines([]);
        setMedicineIntakeLogs(Array.isArray(data.medicineIntakeLogs) ? data.medicineIntakeLogs : []);
        setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      } catch (_) {}
    }
    if (currentUser?.id) load();
    return () => { isMounted = false; };
  }, [currentUser?.id, token, refreshTrigger]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const [remRes, listRes] = await Promise.all([
          fetch(`${API_BASE_URL}/ai/reminders`, { headers: getAuthHeaders(token) }),
          fetch(`${API_BASE_URL}/ai/checklist`, { headers: getAuthHeaders(token) })
        ]);
        if (!isMounted) return;
        if (remRes.ok) {
          const d = await remRes.json().catch(() => ({}));
          setReminders(Array.isArray(d.reminders) ? d.reminders : []);
        }
        if (listRes.ok) {
          const d = await listRes.json().catch(() => ({}));
          setChecklist(Array.isArray(d.checklist) ? d.checklist : []);
        }
      } catch (_) {}
    }
    if (token) load();
    return () => { isMounted = false; };
  }, [token, refreshTrigger]);

  const eventCountByDay = useMemo(() => {
    const todayStr = today();
    const weekDates = (() => {
      const d = new Date(timelineSelectedDate + 'T12:00:00');
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
      weekDates[dateStr].tasks = tasks.filter((t) => (t.date ? t.date === dateStr : dateStr === todayStr)).length;
      weekDates[dateStr].reminders = reminders.filter((r) => (r.date ? r.date === dateStr : dateStr === todayStr)).length;
      weekDates[dateStr].checklist = checklist.filter((c) => {
        const createdDate = c.createdAt ? c.createdAt.slice(0, 10) : '';
        return createdDate ? createdDate === dateStr : dateStr === todayStr;
      }).length;
    });
    return weekDates;
  }, [timelineSelectedDate, medicines.length, tasks, reminders, checklist]);

  const handleMarkTaken = async (medicineId) => {
    setMarkingId(medicineId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/elders/${currentUser.id}/medicines/${medicineId}/taken`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
          body: JSON.stringify({})
        }
      );
      if (res.ok) setRefreshTrigger((t) => t + 1);
    } catch (_) {}
    setMarkingId(null);
  };

  const handleTaskComplete = async (taskId) => {
    setCompletingTaskId(taskId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/elders/${currentUser.id}/tasks/${taskId}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
          body: JSON.stringify({})
        }
      );
      if (res.ok) setRefreshTrigger((t) => t + 1);
    } catch (_) {}
    setCompletingTaskId(null);
  };

  const handleReminderDone = async (id, done) => {
    setTogglingReminderId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ done })
      });
      if (res.ok) setRefreshTrigger((t) => t + 1);
    } catch (_) {}
    setTogglingReminderId(null);
  };

  const handleToggleTodo = async (id) => {
    setTogglingTodoId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/checklist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) }
      });
      if (res.ok) setRefreshTrigger((t) => t + 1);
    } catch (_) {}
    setTogglingTodoId(null);
  };

  const handleAddReminderFromTimeline = async (payload) => {
    const { text, at = '', date = '' } = payload || {};
    if (!text?.trim()) return;
    addReminderAction.setPending();
    try {
      const res = await fetch(`${API_BASE_URL}/ai/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ text: text.trim(), at: (at || '').trim(), date: (date || '').trim() })
      });
      if (res.ok) {
        setRefreshTrigger((t) => t + 1);
        addReminderAction.setSuccess();
      } else {
        const data = await res.json().catch(() => ({}));
        addReminderAction.setError(data.message || 'Failed to add reminder.');
      }
    } catch (_) {
      addReminderAction.setError('Request failed.');
    }
  };

  const handleAddChecklistFromTimeline = async (payload) => {
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

  if (!currentUser || currentUser.role !== 'elderly') return null;

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 700, textAlign: 'center' }}>Today&apos;s Tasks & Timeline</h2>
      {addReminderAction.status === ACTION_STATUS.SUCCESS && <p className="info-message" style={{ marginBottom: '0.75rem' }}>Reminder added.</p>}
      {addReminderAction.status === ACTION_STATUS.ERROR && <p style={{ marginBottom: '0.75rem', color: colors.errorText, fontSize: '0.95rem' }}>{addReminderAction.error}</p>}
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
        <DayStrip
          selectedDate={timelineSelectedDate}
          onSelectDate={setTimelineSelectedDate}
          eventCountByDay={eventCountByDay}
        />
        <DailyTimeline
          date={timelineSelectedDate}
          medicines={medicines}
          tasks={tasks}
          reminders={reminders}
          checklist={checklist}
          medicineIntakeLogs={medicineIntakeLogs}
          onMarkTaken={undefined}
          onTaskComplete={undefined}
          onReminderDone={undefined}
          onToggleTodo={undefined}
          readOnly={true}
        />
        <FAB
          selectedDate={timelineSelectedDate}
          onAddReminder={handleAddReminderFromTimeline}
          onAddChecklist={handleAddChecklistFromTimeline}
        />
      </div>
    </div>
  );
}

export default ElderTasksPage;
