import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import type { AlternativeDestination } from '../types';

interface Props {
  visible: boolean;
  gem: AlternativeDestination | null;
  onClose: () => void;
  onSelectAsDestination?: (gem: AlternativeDestination) => void;
  onWriteReview?: (gem: AlternativeDestination) => void;
}

export default function DestinationDetailModal({
  visible,
  gem,
  onClose,
  onSelectAsDestination,
  onWriteReview,
}: Props) {
  if (!gem) return null;

  const handleOpenGoogleMaps = () => {
    if (gem.mapLink) {
      Linking.openURL(gem.mapLink);
    } else {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          gem.name + ' ' + gem.district + ' Bali'
        )}`
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={colors.ink} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Image */}
            <View style={styles.imageContainer}>
              {gem.imageUrl ? (
                <Image source={{ uri: gem.imageUrl }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={[styles.image, styles.imageFallback]}>
                  <Ionicons name="compass" size={48} color={colors.sea} />
                </View>
              )}

              <View style={styles.similarityBadge}>
                <Ionicons name="sparkles" size={14} color={colors.ink} />
                <Text style={styles.similarityText}>{gem.similarityScore}% Serupa</Text>
              </View>
            </View>

            {/* Place Info */}
            <View style={styles.infoSection}>
              <View style={styles.categoryRow}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{gem.category}</Text>
                </View>
                <View style={styles.hubBadge}>
                  <Ionicons name="radio-outline" size={12} color={colors.sea} />
                  <Text style={styles.hubBadgeText}>Radius 15 km • {gem.distanceFromHubKm} km</Text>
                </View>
              </View>

              <Text style={styles.title}>{gem.name}</Text>
              <Text style={styles.location}>
                📍 {gem.district}, {gem.city}, Bali
              </Text>

              {/* Similarity Explanation */}
              <View style={styles.reasonCard}>
                <Ionicons name="bulb-outline" size={18} color={colors.turmericDark} />
                <View style={styles.reasonTextWrap}>
                  <Text style={styles.reasonTitle}>Alasan Rekomendasi Lokayana AI</Text>
                  <Text style={styles.reasonBody}>{gem.similarityReason}</Text>
                </View>
              </View>

              {/* Rating statistics */}
              <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>★ {gem.rating.toFixed(1)}</Text>
                  <Text style={styles.statLbl}>Rating Google</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{gem.reviewCount}</Text>
                  <Text style={styles.statLbl}>Total Ulasan</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>~{gem.estimatedTravelMinutes} m</Text>
                  <Text style={styles.statLbl}>Estimasi Motor</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.mapsBtn}
                  onPress={handleOpenGoogleMaps}
                  activeOpacity={0.8}
                >
                  <Ionicons name="map" size={16} color={colors.sea} />
                  <Text style={styles.mapsBtnText}>Buka Google Maps</Text>
                </TouchableOpacity>

                {onSelectAsDestination && (
                  <TouchableOpacity
                    style={styles.switchDestBtn}
                    onPress={() => {
                      onSelectAsDestination(gem);
                      onClose();
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="flag" size={16} color="#FFFFFF" />
                    <Text style={styles.switchDestText}>Jadikan Destinasi</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Write review CTA */}
              {onWriteReview && (
                <TouchableOpacity
                  style={styles.reviewBtn}
                  onPress={() => {
                    onWriteReview(gem);
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={18} color={colors.ink} />
                  <Text style={styles.reviewBtnText}>Tulis Ulasan & Klaim Poin (+{gem.rewardPoints})</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'android' ? 24 : 36,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.line,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scroll: { paddingBottom: 20 },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    backgroundColor: colors.mist,
  },
  image: { width: '100%', height: '100%' },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  similarityBadge: {
    position: 'absolute',
    top: 12,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.turmeric,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    elevation: 3,
  },
  similarityText: { fontFamily: fonts.extraBold, fontSize: 12, color: colors.ink },
  infoSection: { padding: 16 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  categoryBadge: {
    backgroundColor: colors.mist,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.sea },
  hubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(27, 107, 102, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hubBadgeText: { fontFamily: fonts.medium, fontSize: 11, color: colors.sea },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
    color: colors.ink,
    marginBottom: 4,
  },
  location: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginBottom: 14 },
  reasonCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.turmericLight,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(244, 180, 26, 0.4)',
    marginBottom: 16,
  },
  reasonTextWrap: { flex: 1 },
  reasonTitle: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink, marginBottom: 2 },
  reasonBody: { fontFamily: fonts.regular, fontSize: 12, color: colors.ink, lineHeight: 17 },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.mist,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontFamily: fonts.extraBold, fontSize: 15, color: colors.ink },
  statLbl: { fontFamily: fonts.medium, fontSize: 10, color: colors.muted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.line },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  mapsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.sea,
  },
  mapsBtnText: { fontFamily: fonts.bold, fontSize: 13, color: colors.sea },
  switchDestBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.sea,
  },
  switchDestText: { fontFamily: fonts.bold, fontSize: 13, color: '#FFFFFF' },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.turmeric,
    paddingVertical: 12,
    borderRadius: 10,
  },
  reviewBtnText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
});
