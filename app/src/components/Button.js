import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import AppText from './AppText';
import { colors, radius } from '../theme';

/** variant: primary (oranye penuh) | outline (garis oranye) | text (tanpa latar) */
export default function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, style }) {
  const inactive = disabled || loading;
  const isPrimary = variant === 'primary';
  const textColor = isPrimary ? colors.white : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'outline' && styles.outline,
        variant === 'text' && styles.text,
        inactive && styles.inactive,
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <AppText weight="bold" style={{ color: textColor, fontSize: 16 }}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primary: { backgroundColor: colors.primary },
  outline: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.white },
  text: { backgroundColor: 'transparent' },
  inactive: { opacity: 0.55 },
});
