/**
 * GemListScreen — Hasil Navigasi Rute Tercepat & Rekomendasi Cerdas Lokayana AI
 *
 * Fitur:
 *  1. Peta Interaktif (OpenStreetMap/CartoDB tiles tanpa layar hitam di Android):
 *     - Marker Titik Awal (Biru)
 *     - Marker Destinasi Utama / Multi-Stop Pins Berurutan [1], [2], [3] (Teal)
 *     - Polyline Rute Jalan Tercepat (OSRM Driving Route)
 *     - Lingkaran Radius 15 km di setiap simpul rute
 *     - Marker Tempat Alternatif Terkait (Emas)
 *  2. Kartu Rute Tercepat (Komparasi Motor vs Mobil + Stop-by-stop)
 *  3. Filter Tab Alternatif (Semua / Dekat Destinasi / Dekat Titik Awal)
 *  4. Daftar Rekomendasi Tempat Serupa dengan Skor AI
 */
import React, { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LeafletMapView from '../components/LeafletMapView';
import { colors, fonts } from '../theme';
import type { AppScreen, RecommendationResponse, AlternativeDestination } from '../types';
import FastestRouteCard from '../components/FastestRouteCard';
import { AlternativeGemCard } from '../components/AlternativeGemCard';
import DestinationDetailModal from '../components/DestinationDetailModal';

interface Props {
  params: RecommendationResponse;
  onNavigate: (screen: AppScreen) => void;
  onSwitchDestination?: (gem: AlternativeDestination) => void;
}

export default function GemListScreen({ params, onNavigate, onSwitchDestination }: Props) {
  const {
    origin,
    destination,
    orderedDestinations,
    stops,
    straightDistanceKm,
    isDualRadius,
    searchAreas,
    route,
    alternatives,
  } = params;

  const effectiveStops = orderedDestinations ?? stops ?? [];
  const isMultiStop = effectiveStops.length > 1;

  const [selectedGem, setSelectedGem] = useState<AlternativeDestination | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | 'DESTINATION' | 'ORIGIN'>('ALL');

  // Filter alternatif berdasarkan tab yang dipilih
  const filteredAlternatives = useMemo(() => {
    if (activeFilterTab === 'DESTINATION') {
      return alternatives.filter((a) => a.nearestCenter === 'DESTINATION');
    }
    if (activeFilterTab === 'ORIGIN') {
      return alternatives.filter((a) => a.nearestCenter === 'ORIGIN');
    }
    return alternatives;
  }, [alternatives, activeFilterTab]);

  const destCount = useMemo(
    () => alternatives.filter((a) => a.nearestCenter === 'DESTINATION').length,
    [alternatives]
  );
  const originCount = useMemo(
    () => alternatives.filter((a) => a.nearestCenter === 'ORIGIN').length,
    [alternatives]
  );

  const handlePressCard = (gem: AlternativeDestination) => {
    setSelectedGem(gem);
    setDetailModalVisible(true);
  };

  const handlePressReview = (gem: AlternativeDestination) => {
    onNavigate({ name: 'Review', params: { gem } });
  };

  // ── ListHeaderComponent ──────────────────────────────────────────────
  const ListHeader = (
    <View style={styles.headerContainer}>
      {/* ── Peta Interaktif Leaflet (100% Terlihat, Bebas Layar Hitam) ── */}
      <View style={styles.mapWrap}>
        <LeafletMapView
          style={styles.map}
          origin={origin}
          destination={destination}
          stops={effectiveStops}
          polylineCoords={route.polylineCoords}
          searchAreas={searchAreas}
          alternatives={filteredAlternatives}
          onAlternativePress={handlePressCard}
        />
      </View>

      {/* ── Kartu Rute Tercepat (Komparasi Motor vs Mobil + Multi-stop) ── */}
      <FastestRouteCard
        route={route}
        origin={origin}
        destination={destination}
        stops={effectiveStops}
      />

      {/* ── Radius Mode Status Card ── */}
      <View style={styles.radiusStatusBox}>
        <View style={styles.radiusStatusHeader}>
          <Ionicons
            name={isDualRadius ? 'git-network-outline' : 'radio-outline'}
            size={18}
            color={colors.sea}
          />
          <Text style={styles.radiusStatusTitle}>
            {isMultiStop
              ? `Rute Multi-Destinasi: ${effectiveStops.length} Tempat Wisata`
              : isDualRadius
              ? `Mode 2 Radius: Jarak ${straightDistanceKm} km (> 15 km)`
              : `Mode 1 Radius: Jarak ${straightDistanceKm} km (≤ 15 km)`}
          </Text>
        </View>
        <Text style={styles.radiusStatusDesc}>
          {isMultiStop
            ? `Sistem menyusun urutan rute tercepat (Greedy TSP) dan memetakan zona 15 km di setiap titik destinasi.`
            : isDualRadius
            ? `Karena jarak di atas 15 km, sistem mencari alternatif di 2 radius 15 km (dekat Titik Awal dan dekat Destinasi Tujuan).`
            : `Karena jarak di bawah 15 km, sistem menggabungkan pencarian dalam 1 radius 15 km di sekitar destinasi.`}
        </Text>
      </View>

      {/* ── Tab Filter (jika 2 Radius) ── */}
      {isDualRadius && (
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, activeFilterTab === 'ALL' && styles.filterTabActive]}
            onPress={() => setActiveFilterTab('ALL')}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilterTab === 'ALL' && styles.filterTabTextActive,
              ]}
            >
              Semua ({alternatives.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              activeFilterTab === 'DESTINATION' && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilterTab('DESTINATION')}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilterTab === 'DESTINATION' && styles.filterTabTextActive,
              ]}
            >
              Dekat Destinasi ({destCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeFilterTab === 'ORIGIN' && styles.filterTabActive]}
            onPress={() => setActiveFilterTab('ORIGIN')}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilterTab === 'ORIGIN' && styles.filterTabTextActive,
              ]}
            >
              Dekat Titik Awal ({originCount})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Section Title ── */}
      <View style={styles.listTitleWrap}>
        <Text style={styles.listTitle}>Rekomendasi Alternatif Serupa</Text>
        <Text style={styles.listSub}>
          Disaring berdasarkan kemiripan vibe, rating tinggi, dan berada dalam radius 15 km
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.ink} />

      {/* ── Top Bar ── */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => onNavigate({ name: 'Home' })}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.navTitleWrap}>
          <Text style={styles.navRoute} numberOfLines={1}>
            {isMultiStop
              ? `${origin.name} → ${effectiveStops.length} Destinasi`
              : `${origin.name} → ${destination.name}`}
          </Text>
          <Text style={styles.navSub}>Rute Optimal & Rekomendasi Terkait</Text>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => onNavigate({ name: 'Profile' })}
        >
          <Ionicons name="person-circle-outline" size={28} color={colors.turmeric} />
        </TouchableOpacity>
      </View>

      {/* ── Content List ── */}
      <FlatList
        data={filteredAlternatives}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AlternativeGemCard
            gem={item}
            isDualRadius={isDualRadius}
            onPressCard={() => handlePressCard(item)}
            onPressReview={() => handlePressReview(item)}
          />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trail-sign-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>Belum Ada Alternatif Terdekat</Text>
            <Text style={styles.emptyDesc}>
              Tidak ditemukan tempat wisata serupa dalam radius 15 km dari rute ini.
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* ── Modal Detail Destinasi ── */}
      <DestinationDetailModal
        gem={selectedGem}
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        onSelectAsDestination={
          onSwitchDestination
            ? (gem: AlternativeDestination) => {
                setDetailModalVisible(false);
                onSwitchDestination(gem);
              }
            : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.mist },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ink,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 8 : 44,
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitleWrap: { flex: 1 },
  navRoute: { fontFamily: fonts.bold, fontSize: 14, color: '#FFFFFF' },
  navSub: { fontFamily: fonts.regular, fontSize: 11, color: colors.mist, marginTop: 1 },
  profileBtn: { padding: 4 },
  headerContainer: { paddingBottom: 6 },
  mapWrap: { width: '100%', height: 280, position: 'relative' },
  map: { width: '100%', height: '100%' },
  marker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
  },
  originMarker: { backgroundColor: '#2563EB' },
  stopMarker: { backgroundColor: colors.sea },
  destMarker: { backgroundColor: '#DC2626' },
  stopNumberText: {
    color: '#FFFFFF',
    fontFamily: fonts.extraBold,
    fontSize: 12,
  },
  gemMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.turmeric,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.ink,
    elevation: 3,
  },
  gemMarkerDest: { backgroundColor: colors.turmeric },
  gemMarkerOrigin: { backgroundColor: '#60A5FA' },
  resetMapBtn: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  radiusStatusBox: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  radiusStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  radiusStatusTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.ink,
  },
  radiusStatusDesc: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
  },
  filterTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterTabActive: { backgroundColor: colors.sea },
  filterTabText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  filterTabTextActive: {
    fontFamily: fonts.bold,
    color: '#FFFFFF',
  },
  listTitleWrap: {
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 4,
  },
  listTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    color: colors.ink,
  },
  listSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  listContent: { paddingBottom: 32 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.ink,
    marginTop: 12,
  },
  emptyDesc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
