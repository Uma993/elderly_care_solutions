import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMainApp } from '../context/MainAppContext';
import { apiFetch } from '../api/client';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['male', 'female', 'other'];
const MOBILITY_OPTIONS = ['none', 'walker', 'wheelchair', 'cane', 'other'];

type Profile = Record<string, unknown>;

export default function ProfileScreen() {
  const { user, token } = useMainApp();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasProfileAdded, setHasProfileAdded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Profile>({});
  const [savePending, setSavePending] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isElder = user.role === 'elderly';
  const elderId = isElder ? user.id : null;

  const load = useCallback(async () => {
    if (!elderId || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`/elders/${elderId}/profile`, { token });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setHasProfileAdded(!!data.hasProfileAdded);
        setProfile(data.profile || {});
        setForm(data.profile || {});
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [elderId, token]);

  useEffect(() => {
    load();
  }, [load]);

  const updateForm = useCallback((key: string, value: unknown) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const updateNested = useCallback((key: string, subKey: string, value: string) => {
    setForm((f) => ({
      ...f,
      [key]: { ...((f[key] as Record<string, unknown>) || {}), [subKey]: value },
    }));
  }, []);

  const handleSave = async () => {
    if (!elderId || !token) return;
    setSaveError('');
    setSaveSuccess(false);
    setSavePending(true);
    try {
      const payload = {
        age: form.age ?? null,
        gender: form.gender || undefined,
        height: form.height ?? null,
        heightUnit: form.heightUnit || 'cm',
        weight: form.weight ?? null,
        weightUnit: form.weightUnit || 'kg',
        bloodType: form.bloodType || undefined,
        location: form.location || undefined,
        primaryCondition: form.primaryCondition || undefined,
        emergencyContact1: form.emergencyContact1 || undefined,
        emergencyContact2: form.emergencyContact2 || undefined,
        primaryDoctor: form.primaryDoctor || undefined,
        preferredHospital: form.preferredHospital || undefined,
        allergies: form.allergies || undefined,
        dietaryRestrictions: form.dietaryRestrictions || undefined,
        mobilityAids: form.mobilityAids || undefined,
        cognitiveNotes: form.cognitiveNotes || undefined,
        stepsToday: form.stepsToday ?? null,
        heartRate: form.heartRate ?? null,
        spO2: form.spO2 ?? null,
        bloodPressure: form.bloodPressure || undefined,
        sleepHours: form.sleepHours ?? null,
      };
      const res = await apiFetch(`/elders/${elderId}/profile`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError((data.message as string) || 'Failed to save profile.');
        return;
      }
      setSaveSuccess(true);
      setProfile(data.profile || {});
      setForm(data.profile || {});
      setHasProfileAdded(!!data.hasProfileAdded);
      setEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError('Unable to reach the server.');
    } finally {
      setSavePending(false);
    }
  };

  if (!isElder || !elderId) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Profile is available for elderly users only.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.muted}>Loading profile…</Text>
      </View>
    );
  }

  const showForm = !hasProfileAdded || editing;
  const ec1 = profile?.emergencyContact1 as { name?: string; relationship?: string; phone?: string } | undefined;

  const summaryParts = [
    profile?.age && `${profile.age} years`,
    profile?.gender,
    profile?.height && `${profile.height} ${profile.heightUnit || 'cm'}`,
    profile?.weight && `${profile.weight} ${profile.weightUnit || 'kg'}`,
    profile?.bloodType,
    profile?.location,
    profile?.primaryCondition,
  ].filter(Boolean);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {!showForm ? (
          <>
            <Text style={styles.success}>Profile added</Text>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Basic</Text>
              <Text style={styles.muted}>{summaryParts.length ? summaryParts.join(' • ') : '—'}</Text>
            </View>
            {(ec1?.name || (profile?.primaryDoctor as { name?: string })?.name) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Emergency</Text>
                <Text style={styles.muted}>
                  {[
                    ec1?.name && `ICE: ${ec1.name} (${ec1.relationship || '—'})`,
                    (profile?.primaryDoctor as { name?: string })?.name &&
                      `Doctor: ${(profile?.primaryDoctor as { name: string })?.name}`,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </Text>
              </View>
            )}
            <Pressable style={styles.editBtn} onPress={() => setEditing(true)}>
              <Text style={styles.editBtnText}>Edit profile</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Basic</Text>
              <Field label="Age" optional>
                <TextInput
                  style={styles.input}
                  value={String(form.age ?? '')}
                  onChangeText={(v) => updateForm('age', v)}
                  placeholder="e.g. 75"
                  keyboardType="numeric"
                />
              </Field>
              <Field label="Gender" optional>
                <View style={styles.row}>
                  {GENDERS.map((g) => (
                    <Pressable
                      key={g}
                      style={[styles.radio, form.gender === g && styles.radioActive]}
                      onPress={() => updateForm('gender', g)}
                    >
                      <Text style={[styles.radioText, form.gender === g && styles.radioTextActive]}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Field>
              <Field label="Height" optional>
                <View style={styles.row2}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={String(form.height ?? '')}
                    onChangeText={(v) => updateForm('height', v)}
                    placeholder="e.g. 170"
                    keyboardType="numeric"
                  />
                  <Pressable
                    style={[styles.unitBtn, form.heightUnit === 'ft' && styles.unitBtnActive]}
                    onPress={() => updateForm('heightUnit', form.heightUnit === 'ft' ? 'cm' : 'ft')}
                  >
                    <Text style={styles.unitText}>{form.heightUnit === 'ft' ? 'ft' : 'cm'}</Text>
                  </Pressable>
                </View>
              </Field>
              <Field label="Weight" optional>
                <View style={styles.row2}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={String(form.weight ?? '')}
                    onChangeText={(v) => updateForm('weight', v)}
                    placeholder="e.g. 70"
                    keyboardType="decimal-pad"
                  />
                  <Pressable
                    style={[styles.unitBtn, form.weightUnit === 'lb' && styles.unitBtnActive]}
                    onPress={() => updateForm('weightUnit', form.weightUnit === 'lb' ? 'kg' : 'lb')}
                  >
                    <Text style={styles.unitText}>{form.weightUnit === 'lb' ? 'lb' : 'kg'}</Text>
                  </Pressable>
                </View>
              </Field>
              <Field label="Blood type" optional>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {BLOOD_TYPES.map((b) => (
                    <Pressable
                      key={b}
                      style={[styles.chip, form.bloodType === b && styles.chipActive]}
                      onPress={() => updateForm('bloodType', b)}
                    >
                      <Text style={[styles.chipText, form.bloodType === b && styles.chipTextActive]}>{b}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </Field>
              <Field label="Location" optional>
                <TextInput
                  style={styles.input}
                  value={String(form.location ?? '')}
                  onChangeText={(v) => updateForm('location', v)}
                  placeholder="City or address"
                />
              </Field>
              <Field label="Primary condition" optional>
                <TextInput
                  style={styles.input}
                  value={String(form.primaryCondition ?? '')}
                  onChangeText={(v) => updateForm('primaryCondition', v)}
                  placeholder="e.g. Hypertension"
                />
              </Field>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Emergency</Text>
              <Field label="Contact 1 - Name" optional>
                <TextInput
                  style={styles.input}
                  value={String((form.emergencyContact1 as { name?: string })?.name ?? '')}
                  onChangeText={(v) => updateNested('emergencyContact1', 'name', v)}
                />
              </Field>
              <Field label="Relationship" optional>
                <TextInput
                  style={styles.input}
                  value={String((form.emergencyContact1 as { relationship?: string })?.relationship ?? '')}
                  onChangeText={(v) => updateNested('emergencyContact1', 'relationship', v)}
                  placeholder="e.g. Son"
                />
              </Field>
              <Field label="Phone" optional>
                <TextInput
                  style={styles.input}
                  value={String((form.emergencyContact1 as { phone?: string })?.phone ?? '')}
                  onChangeText={(v) => updateNested('emergencyContact1', 'phone', v)}
                  keyboardType="phone-pad"
                />
              </Field>
              <Field label="Doctor - Name" optional>
                <TextInput
                  style={styles.input}
                  value={String((form.primaryDoctor as { name?: string })?.name ?? '')}
                  onChangeText={(v) => updateNested('primaryDoctor', 'name', v)}
                />
              </Field>
              <Field label="Hospital - Name" optional>
                <TextInput
                  style={styles.input}
                  value={String((form.preferredHospital as { name?: string })?.name ?? '')}
                  onChangeText={(v) => updateNested('preferredHospital', 'name', v)}
                />
              </Field>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Health</Text>
              <Field label="Allergies" optional>
                <TextInput
                  style={styles.input}
                  value={String(form.allergies ?? '')}
                  onChangeText={(v) => updateForm('allergies', v)}
                  placeholder="e.g. Penicillin, nuts"
                />
              </Field>
              <Field label="Dietary restrictions" optional>
                <TextInput
                  style={styles.input}
                  value={String(form.dietaryRestrictions ?? '')}
                  onChangeText={(v) => updateForm('dietaryRestrictions', v)}
                  placeholder="e.g. Diabetic, low-sodium"
                />
              </Field>
              <Field label="Mobility aids" optional>
                <View style={styles.chipRow}>
                  {MOBILITY_OPTIONS.map((m) => (
                    <Pressable
                      key={m}
                      style={[styles.chip, form.mobilityAids === m && styles.chipActive]}
                      onPress={() => updateForm('mobilityAids', m)}
                    >
                      <Text style={[styles.chipText, form.mobilityAids === m && styles.chipTextActive]}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Field>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Care Notes</Text>
              <Field label="Cognitive/behavioral notes" optional>
                <TextInput
                  style={styles.input}
                  value={String(form.cognitiveNotes ?? '')}
                  onChangeText={(v) => updateForm('cognitiveNotes', v)}
                  placeholder="e.g. Early stage dementia"
                />
              </Field>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fitness (manual entry)</Text>
              <Text style={[styles.muted, { marginBottom: 8 }]}>Sync with Health Connect (coming soon)</Text>
              <Field label="Steps today" optional>
                <TextInput
                  style={styles.input}
                  value={String(form.stepsToday ?? '')}
                  onChangeText={(v) => updateForm('stepsToday', v)}
                  keyboardType="numeric"
                />
              </Field>
              <Field label="Heart rate (bpm)" optional>
                <TextInput
                  style={styles.input}
                  value={String(form.heartRate ?? '')}
                  onChangeText={(v) => updateForm('heartRate', v)}
                  keyboardType="numeric"
                />
              </Field>
              <Field label="SpO2 (%)" optional>
                <TextInput
                  style={styles.input}
                  value={String(form.spO2 ?? '')}
                  onChangeText={(v) => updateForm('spO2', v)}
                  keyboardType="numeric"
                />
              </Field>
              <Field label="Blood pressure" optional>
                <TextInput
                  style={styles.input}
                  value={String(form.bloodPressure ?? '')}
                  onChangeText={(v) => updateForm('bloodPressure', v)}
                  placeholder="e.g. 120/80"
                />
              </Field>
              <Field label="Sleep hours" optional>
                <TextInput
                  style={styles.input}
                  value={String(form.sleepHours ?? '')}
                  onChangeText={(v) => updateForm('sleepHours', v)}
                  keyboardType="decimal-pad"
                />
              </Field>
            </View>

            {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
            {saveSuccess ? <Text style={styles.success}>Profile saved.</Text> : null}

            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.saveBtn, savePending && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={savePending}
              >
                {savePending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save profile</Text>
                )}
              </Pressable>
              {editing && (
                <Pressable style={styles.cancelBtn} onPress={() => { setEditing(false); setForm(profile || {}); }}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {optional ? ' (optional)' : ''}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { fontSize: 14, color: '#64748b' },
  success: { color: '#16a34a', fontWeight: '600', marginBottom: 16 },
  error: { color: '#dc2626', marginBottom: 12 },
  section: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  field: { marginBottom: 14 },
  label: { fontSize: 14, color: '#334155', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  row: { flexDirection: 'row', gap: 8 },
  row2: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  radio: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  radioActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  radioText: { fontSize: 14, color: '#64748b' },
  radioTextActive: { color: '#2563eb', fontWeight: '600' },
  unitBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  unitBtnActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  unitText: { fontSize: 14, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  chipText: { fontSize: 14, color: '#64748b' },
  chipTextActive: { color: '#2563eb', fontWeight: '600' },
  editBtn: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  editBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelBtnText: { fontSize: 16, color: '#64748b' },
  buttonRow: { flexDirection: 'column', gap: 0 },
});
