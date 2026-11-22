import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AppText from './AppText';
import Thumbnail from './Thumbnail';
import { colors, radius } from '../theme';
import { formatDuration } from '../utils/format';

const meta = (c) => `${c.category} · ${c.videoCount} video · ${formatDuration(c.totalDurationSec)}`;

/** layout="card": kartu geser (Beranda) | layout="row": baris (hasil pencarian) */
export default function ClassCard({ item, onPress, layout = 'card' }) {
  if (layout === 'row') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${meta(item)}`}
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
      >
        <Thumbnail uri={item.thumbnailUrl} style={styles.rowThumb} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText weight="bold">{item.title}</AppText>
          <AppText style={styles.meta}>{meta(item)}</AppText>
        </View>
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${meta(item)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
    >
      <Thumbnail uri={item.thumbnailUrl} style={styles.cardThumb} />
      <AppText weight="bold" numberOfLines={1}>
        {item.title}
      </AppText>
      <AppText style={styles.meta} numberOfLines={1}>
        {meta(item)}
      </AppText>
      {item.reason ? (
        <AppText weight="semibold" style={styles.reason} numberOfLines={1}>
          {item.reason}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 210, gap: 6 },
  cardThumb: { height: 118, borderRadius: radius.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 },
  rowThumb: { width: 88, height: 56, borderRadius: 10 },
  meta: { fontSize: 13, color: colors.muted },
  reason: { fontSize: 12, color: colors.primaryDark },
});
