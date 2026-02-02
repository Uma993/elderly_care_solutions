import { Platform } from 'react-native';

/**
 * API base URL. Android emulator: 10.0.2.2; iOS simulator: localhost;
 * physical device: your machine's LAN IP (e.g. http://192.168.1.x:4000/api).
 * Override by changing this constant or via env if using react-native-config.
 */
export const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://192.168.42.73:4000/api'
    : 'http://localhost:4000/api';
