import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AppText from '../components/AppText';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { validateConfirm, validateEmail, validateName, validatePassword } from '../utils/validation';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const setErr = (key, msg) => setErrors((e) => ({ ...e, [key]: msg }));

  const submit = async () => {
    const next = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: validateConfirm(password, confirm),
    };
    setErrors(next);
    setFormError(null);
    if (Object.values(next).some(Boolean)) return;

    setLoading(true);
    try {
      await register(name, email, password);
    } catch (err) {
      if (err.status === 409) {
        setErr('email', 'Email ini sudah terdaftar. Coba masuk.');
      } else if (err.code === 'VALIDATION_ERROR' && err.details && err.details.field) {
        setErr(err.details.field, err.message);
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
          <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => navigation.goBack()} style={styles.back}>
            <Feather name="arrow-left" size={22} color={colors.ink} />
          </Pressable>

          <View style={{ gap: 6 }}>
            <AppText weight="extrabold" style={{ fontSize: 28, letterSpacing: -0.4 }}>
              Buat akun
            </AppText>
            <AppText style={{ color: colors.muted, lineHeight: 22 }}>Daftar sekali, lalu belajar bareng lewat kelas mini dan nobar.</AppText>
          </View>

          <View style={{ gap: 18 }}>
            {formError ? (
              <View style={styles.banner} accessibilityRole="alert">
                <Feather name="alert-circle" size={18} color={colors.error} />
                <AppText weight="medium" style={{ flex: 1, color: colors.error, fontSize: 14 }}>
                  {formError}
                </AppText>
              </View>
            ) : null}
            <TextField
              label="Nama"
              value={name}
              onChangeText={setName}
              onBlur={() => setErr('name', validateName(name))}
              error={errors.name}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              placeholder="Nama lengkap"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current && emailRef.current.focus()}
            />
            <TextField
              label="Email"
              inputRef={emailRef}
              value={email}
              onChangeText={setEmail}
              onBlur={() => setErr('email', validateEmail(email))}
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
              onBlur={() => setErr('password', validatePassword(password))}
              error={errors.password}
              secureTextEntry
              textContentType="newPassword"
              placeholder="Minimal 8 karakter"
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current && confirmRef.current.focus()}
            />
            <TextField
              label="Ulangi kata sandi"
              inputRef={confirmRef}
              value={confirm}
              onChangeText={setConfirm}
              onBlur={() => setErr('confirm', validateConfirm(password, confirm))}
              error={errors.confirm}
              secureTextEntry
              textContentType="newPassword"
              placeholder="Ketik ulang kata sandi"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            <Button title="Daftar" onPress={submit} loading={loading} style={{ marginTop: 6 }} />
          </View>

          <View style={styles.footer}>
            <AppText style={{ color: colors.muted }}>Sudah punya akun?</AppText>
            <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.link}>
              <AppText weight="bold" style={{ color: colors.primary }}>
                Masuk
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
  content: { flexGrow: 1, padding: 24, gap: 24 },
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  banner: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.errorTint, borderRadius: 12, padding: 12 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
});
