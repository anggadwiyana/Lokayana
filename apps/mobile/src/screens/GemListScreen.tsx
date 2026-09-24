/**
 * GemListScreen — Menampilkan peta area pencarian + daftar hidden gem.
 *
 * Peta:
 *  - Marker biru   = titik awal
 *  - Marker merah  = destinasi
 *  - Lingkaran teal = area pencarian 15 km (1 atau 2)
 *  - Marker kunyit = setiap hidden gem
 */
import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, StatusBar,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { HiddenGemCard } from '../components/HiddenGemCard';
import { colors, fonts } from '../theme';
import type { AppScreen, HiddenGemsResponse, Coordinate, HiddenGem } from '../types';

interface Props {
  params: {
    response: HiddenGemsResponse;
    origin: Coordinate;
    originName: string;
    destination: Coordinate;
    destinationName: string;
  };
  onNavigate: (screen: AppScreen) => void;
}

/** Hitung region MapView agar semua marker terlihat. */
function calcRegion(origin: Coordinate, destination: Coordinate, radiusKm: number) {
  const lats = [origin.lat, destination.lat];
  const lngs = [origin.lng, destination.lng];
  const minLat = Math.min(...lats) - radiusKm / 111;
  const maxLat = Math.max(...lats) + radiusKm / 111;
  const minLng = Math.min(...lngs) - radiusKm / (111 * Math.cos((origin.lat * Math.PI) / 180));
  const maxLng = Math.max(...lngs) + radiusKm / (111 * Math.cos((origin.lat * Math.PI) / 180));
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(maxLat - minLat, 0.05) * 1.2,
    longitudeDelta: Math.max(maxLng - minLng, 0.05) * 1.2,
  };
}

export default function GemListScreen({ params, onNavigate }: Props) {
  const { response, origin, originName, destination, destinationName } = params;
  const { gems, searchAreas, originToDestinationKm } = response;
  const mapRef = useRef<MapView>(null);

  const region = calcRegion(origin, destination, searchAreas[0]?.radiusKm ?? 15);

  const handlePressReview = (gem: HiddenGem) => {
    onNavigate({ name: 'Review', params: { gem } });
  };

  const handlePressCard = (gem: HiddenGem) => {
    // Zoom peta ke gem ini
    mapRef.current?.animateToRegion({
      latitude: gem.latitude,
      longitude: gem.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, 400);
  };

  // ── ListHeaderComponent (peta + stats) ──────────────────────────────
  const ListHeader = (
    <View>
      {/* ── Navigasi ── */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate({ name: 'Home' })}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.navTitle}>
          <Text style={styles.navTitleText} numberOfLines={1}>
            {originName} → {destinationName}
          </Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => onNavigate({ name: 'Profile' })}>
          <Ionicons name="person-circle-outline" size={28} color={colors.turmeric} />
        </TouchableOpacity>
      </View>

      {/* ── Peta ── */}
      <MapView ref={mapRef} style={styles.map} initialRegion={region} showsUserLocation>
        {/* Marker titik awal */}
        <Marker coordinate={{ latitude: origin.lat, longitude: origin.lng }} title="Titik Awal" description={originName}>
          <View style={[styles.marker, { backgroundColor: '#3B82F6' }]}>
            <Ionicons name="navigate" size={14} color="#fff" />
          </View>
        </Marker>

        {/* Marker destinasi */}
        <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }} title="Destinasi" description={destinationName}>
          <View style={[styles.marker, { backgroundColor: '#EF4444' }]}>
            <Ionicons name="flag" size={14} color="#fff" />
          </View>
        </Marker>

        {/* Lingkaran area pencarian */}
        {searchAreas.map((area) => (
          <Circle
            key={area.label}
            center={{ latitude: area.latitude, longitude: area.longitude }}
            radius={area.radiusKm * 1000}
            fillColor="rgba(27, 107, 102, 0.12)"
            strokeColor="rgba(27, 107, 102, 0.6)"
            strokeWidth={2}
          />
        ))}

        {/* Marker setiap gem */}
        {gems.map((gem) => (
          <Marker
            key={gem.id}
            coordinate={{ latitude: gem.latitude, longitude: gem.longitude }}
            title={gem.name}
            description={`${gem.reviewCount} ulasan • ${gem.rewardPoints} poin`}
          >
            <View style={styles.gemMarker}>
              <Ionicons name="diamond" size={12} color={colors.ink} />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* ── Stats bar ── */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{gems.length}</Text>
          <Text style={styles.statLabel}>Hidden Gem</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{originToDestinationKm.toFixed(1)} km</Text>
          <Text style={styles.statLabel}>Jarak Perjalanan</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{searchAreas.length}</Text>
          <Text style={styles.statLabel}>Area Pencarian</Text>
        </View>
      </View>

      {/* ── Judul list ── */}
      {gems.length > 0 ? (
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Rekomendasi Untukmu</Text>
          <Text style={styles.listSub}>Tempat dengan ulasan sedikit — jadilah yang pertama mengulasnya!</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.ink} />
      <FlatList
        data={gems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <HiddenGemCard
              gem={item}
              onPressCard={handlePressCard}
              onPressReview={handlePressReview}
            />
          </View>
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>Tidak Ada Hidden Gem</Text>
            <Text style={styles.emptyText}>
              Tidak ditemukan tempat dengan ulasan sedikit di kategori ini dalam radius 15 km.
              Coba kategori atau destinasi lain.
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // Nav bar
  navBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.ink, paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingBottom: 16, paddingHorizontal: 16, gap: 10,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1 },
  navTitleText: { fontFamily: fonts.bold, fontSize: 14, color: colors.mist },
  profileBtn: {},

  // Map
  map: { width: '100%', height: 260 },

  // Marker
  marker: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  gemMarker: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.turmeric, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.ink,
  },

  // Stats bar
  statsBar: {
    flexDirection: 'row', backgroundColor: colors.paper, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: fonts.extraBold, fontSize: 18, color: colors.ink },
  statLabel: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.line },

  // List
  listHeader: { padding: 16, paddingBottom: 4 },
  listTitle: { fontFamily: fonts.extraBold, fontSize: 20, color: colors.ink },
  listSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
  listContent: { paddingBottom: 40 },
  cardWrapper: { paddingHorizontal: 16, paddingTop: 12 },

  // Empty state
  empty: { padding: 40, alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink, marginBottom: 8 },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
