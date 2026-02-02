import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiFetch } from '../api/client';
import type { StoredUser } from '../auth/storage';

type Props = {
  onSuccess: (user: StoredUser, token: string) => void;
  onSwitchToRegister: () => void;
};

export default function LoginScreen({ onSuccess, onSwitchToRegister }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'Login failed. Please try again.');
        return;
      }
      const user = data.user as StoredUser;
      const token = data.token as string;
      if (user?.id && user?.role && token) {
        onSuccess(user, token);
      } else {
        setError('Invalid response from server.');
      }
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
      <View style={styles.form}>
        <Text style={styles.title}>Welcome back!</Text>
        <Text style={styles.subtitle}>Sign in to stay connected.</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

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

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
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
            <Text style={styles.buttonText}>Log in</Text>
          )}
        </Pressable>

        <Pressable onPress={onSwitchToRegister} style={styles.linkWrap}>
          <Text style={styles.link}>Don't have an account? Sign Up</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  form: { maxWidth: 400, width: '100%', alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8, color: '#0f172a' },
  subtitle: { fontSize: 16, color: '#64748b', marginBottom: 24 },
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
