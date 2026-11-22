import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import AppText from '../components/AppText';
import ClassCard from '../components/ClassCard';
import StateView from '../components/StateView';
import Thumbnail from '../components/Thumbnail';
import { useAuth } from '../context/AuthContext';
import { Api } from '../services/ApiService';
import { colors, fonts, radius } from '../theme';
import { firstName, greeting, initial } from '../utils/format';
import useDebounced from '../utils/useDebounced';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query.trim(), 400);
  const [home, setHome] = useState({ status: 'loading', recommended: [], rooms: [], error: null });
  const [search, setSearch] = useState({ status: 'idle', items: [], error: null });
  const [refreshing, setRefreshing] = useState(false);
  const [searchTry, setSearchTry] = useState(0); // dinaikkan oleh tombol "Coba lagi"

  const loadHome = useCallback(async () => {
    try {
      // Rekomendasi wajib berhasil; daftar nobar boleh gagal tanpa merusak seluruh halaman.
      const [rec, rooms] = await Promise.all([Api.recommendedClasses(), Api.publicRooms().catch(() => null)]);
      setHome({ status: 'ready', recommended: rec.data, rooms: rooms ? rooms.data : [], error: null });
    } catch (err) {
      setHome((h) => ({ ...h, status: 'error', error: err.message }));
    }
  }, []);

  // Muat ulang tiap Beranda dibuka lagi, supaya rekomendasi ikut progres tontonan terbaru.
  useFocusEffect(
    useCallback(() => {
      loadHome();
    }, [loadHome])
  );

  useEffect(() => {
    if (!debounced) {
      setSearch({ status: 'idle', items: [], error: null });
      return undefined;
    }
    let cancelled = false;
    setSearch({ status: 'loading', items: [], error: null });
    Api.searchClasses(debounced)
      .then(({ data }) => !cancelled && setSearch({ status: 'ready', items: data, error: null }))
      .catch((err) => !cancelled && setSearch({ status: 'error', items: [], error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [debounced, searchTry]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHome();
    setRefreshing(false);
  };

  const openClass = (c) => navigation.navigate('ClassDetail', { id: c.id });
  const joinRoom = () => Alert.alert('Segera hadir', 'Bergabung ke ruang nobar akan tersedia di versi berikutnya.');

  const searching = query.trim().length > 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View>
            <AppText style={{ fontSize: 14, color: colors.muted }}>{greeting()},</AppText>
            <AppText weight="extrabold" style={{ fontSize: 22, letterSpacing: -0.2 }}>
              {firstName(user.name)}
            </AppText>
          </View>
          <View style={styles.avatar} accessibilityLabel={`Akun ${user.name}`}>
            <AppText weight="extrabold" style={{ color: colors.primaryDark, fontSize: 18 }}>
              {initial(user.name)}
            </AppText>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Feather name="search" size={20} color={colors.muted} />
          <TextInput
            accessibilityLabel="Cari kelas mini"
            placeholder="Cari kelas mini, mis. batik"
            placeholderTextColor="#8A90A0"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            style={styles.searchInput}
          />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Hapus pencarian" onPress={() => setQuery('')} hitSlop={10}>
              <Feather name="x" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {searching ? (
          <View style={{ gap: 12 }}>
            <AppText weight="extrabold" style={styles.h2}>
              Hasil pencarian
            </AppText>
            {search.status === 'loading' || search.status === 'idle' ? <StateView kind="loading" message="Mencari…" compact /> : null}
            {search.status === 'error' ? <StateView kind="error" message={search.error} onRetry={() => setSearchTry((n) => n + 1)} compact /> : null}
            {search.status === 'ready' && search.items.length === 0 ? (
              <StateView kind="empty" icon="search" message={`Tidak ada kelas mini untuk “${debounced}”.`} compact />
            ) : null}
            {search.status === 'ready'
              ? search.items.map((c) => <ClassCard key={c.id} item={c} layout="row" onPress={() => openClass(c)} />)
              : null}
          </View>
        ) : (
          <>
            {home.status === 'loading' ? <StateView kind="loading" message="Menyiapkan kelas untukmu…" /> : null}
            {home.status === 'error' ? <StateView kind="error" message={home.error} onRetry={loadHome} /> : null}
            {home.status === 'ready' ? (
              <>
                <View style={{ gap: 12 }}>
                  <AppText weight="extrabold" style={styles.h2}>
                    Untuk kamu
                  </AppText>
                  {home.recommended.length === 0 ? (
                    <StateView kind="empty" icon="book-open" message="Belum ada kelas mini yang tersedia." compact />
                  ) : (
                    <FlatList
                      horizontal
                      data={home.recommended}
                      keyExtractor={(c) => String(c.id)}
                      renderItem={({ item }) => <ClassCard item={item} onPress={() => openClass(item)} />}
                      ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 20 }}
                    />
                  )}
                </View>

                <View style={{ gap: 10 }}>
                  <AppText weight="extrabold" style={styles.h2}>
                    Lagi ramai di-nobar
                  </AppText>
                  {home.rooms.length === 0 ? (
                    <AppText style={{ color: colors.muted }}>Belum ada ruang nobar publik yang aktif.</AppText>
                  ) : (
                    home.rooms.slice(0, 5).map((r) => (
                      <View key={r.code} style={styles.room}>
                        <Thumbnail uri={r.video.thumbnailUrl} style={styles.roomThumb} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <AppText weight="bold" numberOfLines={1}>
                            {r.video.title}
                          </AppText>
                          <AppText style={{ fontSize: 13, color: colors.muted }} numberOfLines={1}>
                            {r.memberCount} orang · host {r.host.name}
                          </AppText>
                        </View>
                        <Pressable accessibilityRole="button" accessibilityLabel={`Gabung ruang ${r.video.title}`} onPress={joinRoom} style={styles.joinBtn}>
                          <AppText weight="bold" style={{ color: colors.primary, fontSize: 14 }}>
                            Gabung
                          </AppText>
                        </Pressable>
                      </View>
                    ))
                  )}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { padding: 20, paddingTop: 12, gap: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  searchBox: { height: 48, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, paddingVertical: 0 },
  h2: { fontSize: 18 },
  room: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg },
  roomThumb: { width: 52, height: 52, borderRadius: 12 },
  joinBtn: { height: 40, minWidth: 72, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
