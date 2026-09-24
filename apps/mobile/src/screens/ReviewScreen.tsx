/**
 * ReviewScreen — Formulir ulasan hidden gem.
 *
 * Komponen penilaian: Keindahan, Akses Jalan, Fasilitas (masing-masing 1-5 bintang).
 * Setelah submit tampilkan modal sukses dengan poin & kemungkinan badge baru.
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Animated, Platform, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import { ALL_BADGES } from '../config/api';
import type { AppScreen, HiddenGem } from '../types';

interface Props {
  params: { gem: HiddenGem };
  onNavigate: (screen: AppScreen) => void;
  onReviewSubmitted: (points: number) => void;
}

// ── Komponen Rating Bintang ──────────────────────────────────────────────────
function StarRating({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={starStyles.row}>
      <Text style={starStyles.label}>{label}</Text>
      <View style={starStyles.stars}>
        {[1, 2, 3, 4, 5].map((i) => (
          <TouchableOpacity key={i} onPress={() => onChange(i)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
            <Ionicons
              name={i <= value ? 'star' : 'star-outline'}
              size={32}
              color={i <= value ? colors.turmeric : colors.line}
            />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={starStyles.valueText}>{value === 0 ? '–' : value.toFixed(1)}</Text>
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { width: 92, fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  stars: { flex: 1, flexDirection: 'row', gap: 4 },
  valueText: { width: 28, fontFamily: fonts.bold, fontSize: 14, color: colors.ink, textAlign: 'right' },
});

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function ReviewScreen({ params, onNavigate, onReviewSubmitted }: Props) {
  const { gem } = params;
  const [beauty, setBeauty] = useState(0);
  const [access, setAccess] = useState(0);
  const [facilities, setFacilities] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [newBadge, setNewBadge] = useState<string | null>(null);

  const scaleAnim = useRef(new Animated.Value(0)).current;

  const allRated = beauty > 0 && access > 0 && facilities > 0;
  const pointsPreview = allRated ? gem.rewardPoints : 0;

  const handleSubmit = async () => {
    if (!allRated) {
      Alert.alert('Lengkapi Penilaian', 'Berikan nilai untuk Keindahan, Akses Jalan, dan Fasilitas.');
      return;
    }
    setSubmitting(true);
    try {
      // Simulasi submit (API endpoint reviews belum punya Controller)
      // Ganti dengan: await fetch(`${API_BASE_URL}/reviews`, { method: 'POST', ... })
      await new Promise((r) => setTimeout(r, 800));

      const pts = gem.rewardPoints;
      setEarnedPoints(pts);

      // Cek badge baru (simulasi berdasarkan local state)
      const badgeUnlocked = pts >= 50 ? ALL_BADGES[0] : null;
      setNewBadge(badgeUnlocked?.name ?? null);

      onReviewSubmitted(pts);

      // Tampilkan modal sukses dengan animasi
      setSuccessVisible(true);
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
    } catch (e) {
      Alert.alert('Gagal', 'Tidak bisa mengirim ulasan. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    setSuccessVisible(false);
    onNavigate({ name: 'GemList', params: undefined as any });
  };

  // ─────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.ink} />

      {/* Nav */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate({ name: 'Home' })}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Tulis Ulasan</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Info Gem */}
        <View style={styles.gemInfo}>
          <View style={styles.gemIconWrap}>
            <Ionicons name="diamond" size={28} color={colors.turmeric} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.gemName} numberOfLines={2}>{gem.name}</Text>
            <Text style={styles.gemCategory}>{gem.categoryName}</Text>
            <View style={styles.gemMeta}>
              <Ionicons name="location-outline" size={13} color={colors.muted} />
              <Text style={styles.gemMetaText}>
                {gem.distanceKm < 1
                  ? `${Math.round(gem.distanceKm * 1000)} m`
                  : `${gem.distanceKm.toFixed(1).replace('.', ',')} km`}
                {' '}dari {gem.nearestCenter === 'ORIGIN' ? 'titik awal' : 'destinasi'}
              </Text>
            </View>
          </View>
        </View>

        {/* Badge hidden gem */}
        <View style={styles.hiddenGemBadge}>
          <Ionicons name="diamond-outline" size={14} color={colors.sea} />
          <Text style={styles.hiddenGemBadgeText}>
            Tempat ini adalah Hidden Gem — {gem.reviewCount === 0 ? 'belum ada ulasan!' : `baru ${gem.reviewCount} ulasan`}
          </Text>
        </View>

        {/* Rating Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Berikan Penilaianmu</Text>
          <Text style={styles.sectionSub}>Nilai setiap aspek dari 1 (buruk) hingga 5 (sangat baik)</Text>
          <View style={styles.ratingList}>
            <StarRating label="🌅 Keindahan" value={beauty} onChange={setBeauty} />
            <View style={styles.ratingDivider} />
            <StarRating label="🛤️ Akses Jalan" value={access} onChange={setAccess} />
            <View style={styles.ratingDivider} />
            <StarRating label="🏗️ Fasilitas" value={facilities} onChange={setFacilities} />
          </View>
        </View>

        {/* Komentar */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Komentar <Text style={styles.optional}>(opsional)</Text></Text>
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Ceritakan pengalamanmu di sini…"
            placeholderTextColor={colors.line}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Preview poin */}
        {allRated && (
          <View style={styles.pointsPreview}>
            <View style={styles.pointsCoin}>
              <Ionicons name="diamond" size={20} color={colors.turmeric} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pointsTitle}>Kamu akan mendapat {pointsPreview} poin</Text>
              {gem.firstReviewBonusPoints > 0 && (
                <Text style={styles.pointsSub}>
                  Termasuk bonus {gem.firstReviewBonusPoints} poin sebagai pengulas pertama! 🎉
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.submitBtn, (!allRated || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!allRated || submitting}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color={colors.ink} size="small" />
            : <Ionicons name="send" size={18} color={colors.ink} />}
          <Text style={styles.submitText}>{submitting ? 'Mengirim…' : 'Kirim Ulasan'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Modal Sukses ── */}
      <Modal visible={successVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalCard, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.successEmoji}>🎉</Text>
            <Text style={styles.successTitle}>Ulasan Terkirim!</Text>
            <Text style={styles.successSub}>Terima kasih sudah membantu penjelajah lain menemukan hidden gem ini.</Text>

            <View style={styles.pointsBig}>
              <Text style={styles.pointsBigLabel}>Poin Diperoleh</Text>
              <Text style={styles.pointsBigValue}>+{earnedPoints}</Text>
            </View>

            {newBadge && (
              <View style={styles.badgeUnlocked}>
                <Text style={styles.badgeUnlockedIcon}>🏅</Text>
                <View>
                  <Text style={styles.badgeUnlockedTitle}>Lencana Baru!</Text>
                  <Text style={styles.badgeUnlockedName}>{newBadge}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
              <Text style={styles.doneBtnText}>Kembali ke Daftar</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
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

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  // Gem info
  gemInfo: {
    flexDirection: 'row', gap: 12,
    backgroundColor: colors.paper, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.line,
  },
  gemIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center',
  },
  gemName: { fontFamily: fonts.extraBold, fontSize: 16, color: colors.ink, lineHeight: 22 },
  gemCategory: { fontFamily: fonts.bold, fontSize: 13, color: colors.sea, marginTop: 2 },
  gemMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  gemMetaText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },

  // Hidden gem badge
  hiddenGemBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.mist, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: colors.line,
  },
  hiddenGemBadgeText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.sea },

  // Cards
  card: {
    backgroundColor: colors.paper, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: colors.line, gap: 12,
  },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  sectionSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: -6 },
  optional: { fontFamily: fonts.regular, color: colors.muted },

  // Rating list
  ratingList: { gap: 12 },
  ratingDivider: { height: 1, backgroundColor: colors.line },

  // Comment
  commentInput: {
    fontFamily: fonts.regular, fontSize: 14, color: colors.ink,
    borderWidth: 1.5, borderColor: colors.line, borderRadius: 12,
    padding: 12, minHeight: 100,
  },

  // Points preview
  pointsPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.turmericLight, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.turmeric,
  },
  pointsCoin: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  pointsTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  pointsSub: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 2 },

  // Submit
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.turmeric, borderRadius: 16, paddingVertical: 16,
    shadowColor: colors.turmeric, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  submitText: { fontFamily: fonts.extraBold, fontSize: 16, color: colors.ink },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: {
    backgroundColor: colors.paper, borderRadius: 28, padding: 28,
    width: '100%', alignItems: 'center', gap: 12,
  },
  successEmoji: { fontSize: 56 },
  successTitle: { fontFamily: fonts.extraBold, fontSize: 24, color: colors.ink },
  successSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  pointsBig: {
    backgroundColor: colors.ink, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32,
    alignItems: 'center', width: '100%',
  },
  pointsBigLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.mist },
  pointsBigValue: { fontFamily: fonts.extraBold, fontSize: 40, color: colors.turmeric, lineHeight: 48 },
  badgeUnlocked: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.turmericLight, borderRadius: 14, padding: 14, width: '100%',
    borderWidth: 1, borderColor: colors.turmeric,
  },
  badgeUnlockedIcon: { fontSize: 32 },
  badgeUnlockedTitle: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted },
  badgeUnlockedName: { fontFamily: fonts.extraBold, fontSize: 16, color: colors.ink },
  doneBtn: {
    backgroundColor: colors.sea, borderRadius: 14, paddingVertical: 14, width: '100%', alignItems: 'center',
  },
  doneBtnText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
});
