import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function PlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>This screen is a placeholder. Full implementation coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  text: { fontSize: 16, color: '#64748b', textAlign: 'center' },
});
