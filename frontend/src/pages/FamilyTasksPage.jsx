import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import Tag from '../components/ui/Tag.jsx';
import { colors } from '../design/tokens';
import { API_BASE_URL, getAuthHeaders } from '../api';
import { useFamilyElder } from '../context/FamilyElderContext.jsx';

function FamilyTasksPage() {
  const { currentUser, token } = useOutletContext();
  const { selectedElderId, loadError, refreshTrigger, setRefreshTrigger } = useFamilyElder() || {};
  const [tasks, setTasks] = useState([]);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', time: '' });
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskLoading, setTaskLoading] = useState(false);

  useEffect(() => {
    if (!selectedElderId || !token) {
      setTasks([]);
      return;
    }
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/elders/${selectedElderId}/tasks`, { headers: getAuthHeaders(token) });
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setTasks(Array.isArray(data.tasks) ? data.tasks : []);
        } else setTasks([]);
      } catch {
        if (isMounted) setTasks([]);
      }
    })();
    return () => { isMounted = false; };
  }, [selectedElderId, token, refreshTrigger]);

  const handleAddTask = async (e) => {
    e?.preventDefault();
    if (!selectedElderId || !taskForm.title.trim()) return;
    if (editingTaskId) {
      await handleUpdateTask(editingTaskId, {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        time: taskForm.time.trim()
      });
      setTaskForm({ title: '', description: '', time: '' });
      setEditingTaskId(null);
      return;
    }
    setTaskLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/elders/${selectedElderId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({
          title: taskForm.title.trim(),
          description: taskForm.description.trim(),
          time: taskForm.time.trim()
        })
      });
      if (res.ok) {
        setTaskForm({ title: '', description: '', time: '' });
        setRefreshTrigger?.((t) => t + 1);
      }
    } catch (_) {}
    setTaskLoading(false);
  };

  const handleUpdateTask = async (taskId, payload) => {
    if (!selectedElderId) return;
    setTaskLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/elders/${selectedElderId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setEditingTaskId(null);
        setRefreshTrigger?.((t) => t + 1);
      }
    } catch (_) {}
    setTaskLoading(false);
  };

  const handleDeleteTask = async (taskId) => {
    if (!selectedElderId) return;
    setTaskLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/elders/${selectedElderId}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token)
      });
      if (res.ok) setRefreshTrigger?.((t) => t + 1);
    } catch (_) {}
    setTaskLoading(false);
  };

  if (!currentUser || currentUser.role !== 'family') return null;

  const hasElder = !!selectedElderId;

  return (
    <div>
      <h2 style={{ marginTop: 0, fontSize: '1.5rem', textAlign: 'center' }}>Tasks</h2>
      {loadError && <p style={{ color: colors.errorText, marginBottom: '1rem' }}>{loadError}</p>}
      {!hasElder ? (
        <p style={{ color: colors.textMuted }}>
          Select an elder on <Link to="/overview" style={{ color: colors.primary, fontWeight: 500 }}>Overview</Link> to view and manage their tasks.
        </p>
      ) : (
        <>
          <form
            onSubmit={handleAddTask}
            style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '24rem' }}
          >
            <input
              type="text"
              placeholder="Task title"
              value={taskForm.title}
              onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
              style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem' }}
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={taskForm.description}
              onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
              style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem' }}
            />
            <input
              type="text"
              placeholder="Time (e.g. 9:00 AM)"
              value={taskForm.time}
              onChange={(e) => setTaskForm((f) => ({ ...f, time: e.target.value }))}
              style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button type="submit" disabled={taskLoading || !taskForm.title.trim()}>
                {taskLoading ? 'Saving…' : editingTaskId ? 'Update task' : 'Add task'}
              </Button>
              {editingTaskId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditingTaskId(null);
                    setTaskForm({ title: '', description: '', time: '' });
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {tasks.length === 0 && <p style={{ color: colors.textMuted, fontSize: '0.95rem', margin: 0 }}>No tasks yet.</p>}
            {tasks.map((t) => (
              <div
                key={t.id}
                className="hover-card"
                style={{
                  borderRadius: '0.8rem',
                  padding: '0.75rem 0.9rem',
                  border: `1px solid ${colors.borderSubtle}`,
                  background: colors.surfaceSoft,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  fontSize: '0.98rem',
                  color: colors.text
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{t.title || 'Task'}</div>
                  {t.description && (
                    <div style={{ fontSize: '0.9rem', color: colors.textMuted }}>{t.description}</div>
                  )}
                  <div style={{ fontSize: '0.9rem', color: colors.textMuted }}>{t.time || '—'} {t.completed && <Tag tone="success">Done</Tag>}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingTaskId(t.id);
                      setTaskForm({ title: t.title || '', description: t.description || '', time: t.time || '' });
                    }}
                    disabled={taskLoading}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.9rem' }}
                  >
                    Edit
                  </Button>
                  <Button variant="secondary" onClick={() => handleDeleteTask(t.id)} disabled={taskLoading} style={{ padding: '0.35rem 0.75rem', fontSize: '0.9rem' }}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default FamilyTasksPage;
