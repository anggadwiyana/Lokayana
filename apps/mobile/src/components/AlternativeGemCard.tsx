import React, { memo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import type { AlternativeDestination } from '../types';
import { getDestinationImageUrl, getCategoryFallbackImage } from '../utils/imageHelper';

interface Props {
  gem: AlternativeDestination;
  isDualRadius: boolean;
  onPressCard?: (gem: AlternativeDestination) => void;
  onPressReview?: (gem: AlternativeDestination) => void;
}

function AlternativeGemCardComponent({ gem, isDualRadius, onPressCard, onPressReview }: Props) {
  const [imgUri, setImgUri] = useState<string>(() =>
    getDestinationImageUrl(gem.imageUrl, gem.category)
  );

  useEffect(() => {
    setImgUri(getDestinationImageUrl(gem.imageUrl, gem.category));
  }, [gem.imageUrl, gem.category]);

  // Format center badge text
  const getCenterBadge = () => {
    if (!isDualRadius) {
      return {
        text: `${gem.distanceFromHubKm} km dari area`,
        color: colors.sea,
        bg: 'rgba(27, 107, 102, 0.1)',
        icon: 'location-outline' as const,
      };
    }

    if (gem.nearestCenter === 'DESTINATION') {
      return {
        text: `${gem.distanceFromHubKm} km dari Destinasi`,
        color: '#D97706',
        bg: 'rgba(217, 119, 6, 0.12)',
        icon: 'flag-outline' as const,
      };
    }

    return {
      text: `${gem.distanceFromHubKm} km dari Titik Awal`,
      color: '#2563EB',
      bg: 'rgba(37, 99, 235, 0.1)',
      icon: 'navigate-outline' as const,
    };
  };

  const centerBadge = getCenterBadge();

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => onPressCard?.(gem)}
        android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
        style={styles.cardPressable}
      >
        {/* Cover Photo */}
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: imgUri }}
            style={styles.photo}
            resizeMode="cover"
            onError={() => setImgUri(getCategoryFallbackImage(gem.category))}
          />

          {/* AI Similarity Badge */}
          <View style={styles.similarityBadge}>
            <Ionicons name="sparkles" size={12} color={colors.ink} />
            <Text style={styles.similarityScore}>{gem.similarityScore}% Serupa</Text>
          </View>

          {/* Radius Hub Badge */}
          <View style={[styles.hubBadge, { backgroundColor: centerBadge.bg }]}>
            <Ionicons name={centerBadge.icon} size={11} color={centerBadge.color} />
            <Text style={[styles.hubBadgeText, { color: centerBadge.color }]}>
              {centerBadge.text}
            </Text>
          </View>
        </View>

        {/* Content Body */}
        <View style={styles.body}>
          {/* Similarity Reason Tag */}
          <View style={styles.reasonRow}>
            <Ionicons name="git-branch-outline" size={12} color={colors.sea} />
            <Text style={styles.reasonText} numberOfLines={1}>
              {gem.similarityReason}
            </Text>
          </View>

          {/* Place Name */}
          <Text style={styles.placeName} numberOfLines={2}>
            {gem.name}
          </Text>

          {/* Category & Location */}
          <View style={styles.metaRow}>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>{gem.category}</Text>
            </View>
            <View style={styles.locationItem}>
              <Ionicons name="map-outline" size={12} color={colors.muted} />
              <Text style={styles.locationText} numberOfLines={1}>
                {gem.district}, {gem.city}
              </Text>
            </View>
          </View>

          {/* Rating & Review stats */}
          <View style={styles.statsRow}>
            <View style={styles.ratingWrap}>
              <Ionicons name="star" size={14} color={colors.turmeric} />
              <Text style={styles.ratingVal}>{gem.rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({gem.reviewCount} ulasan)</Text>
            </View>

            {gem.reviewCount < 100 && (
              <View style={styles.hiddenGemPill}>
                <Ionicons name="diamond" size={11} color={colors.turmericDark} />
                <Text style={styles.hiddenGemPillText}>Hidden Gem</Text>
              </View>
            )}
          </View>
        </View>

        {/* Gamification Reward Strip */}
        <TouchableOpacity
          style={styles.rewardStrip}
          onPress={() => onPressReview?.(gem)}
          activeOpacity={0.8}
        >
          <View style={styles.rewardLeft}>
            <View style={styles.coinBadge}>
              <Text style={styles.coinText}>+{gem.rewardPoints}</Text>
            </View>
            <View>
              <Text style={styles.rewardTitle}>Tulis Ulasan Pertama</Text>
              <Text style={styles.rewardSub}>Dapatkan bonus +{gem.firstReviewBonusPoints} poin penjelajah</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.ink} />
        </TouchableOpacity>
      </Pressable>
    </View>
  );
}

export const AlternativeGemCard = memo(AlternativeGemCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardPressable: {},
  photoContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
    backgroundColor: colors.mist,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mist,
  },
  photoFallbackText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  similarityBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.turmeric,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    elevation: 3,
  },
  similarityScore: {
    fontFamily: fonts.extraBold,
    fontSize: 11,
    color: colors.ink,
  },
  hubBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
  },
  hubBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  body: {
    padding: 14,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  reasonText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.sea,
  },
  placeName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.ink,
    lineHeight: 22,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  categoryChip: {
    backgroundColor: colors.mist,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.sea,
  },
  locationItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingVal: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.ink,
  },
  reviewCount: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  hiddenGemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.turmericLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hiddenGemPillText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.turmericDark,
  },
  rewardStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(244, 180, 26, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(244, 180, 26, 0.3)',
  },
  rewardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  coinBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.turmeric,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinText: {
    fontFamily: fonts.extraBold,
    fontSize: 10,
    color: colors.ink,
  },
  rewardTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.ink,
  },
  rewardSub: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
  },
});
