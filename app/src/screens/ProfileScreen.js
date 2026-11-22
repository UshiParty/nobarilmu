import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import AppText from '../components/AppText';
import StateView from '../components/StateView';
import Thumbnail from '../components/Thumbnail';
import { useAuth } from '../context/AuthContext';
import { Api } from '../services/ApiService';
import { colors, radius } from '../theme';
import { initial } from '../utils/format';

const STATUS = {
  menunggu: { label: 'Menunggu', bg: colors.warnBg, fg: colors.warnText },
  disetujui: { label: 'Disetujui', bg: colors.successBg, fg: colors.successText },
  ditolak: { label: 'Ditolak', bg: colors.dangerBg, fg: colors.dangerText },
};

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [state, setState] = useState({ status: 'loading', stats: null, history: [], submissions: [], error: null });

  const load = useCallback(async () => {
    try {
      const [stats, history, subs] = await Promise.all([Api.myStats(), Api.myHistory(10), Api.mySubmissions()]);
      setState({ status: 'ready', stats: stats.data, history: history.data, submissions: subs.data, error: null });
    } catch (err) {
      setState((s) => ({ ...s, status: 'error', error: err.message }));
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const confirmSignOut = () =>
    Alert.alert('Keluar dari NobarIlmu?', 'Kamu perlu masuk lagi untuk melanjutkan belajar.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: signOut },
    ]);

  const resume = state.history.find((h) => !h.completed);
  const { stats } = state;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <View style={styles.avatar}>
            <AppText weight="extrabold" style={{ fontSize: 22, color: colors.primaryDark }}>
              {initial(user.name)}
            </AppText>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText weight="extrabold" style={{ fontSize: 20 }}>
              {user.name}
            </AppText>
            <AppText style={{ fontSize: 13, color: colors.muted }}>
              {user.interests.length ? `Minat: ${user.interests.join(' · ')}` : 'Belum memilih minat'}
            </AppText>
          </View>
        </View>

        {state.status === 'loading' ? <StateView kind="loading" /> : null}
        {state.status === 'error' ? <StateView kind="error" message={state.error} onRetry={load} /> : null}

        {state.status === 'ready' ? (
          <>
            <View style={styles.stats}>
              <Stat value={stats.videosCompleted} label="video selesai" />
              <Stat value={stats.notesWritten} label="catatan" />
              <Stat value={stats.nobarJoined} label="kali nobar" />
            </View>

            <View style={{ gap: 8 }}>
              <AppText weight="extrabold" style={styles.h2}>
                Lanjut nonton
              </AppText>
              {resume ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Lanjut nonton ${resume.title}`}
                  onPress={() => navigation.navigate('ClassDetail', { id: resume.classId })}
                  style={styles.resume}
                >
                  <Thumbnail uri={resume.thumbnailUrl} style={styles.resumeThumb} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <AppText weight="semibold" numberOfLines={1} style={{ fontSize: 14 }}>
                      {resume.title}
                    </AppText>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${resume.percent}%` }]} />
                    </View>
                  </View>
                </Pressable>
              ) : (
                <AppText style={{ color: colors.muted }}>Belum ada video yang sedang kamu tonton.</AppText>
              )}
            </View>

            <View style={{ gap: 8 }}>
              <AppText weight="extrabold" style={styles.h2}>
                Video yang aku sumbang
              </AppText>
              {state.submissions.length === 0 ? (
                <AppText style={{ color: colors.muted }}>Belum ada video yang kamu sumbang.</AppText>
              ) : (
                state.submissions.map((s) => {
                  const st = STATUS[s.status] || STATUS.menunggu;
                  return (
                    <View key={s.id} style={styles.sub}>
                      <AppText weight="semibold" numberOfLines={1} style={{ flex: 1, fontSize: 14 }}>
                        {s.title}
                      </AppText>
                      <View style={[styles.pill, { backgroundColor: st.bg }]}>
                        <AppText weight="bold" style={{ fontSize: 12, color: st.fg }}>
                          {st.label}
                        </AppText>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        ) : null}

        <View style={styles.menu}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Interests', { onboarding: false })}
            style={styles.menuRow}
          >
            <AppText weight="semibold">Ubah minat</AppText>
            <Feather name="chevron-right" size={18} color={colors.muted} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={confirmSignOut} style={styles.menuRow}>
            <AppText weight="bold" style={{ color: colors.error }}>
              Keluar
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <AppText weight="extrabold" style={{ fontSize: 22 }}>
        {value}
      </AppText>
      <AppText style={{ fontSize: 12, color: colors.muted }}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { padding: 20, paddingTop: 12, gap: 20 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, gap: 2 },
  h2: { fontSize: 16 },
  resume: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  resumeThumb: { width: 64, height: 40, borderRadius: 8 },
  track: { height: 4, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 4, backgroundColor: colors.primary },
  sub: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  pill: { height: 26, paddingHorizontal: 10, borderRadius: radius.pill, justifyContent: 'center' },
  menu: { borderTopWidth: 1, borderTopColor: colors.line },
  menuRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F0F1F3' },
});
