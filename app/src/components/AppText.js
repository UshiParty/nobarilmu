import React from 'react';
import { Text } from 'react-native';
import { colors, fonts } from '../theme';

/** Teks dengan font Plus Jakarta Sans. weight: regular | medium | semibold | bold | extrabold */
export default function AppText({ weight = 'regular', style, ...props }) {
  return <Text {...props} style={[{ fontFamily: fonts[weight], color: colors.ink, fontSize: 15 }, style]} />;
}
