import React, { useState } from 'react';
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
import { apiFetch } from '../api/client';
import type { StoredUser } from '../auth/storage';

type Props = {
  onRegistered: (data: { user?: StoredUser; token?: string; message?: string }) => void;
  onSwitchToLogin: () => void;
};

export default function RegisterScreen({ onRegistered, onSwitchToLogin }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'elderly' | 'family'>('elderly');
  const [relation, setRelation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (): string => {
    if (!fullName?.trim() || !email?.trim() || !password || !confirmPassword || !role) {
      return 'Please fill in all required fields.';
    }
    if (!email.includes('@')) return 'Please enter a valid email address.';
    if (password.length < 6) return 'Password should be at least 6 characters long.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    if (role === 'family' && !relation?.trim()) return 'Please specify your relation for family members.';
    return '';
  };

  const handleSubmit = async () => {
    setError('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          confirmPassword,
          role,
          phone: phone.trim() || undefined,
          relation: role === 'family' ? relation.trim() : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'Registration failed. Please try again.');
        return;
      }
      onRegistered(data);
    } catch {
      setError('Unable to reach the server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create account</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Full name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Your name"
          placeholderTextColor="#94a3b8"
          editable={!loading}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <Text style={styles.label}>Phone (optional)</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone number"
          placeholderTextColor="#94a3b8"
          keyboardType="phone-pad"
          editable={!loading}
        />

        <Text style={styles.label}>Registering as</Text>
        <View style={styles.roleRow}>
          <Pressable
            style={[styles.roleBtn, role === 'elderly' && styles.roleBtnActive]}
            onPress={() => setRole('elderly')}
          >
            <Text style={[styles.roleText, role === 'elderly' && styles.roleTextActive]}>Elderly user</Text>
          </Pressable>
          <Pressable
            style={[styles.roleBtn, role === 'family' && styles.roleBtnActive]}
            onPress={() => setRole('family')}
          >
            <Text style={[styles.roleText, role === 'family' && styles.roleTextActive]}>Family member</Text>
          </Pressable>
        </View>

        {role === 'family' ? (
          <>
            <Text style={styles.label}>Relation (e.g. daughter, son)</Text>
            <TextInput
              style={styles.input}
              value={relation}
              onChangeText={setRelation}
              placeholder="Relation"
              placeholderTextColor="#94a3b8"
              editable={!loading}
            />
          </>
        ) : null}

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          editable={!loading}
        />

        <Text style={styles.label}>Confirm password</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm password"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          editable={!loading}
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </Pressable>

        <Pressable onPress={onSwitchToLogin} style={styles.linkWrap}>
          <Text style={styles.link}>Already registered? Go to login</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, color: '#0f172a' },
  error: { color: '#dc2626', marginBottom: 12, fontSize: 14 },
  label: { fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  roleBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  roleBtnActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  roleText: { fontSize: 14, color: '#64748b' },
  roleTextActive: { color: '#2563eb', fontWeight: '600' },
  button: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkWrap: { marginTop: 16, alignItems: 'center' },
  link: { color: '#2563eb', fontSize: 14 },
});
