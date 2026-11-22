// Tab yang fiturnya dibangun di tahap berikutnya (Nobar, Sumbang). API-nya sudah ada di backend.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AppText from '../components/AppText';
import { colors } from '../theme';

export default function PlaceholderScreen({ route }) {
  const { icon, title, description } = route.params;
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.box}>
        <View style={styles.iconWrap}>
          <Feather name={icon} size={30} color={colors.primary} />
        </View>
        <AppText weight="extrabold" style={{ fontSize: 22 }}>
          {title}
        </AppText>
        <AppText style={{ color: colors.muted, textAlign: 'center', lineHeight: 22 }}>{description}</AppText>
        <AppText weight="semibold" style={{ color: colors.primaryDark, fontSize: 13 }}>
          Segera hadir di versi berikutnya
        </AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  iconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
