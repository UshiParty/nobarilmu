import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AppText from './AppText';
import Button from './Button';
import { colors } from '../theme';

/**
 * Tampilan untuk tiga kondisi yang wajib ditangani tiap layar:
 *   kind="loading" | "error" (dengan tombol Coba lagi) | "empty"
 */
export default function StateView({ kind, message, onRetry, icon = 'inbox', compact = false }) {
  return (
    <View style={[styles.wrap, compact && styles.compact]} accessibilityLiveRegion="polite">
      {kind === 'loading' ? (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText style={styles.text}>{message || 'Memuat…'}</AppText>
        </>
      ) : (
        <>
          <Feather name={kind === 'error' ? 'wifi-off' : icon} size={32} color={kind === 'error' ? colors.error : colors.muted} />
          <AppText style={styles.text}>{message || (kind === 'error' ? 'Terjadi kesalahan.' : 'Belum ada data.')}</AppText>
          {kind === 'error' && onRetry ? <Button title="Coba lagi" variant="outline" onPress={onRetry} style={{ minWidth: 140 }} /> : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  compact: { padding: 12 },
  text: { color: colors.muted, textAlign: 'center', lineHeight: 22 },
});
