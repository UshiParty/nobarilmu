import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AppText from './AppText';
import { colors, fonts, radius } from '../theme';

/** Kolom isian dengan label di atas dan pesan error merah di bawah. */
export default function TextField({ label, error, secureTextEntry, style, inputRef, ...inputProps }) {
  const [hidden, setHidden] = useState(!!secureTextEntry);
  return (
    <View style={[styles.wrap, style]}>
      <AppText weight="semibold" style={{ fontSize: 14 }}>
        {label}
      </AppText>
      <View style={[styles.box, !!error && styles.boxError]}>
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          placeholderTextColor="#8A90A0"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={hidden}
          style={styles.input}
          {...inputProps}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Tampilkan kata sandi' : 'Sembunyikan kata sandi'}
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            style={styles.eye}
          >
            <Feather name={hidden ? 'eye' : 'eye-off'} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText weight="medium" accessibilityLiveRegion="polite" style={{ fontSize: 13, color: colors.error }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  box: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
  },
  boxError: { borderColor: colors.error },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.ink, paddingVertical: 12 },
  eye: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
