import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { colors } from '../theme';

/** Gambar sampul dari YouTube; kalau gagal dimuat atau kosong, tampil blok warna. */
export default function Thumbnail({ uri, style }) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) return <View style={[{ backgroundColor: colors.coverFallback }, style]} />;
  return (
    <Image
      source={{ uri }}
      style={[{ backgroundColor: colors.coverFallback }, style]}
      resizeMode="cover"
      onError={() => setFailed(true)}
      accessibilityIgnoresInvertColors
    />
  );
}
