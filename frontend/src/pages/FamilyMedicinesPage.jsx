import React, { useEffect, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import { colors } from '../design/tokens';
import { API_BASE_URL, getAuthHeaders } from '../api';
import { useFamilyElder } from '../context/FamilyElderContext.jsx';

function FamilyMedicinesPage() {
  const { currentUser, token } = useOutletContext();
  const { elders, selectedElderId, loadError, refreshTrigger, setRefreshTrigger } = useFamilyElder() || {};
  const [medicines, setMedicines] = useState([]);
  const [medicineForm, setMedicineForm] = useState({ name: '', dosage: '', time: '', notes: '' });
  const [editingMedicineId, setEditingMedicineId] = useState(null);
  const [medicineLoading, setMedicineLoading] = useState(false);
  const [refillLoadingId, setRefillLoadingId] = useState(null);
  const [refillFormId, setRefillFormId] = useState(null);
  const [refillFormNotes, setRefillFormNotes] = useState('');
  const [refillFormAmountLeft, setRefillFormAmountLeft] = useState('');
  const [refillFormRemindDays, setRefillFormRemindDays] = useState('');
  const [amountReminderLoadingId, setAmountReminderLoadingId] = useState(null);
  const amountReminderRefs = useRef({});
  const REMIND_OPTIONS = [7, 14, 30];

  useEffect(() => {
    if (!selectedElderId || !token) {
      setMedicines([]);
      return;
    }
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/elders/${selectedElderId}/medicines`, { headers: getAuthHeaders(token) });
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setMedicines(Array.isArray(data.medicines) ? data.medicines : []);
        } else setMedicines([]);
      } catch {
        if (isMounted) setMedicines([]);
      }
    })();
    return () => { isMounted = false; };
  }, [selectedElderId, token, refreshTrigger]);

  const handleAddMedicine = async (e) => {
    e?.preventDefault();
    if (!selectedElderId || !medicineForm.name.trim()) return;
    if (editingMedicineId) {
      await handleUpdateMedicine(editingMedicineId, {
        name: medicineForm.name.trim(),
        dosage: medicineForm.dosage.trim(),
        time: medicineForm.time.trim(),
        notes: medicineForm.notes.trim()
      });
      setMedicineForm({ name: '', dosage: '', time: '', notes: '' });
      setEditingMedicineId(null);
      return;
    }
    setMedicineLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/elders/${selectedElderId}/medicines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({
          name: medicineForm.name.trim(),
          dosage: medicineForm.dosage.trim(),
          time: medicineForm.time.trim(),
          notes: medicineForm.notes.trim()
        })
      });
      if (res.ok) {
        setMedicineForm({ name: '', dosage: '', time: '', notes: '' });
        setRefreshTrigger?.((t) => t + 1);
      }
    } catch (_) {}
    setMedicineLoading(false);
  };

  const handleUpdateMedicine = async (medicineId, payload) => {
    if (!selectedElderId) return;
    setMedicineLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/elders/${selectedElderId}/medicines/${medicineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setEditingMedicineId(null);
        setRefreshTrigger?.((t) => t + 1);
      }
    } catch (_) {}
    setMedicineLoading(false);
  };

  const handleDeleteMedicine = async (medicineId) => {
    if (!selectedElderId) return;
    setMedicineLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/elders/${selectedElderId}/medicines/${medicineId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token)
      });
      if (res.ok) setRefreshTrigger?.((t) => t + 1);
    } catch (_) {}
    setMedicineLoading(false);
  };

  const handleRequestRefill = async (medicineId, opts = {}) => {
    const { notes = '', amountLeft, refillReminderDays } = opts;
    if (!selectedElderId || !token) return;
    setRefillLoadingId(medicineId);
    try {
      const body = { notes: notes.trim() || undefined };
      if (amountLeft !== undefined && amountLeft !== '' && amountLeft !== null) body.amountLeft = Number(amountLeft);
      if (refillReminderDays !== undefined && refillReminderDays !== '' && refillReminderDays != null) body.refillReminderDays = Number(refillReminderDays);
      const res = await fetch(`${API_BASE_URL}/elders/${selectedElderId}/medicines/${medicineId}/refill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setRefillFormId(null);
        setRefillFormNotes('');
        setRefillFormAmountLeft('');
        setRefillFormRemindDays('');
        setRefreshTrigger?.((t) => t + 1);
      }
    } catch (_) {}
    setRefillLoadingId(null);
  };

  const handleRefillStatus = async (medicineId, status, extra = {}) => {
    if (!selectedElderId || !token) return;
    setRefillLoadingId(medicineId);
    try {
      const body = { status };
      if (extra.amountLeft !== undefined && extra.amountLeft !== '') body.amountLeft = Number(extra.amountLeft);
      if (extra.refillReminderDays !== undefined && extra.refillReminderDays !== '') body.refillReminderDays = Number(extra.refillReminderDays);
      const res = await fetch(`${API_BASE_URL}/elders/${selectedElderId}/medicines/${medicineId}/refill`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify(body)
      });
      if (res.ok) setRefreshTrigger?.((t) => t + 1);
    } catch (_) {}
    setRefillLoadingId(null);
  };

  const handleUpdateAmountReminder = async (medicineId, amountLeft, refillReminderDays) => {
    if (!selectedElderId || !token) return;
    setAmountReminderLoadingId(medicineId);
    try {
      const body = {};
      if (amountLeft !== undefined && amountLeft !== '' && amountLeft != null) body.amountLeft = Number(amountLeft);
      if (refillReminderDays !== undefined && refillReminderDays !== '' && refillReminderDays != null) body.refillReminderDays = Number(refillReminderDays);
      if (Object.keys(body).length === 0) {
        setAmountReminderLoadingId(null);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/elders/${selectedElderId}/medicines/${medicineId}/refill`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify(body)
      });
      if (res.ok) setRefreshTrigger?.((t) => t + 1);
    } catch (_) {}
    setAmountReminderLoadingId(null);
  };

  if (!currentUser || currentUser.role !== 'family') return null;

  const hasElder = !!selectedElderId;

  return (
    <div>
      <Link
        to="/"
        style={{
          display: 'inline-block',
          marginBottom: '1rem',
          fontSize: '1rem',
          color: colors.primary,
          textDecoration: 'none',
          fontWeight: 500
        }}
      >
        Back to Dashboard
      </Link>
      <h2 style={{ marginTop: 0, fontSize: '1.5rem', textAlign: 'center' }}>Medicines</h2>
      {loadError && <p style={{ color: colors.errorText, marginBottom: '1rem' }}>{loadError}</p>}
      {!hasElder ? (
        <p style={{ color: colors.textMuted }}>
          Select an elder on <Link to="/overview" style={{ color: colors.primary, fontWeight: 500 }}>Overview</Link> to view and manage their medicines.
        </p>
      ) : (
        <>
          <form
            onSubmit={handleAddMedicine}
            style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '24rem' }}
          >
            <input
              type="text"
              placeholder="Medicine name"
              value={medicineForm.name}
              onChange={(e) => setMedicineForm((f) => ({ ...f, name: e.target.value }))}
              style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem' }}
            />
            <input
              type="text"
              placeholder="Dosage"
              value={medicineForm.dosage}
              onChange={(e) => setMedicineForm((f) => ({ ...f, dosage: e.target.value }))}
              style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem' }}
            />
            <input
              type="text"
              placeholder="Time (e.g. 8:00 AM)"
              value={medicineForm.time}
              onChange={(e) => setMedicineForm((f) => ({ ...f, time: e.target.value }))}
              style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem' }}
            />
            <input
              type="text"
              placeholder="Notes (optional)"
              value={medicineForm.notes}
              onChange={(e) => setMedicineForm((f) => ({ ...f, notes: e.target.value }))}
              style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button type="submit" disabled={medicineLoading || !medicineForm.name.trim()}>
                {medicineLoading ? 'Saving…' : editingMedicineId ? 'Update medicine' : 'Add medicine'}
              </Button>
              {editingMedicineId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditingMedicineId(null);
                    setMedicineForm({ name: '', dosage: '', time: '', notes: '' });
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {medicines.length === 0 && <p style={{ color: colors.textMuted, fontSize: '0.95rem', margin: 0 }}>No medicines added yet.</p>}
            {medicines.map((m) => (
              <div
                key={m.id}
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: '0.9rem', color: colors.textMuted }}>{m.dosage || '—'} · {m.time || '—'}</div>
                  {m.notes && <div style={{ fontSize: '0.9rem', marginTop: '0.2rem' }}>{m.notes}</div>}
                  <div style={{ fontSize: '0.9rem', marginTop: '0.35rem', color: colors.textMuted }}>
                    Refill: {m.refillStatus === 'none' || !m.refillStatus ? '—' : m.refillStatus === 'pending' ? 'Pending' : m.refillStatus === 'ordered' ? 'Ordered' : 'Received'}
                    {m.refillNotes && m.refillStatus !== 'none' && m.refillStatus !== 'received' && ` · ${m.refillNotes}`}
                  </div>
                  <div style={{ fontSize: '0.9rem', marginTop: '0.25rem', color: colors.textMuted }}>
                    Amount left: {m.amountLeft != null && typeof m.amountLeft === 'number' ? `${m.amountLeft} days` : '—'}
                    {m.refillReminderAt && ` · Remind: ${m.refillReminderAt}`}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', color: colors.textMuted }}>Amount (days):</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="days"
                      defaultValue={m.amountLeft ?? ''}
                      ref={(el) => { if (el) { amountReminderRefs.current[m.id] = amountReminderRefs.current[m.id] || {}; amountReminderRefs.current[m.id].amount = el; } }}
                      style={{ width: '4rem', padding: '0.25rem 0.4rem', fontSize: '0.9rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.4rem' }}
                    />
                    <label style={{ fontSize: '0.85rem', color: colors.textMuted }}>Remind in:</label>
                    <select
                      defaultValue=""
                      ref={(el) => { if (el) { amountReminderRefs.current[m.id] = amountReminderRefs.current[m.id] || {}; amountReminderRefs.current[m.id].remind = el; } }}
                      style={{ padding: '0.25rem 0.4rem', fontSize: '0.9rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.4rem' }}
                    >
                      <option value="">—</option>
                      {REMIND_OPTIONS.map((d) => (
                        <option key={d} value={d}>{d} days</option>
                      ))}
                    </select>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const r = amountReminderRefs.current[m.id];
                        const amountVal = r?.amount?.value?.trim();
                        const remindVal = r?.remind?.value?.trim();
                        if (amountVal || remindVal) handleUpdateAmountReminder(m.id, amountVal || undefined, remindVal || undefined);
                      }}
                      disabled={amountReminderLoadingId === m.id}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                    >
                      {amountReminderLoadingId === m.id ? '…' : 'Update'}
                    </Button>
                  </div>
                  {refillFormId === m.id && (
                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: colors.surfaceSoft, borderRadius: '0.5rem', border: `1px solid ${colors.borderSubtle}` }}>
                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        value={refillFormNotes}
                        onChange={(e) => setRefillFormNotes(e.target.value)}
                        style={{ width: '100%', maxWidth: '16rem', marginBottom: '0.4rem', padding: '0.35rem 0.5rem', fontSize: '0.9rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.4rem' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.85rem' }}>Amount left (days):</label>
                        <input
                          type="number"
                          min={0}
                          placeholder="optional"
                          value={refillFormAmountLeft}
                          onChange={(e) => setRefillFormAmountLeft(e.target.value)}
                          style={{ width: '4rem', padding: '0.25rem 0.4rem', fontSize: '0.9rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.4rem' }}
                        />
                        <label style={{ fontSize: '0.85rem' }}>Remind in:</label>
                        <select
                          value={refillFormRemindDays}
                          onChange={(e) => setRefillFormRemindDays(e.target.value)}
                          style={{ padding: '0.25rem 0.4rem', fontSize: '0.9rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.4rem' }}
                        >
                          <option value="">—</option>
                          {REMIND_OPTIONS.map((d) => (
                            <option key={d} value={d}>{d} days</option>
                          ))}
                        </select>
                        <Button onClick={() => handleRequestRefill(m.id, { notes: refillFormNotes, amountLeft: refillFormAmountLeft || undefined, refillReminderDays: refillFormRemindDays || undefined })} disabled={refillLoadingId === m.id}>
                          {refillLoadingId === m.id ? '…' : 'Request refill'}
                        </Button>
                        <Button variant="secondary" onClick={() => { setRefillFormId(null); setRefillFormNotes(''); setRefillFormAmountLeft(''); setRefillFormRemindDays(''); }}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {(m.refillStatus === 'none' || !m.refillStatus || m.refillStatus === 'received') && (
                    <Button
                      variant="secondary"
                      onClick={() => setRefillFormId(refillFormId === m.id ? null : m.id)}
                      disabled={medicineLoading || refillLoadingId === m.id}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.9rem' }}
                    >
                      {refillFormId === m.id ? 'Cancel' : 'Request refill'}
                    </Button>
                  )}
                  {(m.refillStatus === 'pending' || m.refillStatus === 'ordered') && (
                    <>
                      {m.refillStatus === 'pending' && (
                        <Button
                          variant="secondary"
                          onClick={() => handleRefillStatus(m.id, 'ordered')}
                          disabled={medicineLoading || refillLoadingId === m.id}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.9rem' }}
                        >
                          {refillLoadingId === m.id ? '…' : 'Mark ordered'}
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        onClick={() => handleRefillStatus(m.id, 'received')}
                        disabled={medicineLoading || refillLoadingId === m.id}
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.9rem' }}
                      >
                        {refillLoadingId === m.id ? '…' : 'Mark received'}
                      </Button>
                    </>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingMedicineId(m.id);
                      setMedicineForm({ name: m.name, dosage: m.dosage || '', time: m.time || '', notes: m.notes || '' });
                    }}
                    disabled={medicineLoading}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.9rem' }}
                  >
                    Edit
                  </Button>
                  <Button variant="secondary" onClick={() => handleDeleteMedicine(m.id)} disabled={medicineLoading} style={{ padding: '0.35rem 0.75rem', fontSize: '0.9rem' }}>
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

export default FamilyMedicinesPage;
