// Pilih Minat. Dipakai dua kali:
//   onboarding = true  : pertama kali masuk (tidak bisa kembali; ada "Lewati")
//   onboarding = false : "Ubah minat" dari Profil (ada tombol kembali)
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AppText from '../components/AppText';
import Button from '../components/Button';
import StateView from '../components/StateView';
import { useAuth } from '../context/AuthContext';
import { Api } from '../services/ApiService';
import { colors } from '../theme';

export default function InterestsScreen({ navigation, route }) {
  const onboarding = !!(route.params && route.params.onboarding);
  const { user, updateUser } = useAuth();
  const [options, setOptions] = useState({ status: 'loading', list: [], error: null });
  const [picked, setPicked] = useState(() => new Set(user ? user.interests : []));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const load = useCallback(async () => {
    setOptions({ status: 'loading', list: [], error: null });
    try {
      const { data } = await Api.interests();
      setOptions({ status: 'ready', list: data, error: null });
    } catch (err) {
      setOptions({ status: 'error', list: [], error: err.message });
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const toggle = (label) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  const save = async (labels) => {
    setSaving(true);
    setSaveError(null);
    try {
      const { data } = await Api.saveInterests(labels);
      updateUser(data); // onboarding: navigator otomatis pindah ke Beranda
      if (!onboarding) navigation.goBack();
    } catch (err) {
      setSaveError(err.message);
      setSaving(false);
    }
  };

  const count = picked.size;
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.top}>
        {onboarding ? (
          <AppText weight="bold" style={styles.step}>
            LANGKAH 1 DARI 1
          </AppText>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Feather name="arrow-left" size={22} color={colors.ink} />
          </Pressable>
        )}
        {onboarding && options.status === 'ready' ? (
          <Pressable accessibilityRole="button" onPress={() => save(options.list)} disabled={saving} style={styles.skip}>
            <AppText weight="semibold" style={{ color: colors.primary }}>
              Lewati
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ gap: 8 }}>
          <AppText weight="extrabold" style={{ fontSize: 28, lineHeight: 34, letterSpacing: -0.4 }}>
            Kamu suka belajar tentang apa?
          </AppText>
          <AppText style={{ color: colors.muted, lineHeight: 22 }}>
            Pilih minimal satu. Kami pakai ini untuk menyusun rekomendasi kelas mini.
          </AppText>
        </View>

        {options.status === 'loading' ? <StateView kind="loading" /> : null}
        {options.status === 'error' ? <StateView kind="error" message={options.error} onRetry={load} /> : null}
        {options.status === 'ready' ? (
          <View style={styles.chips}>
            {options.list.map((label) => {
              const on = picked.has(label);
              return (
                <Pressable
                  key={label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => toggle(label)}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <AppText weight="semibold" style={{ color: on ? colors.primaryDark : colors.ink }}>
                    {on ? '✓ ' : ''}
                    {label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.bottom}>
        {saveError ? (
          <AppText weight="medium" style={{ color: colors.error, textAlign: 'center', fontSize: 13 }} accessibilityRole="alert">
            {saveError}
          </AppText>
        ) : null}
        <AppText style={{ color: colors.muted, textAlign: 'center', fontSize: 14 }}>{count} minat dipilih</AppText>
        <Button
          title={onboarding ? 'Lanjut' : 'Simpan'}
          onPress={() => save([...picked])}
          disabled={count === 0 || options.status !== 'ready'}
          loading={saving}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, minHeight: 52 },
  step: { fontSize: 13, color: colors.muted, letterSpacing: 0.5 },
  iconBtn: { width: 44, height: 44, justifyContent: 'center' },
  skip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  content: { padding: 24, paddingTop: 12, gap: 24 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.primaryTint, borderColor: colors.primary },
  bottom: { padding: 24, paddingTop: 8, gap: 12 },
});
