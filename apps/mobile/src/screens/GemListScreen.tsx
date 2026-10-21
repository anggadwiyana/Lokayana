/**
 * GemListScreen — Hasil Navigasi Rute Tercepat & Rekomendasi Cerdas Lokayana AI
 *
 * Fitur:
 *  1. Peta Interaktif:
 *     - Marker Titik Awal (Biru)
 *     - Marker Destinasi Utama (Merah)
 *     - Polyline Rute Jalan (OSRM Driving Route)
 *     - Lingkaran Radius 15 km:
 *       * Jika jarak > 15 km: 2 Lingkaran (Origin 15 km & Destination 15 km)
 *       * Jika jarak <= 15 km: 1 Lingkaran (15 km)
 *     - Marker Tempat Alternatif Terkait
 *  2. Kartu Rute Tercepat (Komparasi Motor vs Mobil)
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
import MapView, { Marker, Circle, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import type { AppScreen, RecommendationResponse, AlternativeDestination, Coordinate } from '../types';
import FastestRouteCard from '../components/FastestRouteCard';
import { AlternativeGemCard } from '../components/AlternativeGemCard';
import DestinationDetailModal from '../components/DestinationDetailModal';

interface Props {
  params: RecommendationResponse;
  onNavigate: (screen: AppScreen) => void;
  onSwitchDestination?: (gem: AlternativeDestination) => void;
}

/** Hitung wilayah MapView agar seluruh titik dan rute terlihat proporsional */
function calcMapRegion(origin: Coordinate, destination: Coordinate) {
  const lats = [origin.lat, destination.lat];
  const lngs = [origin.lng, destination.lng];
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const deltaLat = Math.max(maxLat - minLat, 0.08) * 1.5;
  const deltaLng = Math.max(maxLng - minLng, 0.08) * 1.5;

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.min(deltaLat, 1.2),
    longitudeDelta: Math.min(deltaLng, 1.2),
  };
}

export default function GemListScreen({ params, onNavigate, onSwitchDestination }: Props) {
  const { origin, destination, straightDistanceKm, isDualRadius, searchAreas, route, alternatives } =
    params;

  const mapRef = useRef<MapView>(null);
  const [selectedGem, setSelectedGem] = useState<AlternativeDestination | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | 'DESTINATION' | 'ORIGIN'>('ALL');

  const region = useMemo(() => calcMapRegion(origin, destination), [origin, destination]);

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
    // Animate map to the selected gem
    mapRef.current?.animateToRegion(
      {
        latitude: gem.lat,
        longitude: gem.lng,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      },
      400
    );
  };

  const handlePressReview = (gem: AlternativeDestination) => {
    onNavigate({ name: 'Review', params: { gem } });
  };

  const handleResetMap = () => {
    mapRef.current?.animateToRegion(region, 400);
  };

  // ── ListHeaderComponent ──────────────────────────────────────────────
  const ListHeader = (
    <View style={styles.headerContainer}>
      {/* ── Peta Interaktif ── */}
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          showsUserLocation
          showsCompass
        >
          {/* Polyline Rute Tercepat OSRM */}
          {route.polylineCoords && route.polylineCoords.length > 0 && (
            <Polyline
              coordinates={route.polylineCoords.map((c) => ({
                latitude: c.lat,
                longitude: c.lng,
              }))}
              strokeColor={colors.sea}
              strokeWidth={5}
            />
          )}

          {/* Lingkaran Radius 15 km */}
          {searchAreas.map((area) => {
            const isOriginArea = area.label === 'ORIGIN';
            const strokeColor = isOriginArea ? 'rgba(37, 99, 235, 0.7)' : 'rgba(27, 107, 102, 0.75)';
            const fillColor = isOriginArea ? 'rgba(37, 99, 235, 0.12)' : 'rgba(27, 107, 102, 0.13)';

            return (
              <Circle
                key={area.label}
                center={{ latitude: area.latitude, longitude: area.longitude }}
                radius={area.radiusKm * 1000} // 15,000 meter
                fillColor={fillColor}
                strokeColor={strokeColor}
                strokeWidth={2}
              />
            );
          })}

          {/* Marker Titik Awal */}
          <Marker
            coordinate={{ latitude: origin.lat, longitude: origin.lng }}
            title="Titik Awal"
            description={origin.name}
          >
            <View style={[styles.marker, styles.originMarker]}>
              <Ionicons name="navigate" size={14} color="#FFFFFF" />
            </View>
          </Marker>

          {/* Marker Destinasi Utama */}
          <Marker
            coordinate={{ latitude: destination.lat, longitude: destination.lng }}
            title="Destinasi Tujuan"
            description={destination.name}
          >
            <View style={[styles.marker, styles.destMarker]}>
              <Ionicons name="flag" size={14} color="#FFFFFF" />
            </View>
          </Marker>

          {/* Marker Tempat Alternatif Serupa */}
          {filteredAlternatives.map((gem) => {
            const isOriginCluster = gem.nearestCenter === 'ORIGIN';
            return (
              <Marker
                key={gem.id}
                coordinate={{ latitude: gem.lat, longitude: gem.lng }}
                title={`${gem.name} (${gem.similarityScore}% Serupa)`}
                description={`${gem.category} • ${gem.distanceFromHubKm} km dari hub`}
                onPress={() => handlePressCard(gem)}
              >
                <View
                  style={[
                    styles.gemMarker,
                    isOriginCluster ? styles.gemMarkerOrigin : styles.gemMarkerDest,
                  ]}
                >
                  <Ionicons name="sparkles" size={11} color={colors.ink} />
                </View>
              </Marker>
            );
          })}
        </MapView>

        {/* Floating Reset View Button */}
        <TouchableOpacity
          style={styles.resetMapBtn}
          onPress={handleResetMap}
          activeOpacity={0.8}
        >
          <Ionicons name="scan-outline" size={18} color={colors.ink} />
        </TouchableOpacity>
      </View>

      {/* ── Kartu Rute Tercepat (Komparasi Motor vs Mobil) ── */}
      <FastestRouteCard route={route} origin={origin} destination={destination} />

      {/* ── Radius Mode Status Card ── */}
      <View style={styles.radiusStatusBox}>
        <View style={styles.radiusStatusHeader}>
          <Ionicons
            name={isDualRadius ? 'git-network-outline' : 'radio-outline'}
            size={18}
            color={colors.sea}
          />
          <Text style={styles.radiusStatusTitle}>
            {isDualRadius
              ? `Mode 2 Radius: Jarak ${straightDistanceKm} km (> 15 km)`
              : `Mode 1 Radius: Jarak ${straightDistanceKm} km (≤ 15 km)`}
          </Text>
        </View>
        <Text style={styles.radiusStatusDesc}>
          {isDualRadius
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
          Disaring berdasarkan kesamaan vibe, rating, dan berada dalam radius 15 km
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
            {origin.name} → {destination.name}
          </Text>
          <Text style={styles.navSub}>Rute & Rekomendasi Terkait</Text>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => onNavigate({ name: 'Profile' })}
        >
          <Ionicons name="person-circle-outline" size={28} color={colors.turmeric} />
        </TouchableOpacity>
      </View>

      {/* ── Main List ── */}
      <FlatList
        data={filteredAlternatives}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <AlternativeGemCard
              gem={item}
              isDualRadius={isDualRadius}
              onPressCard={handlePressCard}
              onPressReview={handlePressReview}
            />
          </View>
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>Tidak Ada Alternatif Ditemukan</Text>
            <Text style={styles.emptyText}>
              Tidak ditemukan tempat wisata lain yang sesuai dalam radius 15 km. Coba ubah kategori
              atau tujuan destinasi.
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal Detail Tempat */}
      <DestinationDetailModal
        visible={detailModalVisible}
        gem={selectedGem}
        onClose={() => setDetailModalVisible(false)}
        onSelectAsDestination={(gem) => {
          if (onSwitchDestination) {
            onSwitchDestination(gem);
          }
        }}
        onWriteReview={handlePressReview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ink,
    paddingTop: Platform.OS === 'android' ? 44 : 54,
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
  destMarker: { backgroundColor: '#DC2626' },
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
    backgroundColor: colors.paper,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  radiusStatusHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  radiusStatusTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  radiusStatusDesc: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, lineHeight: 16 },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.line,
  },
  filterTabActive: { backgroundColor: colors.sea, borderColor: colors.sea },
  filterTabText: { fontFamily: fonts.medium, fontSize: 11, color: colors.ink },
  filterTabTextActive: { color: '#FFFFFF', fontFamily: fonts.bold },
  listTitleWrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6 },
  listTitle: { fontFamily: fonts.extraBold, fontSize: 18, color: colors.ink },
  listSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  listContent: { paddingBottom: 36 },
  cardWrapper: { paddingHorizontal: 16 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink, marginBottom: 6 },
  emptyText: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 18 },
});
