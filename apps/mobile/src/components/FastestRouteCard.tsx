import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import type { RouteInfo, Coordinate } from '../types';

interface Props {
  route: RouteInfo;
  origin: Coordinate & { name: string };
  destination: Coordinate & { name: string };
}

export default function FastestRouteCard({ route, origin, destination }: Props) {
  const handleOpenGoogleMaps = () => {
    const url = Platform.select({
      ios: `maps://app?saddr=${origin.lat},${origin.lng}&daddr=${destination.lat},${destination.lng}`,
      android: `google.navigation:q=${destination.lat},${destination.lng}`,
      default: `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`,
    });

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(
            `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`
          );
        }
      })
      .catch(() => {
        Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`
        );
      });
  };

  const timeDiff = route.carDurationMinutes - route.motorDurationMinutes;

  return (
    <View style={styles.card}>
      {/* Header Banner */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons name="flash" size={13} color={colors.ink} />
          <Text style={styles.badgeText}>RUTE TERCEPAT DITEMUKAN</Text>
        </View>
        <Text style={styles.distanceValue}>{route.roadDistanceKm} km</Text>
      </View>

      {/* Modes comparison */}
      <View style={styles.modesRow}>
        {/* Motor - Highlighted as fastest */}
        <View style={[styles.modeBox, styles.modeBoxActive]}>
          <View style={styles.modeIconWrapActive}>
            <Ionicons name="bicycle" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.modeTextWrap}>
            <View style={styles.modeTitleRow}>
              <Text style={styles.modeTitleActive}>Sepeda Motor</Text>
              <View style={styles.fastestTag}>
                <Text style={styles.fastestTagText}>Tercepat</Text>
              </View>
            </View>
            <Text style={styles.modeTimeActive}>~{route.motorDurationMinutes} Menit</Text>
          </View>
        </View>

        {/* Mobil */}
        <View style={styles.modeBox}>
          <View style={styles.modeIconWrap}>
            <Ionicons name="car" size={18} color={colors.sea} />
          </View>
          <View style={styles.modeTextWrap}>
            <Text style={styles.modeTitle}>Mobil</Text>
            <Text style={styles.modeTime}>~{route.carDurationMinutes} Menit</Text>
          </View>
        </View>
      </View>

      {/* Summary Note */}
      {timeDiff > 0 && (
        <View style={styles.noteRow}>
          <Ionicons name="information-circle-outline" size={16} color={colors.sea} />
          <Text style={styles.noteText}>
            Hemat ~{timeDiff} menit menggunakan motor melalui rute alternatif Bali.
          </Text>
        </View>
      )}

      {/* Action Button */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={handleOpenGoogleMaps}
        activeOpacity={0.85}
      >
        <Ionicons name="navigate" size={16} color="#FFFFFF" />
        <Text style={styles.navButtonText}>Mulai Navigasi di Google Maps</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: -24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.line,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.turmeric,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: fonts.extraBold,
    fontSize: 10,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  distanceValue: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: colors.ink,
  },
  modesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  modeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mist,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  modeBoxActive: {
    backgroundColor: 'rgba(27, 107, 102, 0.08)',
    borderColor: colors.sea,
  },
  modeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  modeIconWrapActive: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.sea,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  modeTextWrap: { flex: 1 },
  modeTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modeTitle: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  modeTitleActive: { fontFamily: fonts.bold, fontSize: 11, color: colors.sea },
  fastestTag: {
    backgroundColor: colors.turmeric,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  fastestTagText: { fontFamily: fonts.bold, fontSize: 8, color: colors.ink },
  modeTime: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, marginTop: 2 },
  modeTimeActive: { fontFamily: fonts.extraBold, fontSize: 14, color: colors.sea, marginTop: 2 },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(27, 107, 102, 0.06)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  noteText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.sea,
    lineHeight: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.sea,
    paddingVertical: 12,
    borderRadius: 10,
  },
  navButtonText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
