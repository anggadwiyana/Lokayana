/**
 * HiddenGemCard — kartu rekomendasi tempat wisata yang belum banyak diulas.
 *
 * Arah desain
 *  - Palet laut dalam + kunyit. Semua elemen tenang (hijau-tinta, hijau laut, kabut);
 *    satu-satunya warna hangat adalah pita reward berwarna kunyit di bagian bawah,
 *    sehingga mata langsung tertuju ke insentif ulasan.
 *  - Koin "+50" diberi cincin tipis seperti cap koin agar terasa seperti hadiah.
 *  - Bar rating adalah informasi (3 komponen penilaian), bukan dekorasi.
 *  - Tanpa animasi masuk. Satu-satunya gerak adalah umpan balik saat pita ditekan.
 *
 * Font: Plus Jakarta Sans (dirancang di Jakarta). Muat di root aplikasi.
 */
import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { HiddenGem } from '../types';
import { colors, fonts } from '../theme';

// Re-export agar kompatibel dengan kode lama yang mungkin mengimport dari sini
export type { HiddenGem as HiddenGemDto } from '../types';

const CENTER_LABEL: Record<'ORIGIN' | 'DESTINATION' | 'MERGED', string> = {
  ORIGIN: 'dari titik awal',
  DESTINATION: 'dari tujuan',
  MERGED: 'dari area',
};

// Format Indonesia: koma sebagai pemisah desimal
const formatDecimal = (n: number) => n.toFixed(1).replace('.', ',');
const formatDistance = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${formatDecimal(km)} km`;

export interface HiddenGemCardProps {
  gem: HiddenGem;
  /** Buka halaman detail tempat. */
  onPressCard?: (gem: HiddenGem) => void;
  /** Buka formulir ulasan (3 penilaian: keindahan, akses jalan, fasilitas). */
  onPressReview?: (gem: HiddenGem) => void;
}

function RatingRow({ label, value }: { label: string; value: number | null }) {
  const ratio = value === null ? 0 : Math.max(0, Math.min(1, value / 5));
  return (
    <View
      style={styles.ratingRow}
      accessible
      accessibilityLabel={
        value === null ? `${label}: belum dinilai` : `${label}: ${formatDecimal(value)} dari 5`
      }
    >
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%` as `${number}%` }]} />
      </View>
      <Text style={styles.ratingValue}>{value === null ? '–' : formatDecimal(value)}</Text>
    </View>
  );
}

function HiddenGemCardBase({ gem, onPressCard, onPressReview }: HiddenGemCardProps) {
  const ratings = gem.ratings;
  const hasRatings =
    ratings &&
    (ratings.beauty !== null || ratings.access !== null || ratings.facilities !== null);

  const reviewText = gem.reviewCount === 0 ? 'Belum ada ulasan' : `Baru ${gem.reviewCount} ulasan`;
  const distance = gem.distanceKm ?? gem.distanceFromHubKm ?? 0;
  const categoryName = gem.categoryName ?? gem.category;

  return (
    <View style={styles.card}>
      {/* ---------- Bagian informasi: foto + detail ---------- */}
      <Pressable
        onPress={() => onPressCard?.(gem)}
        accessibilityRole="button"
        accessibilityLabel={`Lihat detail ${gem.name}`}
      >
        <View style={styles.photoWrap}>
          {gem.coverPhotoUrl ?? gem.imageUrl ? (
            <Image source={{ uri: gem.coverPhotoUrl ?? gem.imageUrl! }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={[styles.photo, styles.photoFallback]}>
              <Ionicons name="compass-outline" size={40} color={colors.sea} />
            </View>
          )}

          <View style={styles.gemChip}>
            <Ionicons name="diamond-outline" size={14} color="#FFFFFF" />
            <Text style={styles.gemChipText}>Belum Banyak yang Tahu</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>
            {gem.name}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.category} numberOfLines={1}>
              {categoryName}
            </Text>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={colors.muted} />
              <Text style={styles.metaText}>
                {formatDistance(distance)} {CENTER_LABEL[gem.nearestCenter]}
              </Text>
            </View>
          </View>

          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color={colors.muted} />
            <Text style={styles.metaText}>{reviewText}</Text>
          </View>

          <View style={styles.ratings}>
            {hasRatings && ratings ? (
              <>
                <RatingRow label="Keindahan" value={ratings.beauty} />
                <RatingRow label="Akses Jalan" value={ratings.access} />
                <RatingRow label="Fasilitas" value={ratings.facilities} />
              </>
            ) : (
              <Text style={styles.emptyRatings}>
                Belum ada penilaian. Ulasanmu akan jadi yang pertama.
              </Text>
            )}
          </View>
        </View>
      </Pressable>

      {/* ---------- Pita reward: elemen paling menonjol di kartu ---------- */}
      <Pressable
        onPress={() => onPressReview?.(gem)}
        android_ripple={{ color: colors.turmericDark }}
        style={({ pressed }) => [styles.reward, pressed && styles.rewardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Tulis ulasan untuk ${gem.name} dan dapatkan ${gem.rewardPoints} poin`}
      >
        <View style={styles.coin}>
          <View style={styles.coinInner}>
            <Text style={styles.coinText}>+{gem.rewardPoints}</Text>
          </View>
        </View>

        <View style={styles.rewardCopy}>
          <Text style={styles.rewardTitle}>Tulis ulasan, dapatkan {gem.rewardPoints} poin</Text>
          <Text style={styles.rewardSub}>
            {gem.firstReviewBonusPoints > 0
              ? `Termasuk bonus ${gem.firstReviewBonusPoints} poin sebagai pengulas pertama`
              : 'Nilai keindahan, akses jalan, dan fasilitas'}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color={colors.ink} />
      </Pressable>
    </View>
  );
}

export const HiddenGemCard = memo(HiddenGemCardBase);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },

  // Foto
  photoWrap: { height: 150, backgroundColor: colors.mist },
  photo: { width: '100%', height: '100%' },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  gemChip: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(14, 42, 43, 0.88)',
  },
  gemChipText: { fontFamily: fonts.bold, fontSize: 12, color: '#FFFFFF' },

  // Isi
  body: { padding: 16, gap: 8 },
  name: { fontFamily: fonts.extraBold, fontSize: 19, lineHeight: 25, color: colors.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  category: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 13, color: colors.sea },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },

  // Rating
  ratings: { marginTop: 6, gap: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ratingLabel: { width: 84, fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.mist, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.sea },
  ratingValue: { width: 28, textAlign: 'right', fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  emptyRatings: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.muted },

  // Pita reward
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.turmeric,
  },
  rewardPressed: { backgroundColor: colors.turmericDark },
  coin: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.ink, padding: 3 },
  coinInner: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(244, 180, 26, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinText: { fontFamily: fonts.extraBold, fontSize: 15, color: colors.turmeric },
  rewardCopy: { flex: 1, gap: 2 },
  rewardTitle: { fontFamily: fonts.extraBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  rewardSub: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 17, color: colors.ink },
});
