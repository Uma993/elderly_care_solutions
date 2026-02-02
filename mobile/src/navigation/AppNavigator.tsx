import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import MainNavigator from './MainNavigator';
import { MainAppProvider } from '../context/MainAppContext';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function LoginScreenWrapper({ navigation }: { navigation: any }) {
  const { setAuth } = useAuth();
  return (
    <LoginScreen
      onSuccess={(u, t) => setAuth(u, t)}
      onSwitchToRegister={() => navigation.navigate('Register')}
    />
  );
}

function RegisterScreenWrapper({ navigation }: { navigation: any }) {
  const { setAuth } = useAuth();
  return (
    <RegisterScreen
      onRegistered={(data) => {
        if (data.user && data.token) {
          setAuth(data.user, data.token);
        } else {
          navigation.navigate('Login');
        }
      }}
      onSwitchToLogin={() => navigation.navigate('Login')}
    />
  );
}

export default function AppNavigator() {
  const { user, token, isLoading, logout } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user || !token) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: true }}>
          <Stack.Screen name="Login" options={{ title: 'Elderly Care' }} component={LoginScreenWrapper} />
          <Stack.Screen name="Register" options={{ title: 'Sign Up' }} component={RegisterScreenWrapper} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <MainAppProvider user={user} token={token} onLogout={logout}>
        <MainNavigator />
      </MainAppProvider>
    </NavigationContainer>
  );
}
