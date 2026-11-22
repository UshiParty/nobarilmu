import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AppText from '../components/AppText';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { validateEmail, validatePassword } from '../utils/validation';

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef(null);

  const checkEmail = () => setErrors((e) => ({ ...e, email: validateEmail(email) }));
  const checkPassword = () => setErrors((e) => ({ ...e, password: validatePassword(password) }));

  const submit = async () => {
    const next = { email: validateEmail(email), password: validatePassword(password) };
    setErrors(next);
    setFormError(null);
    if (next.email || next.password) return;

    setLoading(true);
    try {
      await signIn(email, password);
      // berhasil: navigator otomatis pindah (Pilih Minat untuk akun baru, Beranda untuk akun lama)
    } catch (err) {
      if (err.code === 'VALIDATION_ERROR' && err.details && err.details.field) {
        setErrors((e) => ({ ...e, [err.details.field]: err.message }));
      } else {
        setFormError(err.message);
      }
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Feather name="play-circle" size={32} color={colors.white} />
            </View>
            <View style={{ gap: 6 }}>
              <AppText weight="extrabold" style={{ fontSize: 32, letterSpacing: -0.5 }}>
                NobarIlmu
              </AppText>
              <AppText style={{ fontSize: 16, color: colors.muted }}>Nonton bareng, ngerti bareng.</AppText>
            </View>
          </View>

          <View style={styles.form}>
            {formError ? (
              <View style={styles.banner} accessibilityRole="alert">
                <Feather name="alert-circle" size={18} color={colors.error} />
                <AppText weight="medium" style={{ flex: 1, color: colors.error, fontSize: 14 }}>
                  {formError}
                </AppText>
              </View>
            ) : null}

            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              onBlur={checkEmail}
              error={errors.email}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              placeholder="nama@contoh.id"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current && passwordRef.current.focus()}
            />
            <TextField
              label="Kata sandi"
              inputRef={passwordRef}
              value={password}
              onChangeText={setPassword}
              onBlur={checkPassword}
              error={errors.password}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              placeholder="Minimal 8 karakter"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            <Button title="Masuk" onPress={submit} loading={loading} style={{ marginTop: 6 }} />
          </View>

          <View style={styles.footer}>
            <AppText style={{ color: colors.muted }}>Belum punya akun?</AppText>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Register')} style={styles.link}>
              <AppText weight="bold" style={{ color: colors.primary }}>
                Daftar
              </AppText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { flexGrow: 1, padding: 28, paddingTop: 48, gap: 28 },
  brand: { gap: 16, alignItems: 'flex-start' },
  logo: { width: 64, height: 64, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  form: { gap: 18 },
  banner: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.errorTint, borderRadius: 12, padding: 12 },
  footer: { marginTop: 'auto', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
});
