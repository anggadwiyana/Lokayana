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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LeafletMapView, { LeafletMapViewHandle } from '../components/LeafletMapView';
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

  const leafletRef = useRef<LeafletMapViewHandle>(null);
  const fullscreenLeafletRef = useRef<LeafletMapViewHandle>(null);

  const [selectedGem, setSelectedGem] = useState<AlternativeDestination | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | 'DESTINATION' | 'ORIGIN'>('ALL');
  const [isMapLocked, setIsMapLocked] = useState(false);
  const [fullscreenMapVisible, setFullscreenMapVisible] = useState(false);

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
      {/* ── Kontrol Peta & Hitbox Area Interaktif ── */}
      <View style={[styles.mapContainer, isMapLocked && styles.mapContainerActive]}>
        {/* Map Toolbar Controls */}
        <View style={styles.mapToolbar}>
          <TouchableOpacity
            style={[styles.lockToggleBtn, isMapLocked && styles.lockToggleBtnActive]}
            onPress={() => setIsMapLocked((prev) => !prev)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isMapLocked ? 'lock-closed' : 'hand-left-outline'}
              size={15}
              color={isMapLocked ? '#FFFFFF' : colors.sea}
            />
            <Text style={[styles.lockToggleText, isMapLocked && styles.lockToggleTextActive]}>
              {isMapLocked ? 'Mode Geser Peta: AKTIF' : 'Kunci Layar (Geser Peta)'}
            </Text>
          </TouchableOpacity>

          <View style={styles.mapToolbarRight}>
            <TouchableOpacity
              style={styles.toolbarIconBtn}
              onPress={() => leafletRef.current?.resetView()}
              activeOpacity={0.7}
              accessibilityLabel="Pusatkan Rute"
            >
              <Ionicons name="locate-outline" size={17} color={colors.ink} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolbarIconBtn}
              onPress={() => setFullscreenMapVisible(true)}
              activeOpacity={0.7}
              accessibilityLabel="Layar Penuh"
            >
              <Ionicons name="scan-outline" size={17} color={colors.ink} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Peta Interaktif Leaflet ── */}
        <View style={[styles.mapWrap, isMapLocked && styles.mapWrapActive]}>
          <LeafletMapView
            ref={leafletRef}
            style={styles.map}
            origin={origin}
            destination={destination}
            stops={effectiveStops}
            polylineCoords={route.polylineCoords}
            searchAreas={searchAreas}
            alternatives={filteredAlternatives}
            onAlternativePress={handlePressCard}
          />

          {/* Active Helper Banner when isMapLocked is TRUE */}
          {isMapLocked ? (
            <View style={styles.mapActiveBanner}>
              <View style={styles.activeDot} />
              <Text style={styles.mapActiveBannerText}>
                Layar dikunci — Bebas geser & zoom peta
              </Text>
              <TouchableOpacity
                onPress={() => setIsMapLocked(false)}
                style={styles.unlockSmallBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.unlockSmallBtnText}>Selesai</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Quick Hitbox Hint when NOT locked */
            <TouchableOpacity
              style={styles.mapInactiveHint}
              onPress={() => setIsMapLocked(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="hand-left-outline" size={13} color={colors.ink} />
              <Text style={styles.mapInactiveHintText}>
                Ketuk untuk geser peta tanpa scroll layar
              </Text>
              <Ionicons name="chevron-forward" size={12} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
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
        scrollEnabled={!isMapLocked}
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

      {/* ── Modal Peta Layar Penuh (Bebas Geser 100% Seluruh Bali) ── */}
      <Modal
        visible={fullscreenMapVisible}
        animationType="slide"
        onRequestClose={() => setFullscreenMapVisible(false)}
      >
        <View style={styles.fullscreenRoot}>
          <StatusBar barStyle="light-content" backgroundColor={colors.ink} />

          {/* Fullscreen Header */}
          <View style={styles.fullscreenHeader}>
            <TouchableOpacity
              style={styles.fullscreenBackBtn}
              onPress={() => setFullscreenMapVisible(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.fullscreenTitleWrap}>
              <Text style={styles.fullscreenTitle} numberOfLines={1}>
                {isMultiStop
                  ? `${origin.name} → ${effectiveStops.length} Destinasi`
                  : `${origin.name} → ${destination.name}`}
              </Text>
              <Text style={styles.fullscreenSub}>
                Peta Layar Penuh • Bebas Geser & Eksplorasi Bali
              </Text>
            </View>

            <TouchableOpacity
              style={styles.fullscreenActionBtn}
              onPress={() => fullscreenLeafletRef.current?.resetView()}
              activeOpacity={0.7}
              accessibilityLabel="Pusatkan Rute"
            >
              <Ionicons name="locate" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Fullscreen Map */}
          <View style={styles.fullscreenMapWrap}>
            <LeafletMapView
              ref={fullscreenLeafletRef}
              style={styles.fullscreenMap}
              origin={origin}
              destination={destination}
              stops={effectiveStops}
              polylineCoords={route.polylineCoords}
              searchAreas={searchAreas}
              alternatives={filteredAlternatives}
              onAlternativePress={(gem) => {
                setFullscreenMapVisible(false);
                handlePressCard(gem);
              }}
            />
          </View>

          {/* Bottom Floating Info Bar */}
          <View style={styles.fullscreenBottomBar}>
            <View style={styles.fullscreenBottomInfo}>
              <Ionicons name="speedometer-outline" size={16} color={colors.sea} />
              <Text style={styles.fullscreenBottomText}>
                {route.roadDistanceKm} km • {route.motorDurationMinutes} mnt (Motor) • {route.carDurationMinutes} mnt (Mobil)
              </Text>
            </View>
            <TouchableOpacity
              style={styles.fullscreenCloseBtn}
              onPress={() => setFullscreenMapVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.fullscreenCloseBtnText}>Tutup Peta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  mapContainer: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  mapContainerActive: {
    borderWidth: 2,
    borderColor: colors.sea,
  },
  mapToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  lockToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#EFF6F5',
    borderWidth: 1,
    borderColor: colors.sea,
  },
  lockToggleBtnActive: {
    backgroundColor: colors.sea,
    borderColor: colors.sea,
  },
  lockToggleText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.sea,
  },
  lockToggleTextActive: {
    color: '#FFFFFF',
  },
  mapToolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolbarIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  mapWrap: {
    width: '100%',
    height: 280,
    position: 'relative',
    overflow: 'hidden',
  },
  mapWrapActive: {
    height: 340,
  },
  map: { width: '100%', height: '100%' },
  mapActiveBanner: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(14, 42, 43, 0.94)',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    marginRight: 8,
  },
  mapActiveBannerText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 11,
    color: '#FFFFFF',
  },
  unlockSmallBtn: {
    backgroundColor: colors.turmeric,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginLeft: 8,
  },
  unlockSmallBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.ink,
  },
  mapInactiveHint: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.line,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  mapInactiveHintText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.ink,
  },
  fullscreenRoot: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ink,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 6 : 44,
    paddingBottom: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  fullscreenBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenTitleWrap: {
    flex: 1,
  },
  fullscreenTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  fullscreenSub: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.mist,
    marginTop: 1,
  },
  fullscreenActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenMapWrap: {
    flex: 1,
    position: 'relative',
  },
  fullscreenMap: {
    width: '100%',
    height: '100%',
  },
  fullscreenBottomBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  fullscreenBottomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  fullscreenBottomText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.ink,
  },
  fullscreenCloseBtn: {
    backgroundColor: colors.sea,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  fullscreenCloseBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
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
