/**
 * ProfileScreen — Profil pengguna, poin gamifikasi, dan lencana.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import { ALL_BADGES } from '../config/api';
import type { AppScreen } from '../types';

interface Props {
  totalPoints: number;
  hiddenGemReviews: number;
  onNavigate: (screen: AppScreen) => void;
}

export default function ProfileScreen({ totalPoints, hiddenGemReviews, onNavigate }: Props) {
  // Tentukan badge yang sudah diraih berdasarkan jumlah ulasan
  const earnedBadges = ALL_BADGES.filter((b) => hiddenGemReviews >= b.minReviews);
  const nextBadge = ALL_BADGES.find((b) => hiddenGemReviews < b.minReviews);
  const progress = nextBadge
    ? Math.min((hiddenGemReviews / nextBadge.minReviews) * 100, 100)
    : 100;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.ink} />

      {/* Nav */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate({ name: 'Home' })}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Profil & Hadiah</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Avatar & Nama ── */}
        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>🧭</Text>
          </View>
          <Text style={styles.heroName}>Penjelajah Bali</Text>
          <Text style={styles.heroSub}>Bergabung sebagai Penjelajah Permata</Text>

          {/* Total poin */}
          <View style={styles.pointsBadge}>
            <Ionicons name="diamond" size={18} color={colors.turmeric} />
            <Text style={styles.pointsValue}>{totalPoints}</Text>
            <Text style={styles.pointsLabel}>poin</Text>
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{hiddenGemReviews}</Text>
            <Text style={styles.statName}>Ulasan{'\n'}Hidden Gem</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{earnedBadges.length}</Text>
            <Text style={styles.statName}>Lencana{'\n'}Diraih</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{totalPoints}</Text>
            <Text style={styles.statName}>Total{'\n'}Poin</Text>
          </View>
        </View>

        {/* ── Progress ke badge berikutnya ── */}
        {nextBadge && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Menuju Lencana Berikutnya</Text>
            <View style={styles.nextBadgeRow}>
              <Text style={styles.nextBadgeIcon}>{nextBadge.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.nextBadgeName}>{nextBadge.name}</Text>
                <Text style={styles.nextBadgeDesc}>{nextBadge.description}</Text>
              </View>
              <Text style={styles.nextBadgeCount}>
                {hiddenGemReviews}/{nextBadge.minReviews}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` as `${number}%` }]} />
            </View>
          </View>
        )}

        {/* ── Lencana ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Koleksi Lencana</Text>
          <View style={styles.badgeGrid}>
            {ALL_BADGES.map((badge) => {
              const earned = hiddenGemReviews >= badge.minReviews;
              return (
                <View key={badge.code} style={[styles.badgeItem, !earned && styles.badgeItemLocked]}>
                  <Text style={[styles.badgeIcon, !earned && styles.badgeIconLocked]}>
                    {earned ? badge.icon : '🔒'}
                  </Text>
                  <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]}>
                    {badge.name}
                  </Text>
                  <Text style={[styles.badgeDesc, !earned && styles.badgeDescLocked]}>
                    {badge.description}
                  </Text>
                  {earned && (
                    <View style={styles.earnedPip}>
                      <Ionicons name="checkmark" size={10} color={colors.white} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Info Gamifikasi ── */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.sea} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Cara Mendapat Poin</Text>
            <Text style={styles.infoText}>• Mengulas hidden gem → <Text style={styles.infoHighlight}>50 poin</Text></Text>
            <Text style={styles.infoText}>• Pengulas pertama di aplikasi → <Text style={styles.infoHighlight}>bonus 25 poin</Text></Text>
            <Text style={styles.infoText}>• Hidden gem = tempat dengan {'<'} 10 total ulasan</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // Nav
  navBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.ink, paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingBottom: 16, paddingHorizontal: 16, gap: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 18, color: colors.white, textAlign: 'center' },

  content: { padding: 16, gap: 12 },

  // Hero card
  heroCard: {
    backgroundColor: colors.ink, borderRadius: 24, padding: 24,
    alignItems: 'center', gap: 8,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.sea,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  avatarText: { fontSize: 36 },
  heroName: { fontFamily: fonts.extraBold, fontSize: 22, color: colors.white },
  heroSub: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  pointsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(244,180,26,0.15)', borderRadius: 999,
    paddingVertical: 8, paddingHorizontal: 20, marginTop: 8,
    borderWidth: 1, borderColor: colors.turmeric,
  },
  pointsValue: { fontFamily: fonts.extraBold, fontSize: 28, color: colors.turmeric },
  pointsLabel: { fontFamily: fonts.medium, fontSize: 15, color: colors.mist },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: colors.paper, borderRadius: 16, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: colors.line,
  },
  statNum: { fontFamily: fonts.extraBold, fontSize: 24, color: colors.ink },
  statName: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 2 },

  // Cards
  card: {
    backgroundColor: colors.paper, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: colors.line, gap: 12,
  },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },

  // Progress
  nextBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nextBadgeIcon: { fontSize: 36 },
  nextBadgeName: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  nextBadgeDesc: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  nextBadgeCount: { fontFamily: fonts.bold, fontSize: 14, color: colors.sea },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.mist, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.sea },

  // Badge grid
  badgeGrid: { flexDirection: 'row', gap: 10 },
  badgeItem: {
    flex: 1, backgroundColor: colors.sea, borderRadius: 16, padding: 14,
    alignItems: 'center', gap: 4,
  },
  badgeItemLocked: { backgroundColor: colors.mist },
  badgeIcon: { fontSize: 32 },
  badgeIconLocked: { opacity: 0.4 },
  badgeName: { fontFamily: fonts.bold, fontSize: 12, color: colors.white, textAlign: 'center' },
  badgeNameLocked: { color: colors.muted },
  badgeDesc: { fontFamily: fonts.regular, fontSize: 10, color: colors.mist, textAlign: 'center' },
  badgeDescLocked: { color: colors.muted },
  earnedPip: {
    position: 'absolute', top: 8, right: 8,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.turmeric, alignItems: 'center', justifyContent: 'center',
  },

  // Info
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.mist, borderRadius: 16, padding: 14,
  },
  infoTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, marginBottom: 4 },
  infoText: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 20 },
  infoHighlight: { fontFamily: fonts.bold, color: colors.sea },
});
