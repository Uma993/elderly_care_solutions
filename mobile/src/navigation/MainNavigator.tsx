import React from 'react';
import { Pressable, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMainApp } from '../context/MainAppContext';
import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';

export type MainStackParamList = {
  Dashboard: undefined;
  Profile: undefined;
  Tasks: undefined;
  Medicines: undefined;
  VoiceAssistant: undefined;
  Sos: undefined;
  SosAlerts: undefined;
  Overview: undefined;
  Inactivity: undefined;
  Calendar: undefined;
  Timeline: undefined;
  Routine: undefined;
  ElderOverview: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainNavigator() {
  const { onLogout } = useMainApp();

  return (
    <Stack.Navigator
      screenOptions={{
        headerRight: () => (
          <Pressable onPress={() => onLogout()} style={{ marginRight: 12, padding: 8 }}>
            <Text style={{ color: '#2563eb', fontSize: 14 }}>Log out</Text>
          </Pressable>
        ),
      }}
    >
      <Stack.Screen name="Dashboard" options={{ title: 'Elderly Care' }} component={DashboardScreen} />
      <Stack.Screen name="Profile" options={{ title: 'Profile' }} component={ProfileScreen} />
      <Stack.Screen name="Tasks" options={{ title: "Today's Tasks" }} component={PlaceholderScreen} />
      <Stack.Screen name="Medicines" options={{ title: 'Medicines' }} component={PlaceholderScreen} />
      <Stack.Screen name="VoiceAssistant" options={{ title: 'Request Help' }} component={PlaceholderScreen} />
      <Stack.Screen name="Sos" options={{ title: 'SOS Emergency' }} component={PlaceholderScreen} />
      <Stack.Screen name="SosAlerts" options={{ title: 'SOS Alerts' }} component={PlaceholderScreen} />
      <Stack.Screen name="Overview" options={{ title: 'Elder Overview' }} component={PlaceholderScreen} />
      <Stack.Screen name="Inactivity" options={{ title: 'Inactivity' }} component={PlaceholderScreen} />
      <Stack.Screen name="Calendar" options={{ title: 'Calendar' }} component={PlaceholderScreen} />
      <Stack.Screen name="Timeline" options={{ title: 'Timeline' }} component={PlaceholderScreen} />
      <Stack.Screen name="Routine" options={{ title: 'Routine' }} component={PlaceholderScreen} />
      <Stack.Screen name="ElderOverview" options={{ title: 'Elder Overview' }} component={PlaceholderScreen} />
    </Stack.Navigator>
  );
}
