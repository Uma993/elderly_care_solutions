import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FamilyElderProvider } from '../context/FamilyElderContext';
import { useMainApp } from '../context/MainAppContext';
import type { MainStackParamList } from '../navigation/MainNavigator';
import type { StoredUser } from '../auth/storage';

const cardStyle = (bg: string) => ({
  flex: 1,
  minHeight: 100,
  borderRadius: 12,
  backgroundColor: bg,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  padding: 16,
});

function ElderGrid({ user }: { user: StoredUser }) {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList, 'Dashboard'>>();
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.welcome}>Welcome, {user.fullName}!</Text>
      <View style={styles.grid}>
        <Pressable style={cardStyle('#22c55e')} onPress={() => navigation.navigate('Tasks')}>
          <Text style={styles.cardTitle}>Today's Tasks</Text>
        </Pressable>
        <Pressable style={cardStyle('#f97316')} onPress={() => navigation.navigate('Medicines')}>
          <Text style={styles.cardTitle}>Medication Reminder</Text>
        </Pressable>
        <Pressable style={cardStyle('#3b82f6')} onPress={() => navigation.navigate('VoiceAssistant')}>
          <Text style={styles.cardTitle}>Request Help</Text>
        </Pressable>
        <Pressable style={cardStyle('#dc2626')} onPress={() => navigation.navigate('Sos')}>
          <Text style={styles.cardTitle}>SOS Emergency</Text>
        </Pressable>
        <Pressable style={cardStyle('#64748b')} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.cardTitle}>Profile</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function FamilyGrid({ user }: { user: StoredUser }) {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList, 'Dashboard'>>();
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.welcome}>Welcome, {user.fullName}!</Text>
      <Text style={styles.subtitle}>
        Monitor your loved one's medicines and recent health updates in one calm view.
      </Text>
      <View style={styles.gridFamily}>
        <Pressable style={cardStyle('#dc2626')} onPress={() => navigation.navigate('SosAlerts')}>
          <Text style={styles.cardTitle}>SOS Alerts</Text>
        </Pressable>
        <Pressable style={cardStyle('#f97316')} onPress={() => navigation.navigate('Medicines')}>
          <Text style={styles.cardTitle}>Medicines</Text>
        </Pressable>
        <Pressable style={cardStyle('#22c55e')} onPress={() => navigation.navigate('Tasks')}>
          <Text style={styles.cardTitle}>Tasks</Text>
        </Pressable>
        <Pressable style={cardStyle('#3b82f6')} onPress={() => navigation.navigate('VoiceAssistant')}>
          <Text style={styles.cardTitle}>Voice assistant</Text>
        </Pressable>
        <Pressable style={cardStyle('#6366f1')} onPress={() => navigation.navigate('Overview')}>
          <Text style={styles.cardTitle}>Elder overview</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

export default function DashboardScreen() {
  const { user, token } = useMainApp();
  const isElder = user.role === 'elderly';

  if (isElder) {
    return <ElderGrid user={user} />;
  }
  return (
    <FamilyElderProvider token={token} userId={user.id}>
      <FamilyGrid user={user} />
    </FamilyElderProvider>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
  welcome: { fontSize: 22, fontWeight: '700', marginBottom: 8, color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridFamily: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cardTitle: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
