import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AppText from '../components/AppText';
import Button from '../components/Button';
import StateView from '../components/StateView';
import Thumbnail from '../components/Thumbnail';
import { Api } from '../services/ApiService';
import { colors, radius } from '../theme';
import { formatDuration } from '../utils/format';

const soon = (what) => Alert.alert('Segera hadir', `${what} akan tersedia di versi berikutnya.`);

export default function ClassDetailScreen({ navigation, route }) {
  const { id } = route.params;
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  const load = useCallback(async () => {
    setState({ status: 'loading', data: null, error: null });
    try {
      const { data } = await Api.classDetail(id);
      setState({ status: 'ready', data, error: null });
    } catch (err) {
      setState({ status: 'error', data: null, error: err.status === 404 ? 'Kelas mini ini tidak ditemukan.' : err.message });
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const c = state.data;
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View>
          <Thumbnail uri={c && c.thumbnailUrl} style={styles.cover} />
          <SafeAreaView edges={['top']} style={styles.overlay} pointerEvents="box-none">
            <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => navigation.goBack()} style={styles.roundBtn}>
              <Feather name="arrow-left" size={22} color={colors.white} />
            </Pressable>
          </SafeAreaView>
        </View>

        {state.status === 'loading' ? <StateView kind="loading" /> : null}
        {state.status === 'error' ? <StateView kind="error" message={state.error} onRetry={load} /> : null}

        {c ? (
          <View style={styles.body}>
            <View style={{ gap: 6 }}>
              <AppText weight="bold" style={{ fontSize: 12, color: colors.primaryDark, letterSpacing: 0.5 }}>
                {c.category.toUpperCase()} · KELAS MINI
              </AppText>
              <AppText weight="extrabold" style={{ fontSize: 24, letterSpacing: -0.2 }}>
                {c.title}
              </AppText>
              <AppText style={{ fontSize: 14, color: colors.muted }}>
                {c.videoCount} video · {formatDuration(c.totalDurationSec)} · dikurasi Tim NobarIlmu
              </AppText>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="Tonton sekarang" onPress={() => soon('Pemutar video dengan Catatan Detik')} style={{ flex: 1 }} />
              <Button title="Nobar kelas ini" variant="outline" onPress={() => soon('Membuat ruang nobar')} style={{ flex: 1 }} />
            </View>

            {c.description ? <AppText style={{ fontSize: 14, lineHeight: 22, color: '#3A3F4B' }}>{c.description}</AppText> : null}

            <View style={{ gap: 4 }}>
              <AppText weight="extrabold" style={{ fontSize: 16, marginBottom: 4 }}>
                Isi kelas
              </AppText>
              {c.videos.length === 0 ? <AppText style={{ color: colors.muted }}>Belum ada video di kelas ini.</AppText> : null}
              {c.videos.map((v, i) => (
                <VideoRow key={v.id} index={i + 1} video={v} onPress={() => soon('Memutar video')} />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function VideoRow({ index, video, onPress }) {
  const p = video.progress;
  const done = p && p.completed;
  const started = p && !done && p.percent > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${index}. ${video.title}${done ? ', selesai' : ''}`}
      onPress={onPress}
      style={styles.videoRow}
    >
      <View style={[styles.badge, done ? { backgroundColor: colors.successBg } : { backgroundColor: started ? colors.primaryTint : colors.surface }]}>
        {done ? (
          <Feather name="check" size={16} color={colors.successText} />
        ) : (
          <AppText weight="extrabold" style={{ fontSize: 14, color: started ? colors.primary : colors.muted }}>
            {index}
          </AppText>
        )}
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <AppText weight="semibold" numberOfLines={2}>
          {index}. {video.title}
        </AppText>
        {started ? (
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${p.percent}%` }]} />
          </View>
        ) : (
          <AppText style={{ fontSize: 13, color: colors.muted }}>
            {formatDuration(video.durationSec)}
            {done ? ' · selesai' : ''}
          </AppText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  cover: { height: 220, width: '100%' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  body: { padding: 20, gap: 18 },
  videoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 4 },
  badge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  track: { height: 4, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 4, backgroundColor: colors.primary },
});
