/**
 * HomeScreen — Layar Utama Lokayana AI
 *
 * Fitur:
 * 1. Input Titik Awal:
 *    - GPS Otomatis (Lokasi Saat Ini)
 *    - Pilih dari Peta Interaktif (MapLocationPickerModal)
 *    - Preset lokasi populer Bali (Kuta, Bandara, Ubud, Sanur, dll)
 * 2. Pemilihan Destinasi Wisata:
 *    - Filter Kategori (Pantai, Pura, Patung & Monumen, Air Terjun, Bukit & Tebing, dll)
 *    - Pencarian spesifik live autocomplete dari 1.445 destinasi Bali
 *    - Pilih dari Peta atau Rekomendasi Unggulan Bali
 * 3. Navigasi menuju kalkulasi Rute Tercepat & Rekomendasi Cerdas (Radius 15 km)
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors, fonts } from '../theme';
import type { AppScreen, Category, Coordinate, Destination } from '../types';
import CategoryPicker from '../components/CategoryPicker';
import MapLocationPickerModal from '../components/MapLocationPickerModal';
import {
  CATEGORIES,
  POPULAR_ORIGIN_PRESETS,
  POPULAR_DESTINATIONS,
  searchDestinations,
  findNearestDestination,
} from '../services/destinationService';
import { getRecommendations } from '../services/recommenderService';

interface Props {
  onNavigate: (screen: AppScreen) => void;
}

export default function HomeScreen({ onNavigate }: Props) {
  // --- Titik Awal ---
  const [origin, setOrigin] = useState<Coordinate | null>({ lat: -8.7184, lng: 115.1686 }); // Default Kuta
  const [originName, setOriginName] = useState('Kuta Central');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showOriginMapModal, setShowOriginMapModal] = useState(false);

  // --- Destinasi ---
  const [destination, setDestination] = useState<Coordinate | null>(null);
  const [destinationName, setDestinationName] = useState('');
  const [selectedDestinationObj, setSelectedDestinationObj] = useState<Destination | null>(null);
  const [showDestMapModal, setShowDestMapModal] = useState(false);

  // --- Search & Kategori ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(CATEGORIES[0]); // Default Pantai
  const [searchingRoute, setSearchingRoute] = useState(false);

  // ── GPS Handler ────────────────────────────────────────────────────────
  const handleGetGPS = useCallback(async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Izin Lokasi Ditolak',
          'Aktifkan izin lokasi di pengaturan perangkat untuk mendeteksi posisi Anda.'
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coord = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setOrigin(coord);
      const nearest = findNearestDestination(coord);
      setOriginName(`Lokasi Saat Ini (${nearest.district})`);
    } catch {
      // Fallback jika GPS tidak tersedia (misal di simulator)
      setOrigin({ lat: -8.7482, lng: 115.1672 });
      setOriginName('Bandara Ngurah Rai (Simulasi GPS)');
      Alert.alert(
        'GPS Perangkat Terbatas',
        'Menggunakan lokasi simulasi Bali (Bandara Ngurah Rai). Anda juga bisa memilih dari peta.'
      );
    } finally {
      setGpsLoading(false);
    }
  }, []);

  // ── Pilih Preset Origin ───────────────────────────────────────────────
  const handleOriginPreset = (preset: { name: string; lat: number; lng: number }) => {
    setOrigin({ lat: preset.lat, lng: preset.lng });
    setOriginName(preset.name);
  };

  // ── Pilih Destinasi dari Item ─────────────────────────────────────────
  const handleSelectDestination = (dest: Destination) => {
    setDestination({ lat: dest.lat, lng: dest.lng });
    setDestinationName(dest.name);
    setSelectedDestinationObj(dest);
    setSearchQuery('');
  };

  // ── Hasil Pencarian Live Destinasi ─────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() && !selectedCategory) return [];
    return searchDestinations(searchQuery, selectedCategory?.name).slice(0, 8);
  }, [searchQuery, selectedCategory]);

  // ── Submit & Cari Rute + Rekomendasi Cerdas ───────────────────────────
  const handleSearchRoute = useCallback(async () => {
    if (!origin) {
      Alert.alert('Peringatan', 'Silakan tentukan titik awal keberangkatan Anda.');
      return;
    }
    if (!destination) {
      Alert.alert('Peringatan', 'Silakan pilih tempat wisata yang akan dikunjungi.');
      return;
    }

    setSearchingRoute(true);
    try {
      const response = await getRecommendations(
        { ...origin, name: originName },
        { ...destination, name: destinationName, destinationObj: selectedDestinationObj }
      );

      onNavigate({
        name: 'GemList',
        params: response,
      });
    } catch (err) {
      Alert.alert('Gagal Memproses Rute', String(err));
    } finally {
      setSearchingRoute(false);
    }
  }, [origin, originName, destination, destinationName, selectedDestinationObj, onNavigate]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.ink} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.appName}>Lokayana AI</Text>
          <Text style={styles.appSub}>Navigasi Cerdas & Hidden Gem Bali</Text>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => onNavigate({ name: 'Profile' })}
          activeOpacity={0.8}
        >
          <Ionicons name="person-circle-outline" size={32} color={colors.turmeric} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── CARD 1: TITIK LOKASI AWAL ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.cardTitle}>1. Titik Awal Keberangkatan</Text>
          </View>

          {origin ? (
            <View style={styles.locationBadge}>
              <Ionicons name="navigate-circle" size={20} color="#2563EB" />
              <View style={styles.locationBadgeTextWrap}>
                <Text style={styles.locationBadgeName}>{originName}</Text>
                <Text style={styles.locationBadgeCoord}>
                  {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyHint}>Pilih titik keberangkatan Anda</Text>
          )}

          {/* Tombol Opsi Lokasi Awal */}
          <View style={styles.originActionRow}>
            {/* GPS Saat Ini */}
            <TouchableOpacity
              style={styles.gpsBtn}
              onPress={handleGetGPS}
              disabled={gpsLoading}
              activeOpacity={0.85}
            >
              {gpsLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="locate" size={16} color="#FFFFFF" />
              )}
              <Text style={styles.gpsBtnText}>
                {gpsLoading ? 'Membaca GPS…' : 'Lokasi Saat Ini'}
              </Text>
            </TouchableOpacity>

            {/* Pilih dari Peta */}
            <TouchableOpacity
              style={styles.mapPickBtn}
              onPress={() => setShowOriginMapModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="map-outline" size={16} color={colors.sea} />
              <Text style={styles.mapPickBtnText}>Pilih dari Peta</Text>
            </TouchableOpacity>
          </View>

          {/* Preset Chips */}
          <Text style={styles.presetLabel}>Spot Populer Bali:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetScroll}
          >
            {POPULAR_ORIGIN_PRESETS.map((p) => (
              <TouchableOpacity
                key={p.name}
                style={[
                  styles.presetChip,
                  originName === p.name && styles.presetChipActive,
                ]}
                onPress={() => handleOriginPreset(p)}
              >
                <Text
                  style={[
                    styles.presetText,
                    originName === p.name && styles.presetTextActive,
                  ]}
                >
                  {p.name.split(' (')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── PANAH PENGHUBUNG ── */}
        <View style={styles.arrowRow}>
          <View style={styles.arrowLine} />
          <View style={styles.arrowCircle}>
            <Ionicons name="arrow-down" size={16} color={colors.sea} />
          </View>
          <View style={styles.arrowLine} />
        </View>

        {/* ── CARD 2: TEMPAT WISATA TUJUAN ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.cardTitle}>2. Tempat Wisata Tujuan</Text>
          </View>

          {destination ? (
            <View style={[styles.locationBadge, styles.destBadge]}>
              <Ionicons name="flag" size={20} color="#DC2626" />
              <View style={styles.locationBadgeTextWrap}>
                <Text style={styles.locationBadgeName}>{destinationName}</Text>
                <Text style={styles.locationBadgeCoord}>
                  {selectedDestinationObj
                    ? `${selectedDestinationObj.category} • ${selectedDestinationObj.district}, ${selectedDestinationObj.city}`
                    : `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setDestination(null);
                  setDestinationName('');
                  setSelectedDestinationObj(null);
                }}
              >
                <Ionicons name="close-circle" size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.emptyHint}>Cari nama tempat atau pilih berdasarkan kategori</Text>
          )}

          {/* Search Input Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari tempat spesifik (cth: Tanah Lot, GWK)…"
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setShowDestMapModal(true)}>
                <Ionicons name="map-outline" size={18} color={colors.sea} />
              </TouchableOpacity>
            )}
          </View>

          {/* Kategori Pills */}
          <Text style={styles.categoryLabel}>Pilih Berdasarkan Kategori:</Text>
          <CategoryPicker
            categories={CATEGORIES}
            selectedId={selectedCategory?.id ?? null}
            onSelect={(cat) => setSelectedCategory(cat)}
          />

          {/* Dropdown Live Hasil Pencarian */}
          {searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              <Text style={styles.searchResultTitle}>
                {searchQuery ? `Hasil Pencarian (${searchResults.length})` : `Wisata Kategori ${selectedCategory?.name}`}
              </Text>
              {searchResults.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.searchResultItem}
                  onPress={() => handleSelectDestination(item)}
                  activeOpacity={0.7}
                >
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.resultThumb} />
                  ) : (
                    <View style={[styles.resultThumb, styles.resultThumbFallback]}>
                      <Ionicons name="compass" size={16} color={colors.sea} />
                    </View>
                  )}
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.resultMeta}>
                      {item.category} • {item.district} • ★ {item.rating.toFixed(1)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.sea} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Curated Bali Highlights jika belum ada input */}
          {!destination && searchResults.length === 0 && (
            <View style={styles.highlightsWrap}>
              <Text style={styles.highlightsTitle}>Destinasi Populer Bali:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.highlightsScroll}>
                {POPULAR_DESTINATIONS.map((dest) => (
                  <TouchableOpacity
                    key={dest.id}
                    style={styles.highlightCard}
                    onPress={() => handleSelectDestination(dest)}
                    activeOpacity={0.8}
                  >
                    {dest.imageUrl ? (
                      <Image source={{ uri: dest.imageUrl }} style={styles.highlightImg} />
                    ) : (
                      <View style={[styles.highlightImg, styles.highlightImgFallback]}>
                        <Ionicons name="image" size={20} color={colors.sea} />
                      </View>
                    )}
                    <Text style={styles.highlightName} numberOfLines={1}>
                      {dest.name}
                    </Text>
                    <Text style={styles.highlightCategory}>{dest.category}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* ── CARD 3: ATURAN RADIUS 15 KM (INFO BANNER) ── */}
        <View style={styles.radiusRuleCard}>
          <View style={styles.radiusRuleHeader}>
            <Ionicons name="shield-checkmark" size={18} color={colors.turmericDark} />
            <Text style={styles.radiusRuleTitle}>Logika Radius Cerdas (15 km)</Text>
          </View>
          <Text style={styles.radiusRuleDesc}>
            • <Text style={styles.boldText}>Jarak {'>'} 15 km:</Text> Sistem mencari alternatif di <Text style={styles.boldText}>2 radius</Text> (15 km dari titik awal & 15 km dari destinasi).{'\n'}
            • <Text style={styles.boldText}>Jarak ≤ 15 km:</Text> Sistem menggabungkannya ke dalam <Text style={styles.boldText}>1 radius</Text> (15 km).
          </Text>
        </View>

        {/* ── TOMBOL CARI RUTE & ALTERNATIF ── */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!origin || !destination || searchingRoute) && styles.submitBtnDisabled,
          ]}
          onPress={handleSearchRoute}
          disabled={!origin || !destination || searchingRoute}
          activeOpacity={0.85}
        >
          {searchingRoute ? (
            <ActivityIndicator color={colors.ink} size="small" />
          ) : (
            <Ionicons name="compass" size={22} color={colors.ink} />
          )}
          <Text style={styles.submitBtnText}>
            {searchingRoute ? 'Mengkalkulasi Rute & AI…' : 'Cari Rute & Alternatif Cerdas'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Picker Titik Awal dari Peta */}
      <MapLocationPickerModal
        visible={showOriginMapModal}
        title="Pilih Titik Awal di Peta"
        initialCoord={origin}
        onSelect={(coord, name) => {
          setOrigin(coord);
          setOriginName(name);
        }}
        onClose={() => setShowOriginMapModal(false)}
      />

      {/* Modal Picker Destinasi dari Peta */}
      <MapLocationPickerModal
        visible={showDestMapModal}
        title="Pilih Destinasi di Peta"
        initialCoord={destination ?? { lat: -8.5069, lng: 115.2624 }}
        onSelect={(coord, name) => {
          setDestination(coord);
          setDestinationName(name);
          const nearest = findNearestDestination(coord);
          setSelectedDestinationObj(nearest);
        }}
        onClose={() => setShowDestMapModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.ink,
    paddingTop: Platform.OS === 'android' ? 48 : 58,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  headerLeft: { flex: 1 },
  appName: { fontFamily: fonts.extraBold, fontSize: 24, color: '#FFFFFF' },
  appSub: { fontFamily: fonts.medium, fontSize: 13, color: colors.mist, marginTop: 2 },
  profileBtn: { padding: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  destBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  locationBadgeTextWrap: { flex: 1 },
  locationBadgeName: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  locationBadgeCoord: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, marginTop: 1 },
  emptyHint: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginBottom: 12 },
  originActionRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  gpsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.sea,
    paddingVertical: 10,
    borderRadius: 10,
  },
  gpsBtnText: { fontFamily: fonts.bold, fontSize: 12, color: '#FFFFFF' },
  mapPickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.sea,
    paddingVertical: 10,
    borderRadius: 10,
  },
  mapPickBtnText: { fontFamily: fonts.bold, fontSize: 12, color: colors.sea },
  presetLabel: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, marginBottom: 6 },
  presetScroll: { gap: 6 },
  presetChip: {
    backgroundColor: colors.mist,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  presetChipActive: { backgroundColor: colors.sea, borderColor: colors.sea },
  presetText: { fontFamily: fonts.medium, fontSize: 11, color: colors.ink },
  presetTextActive: { color: '#FFFFFF', fontFamily: fonts.bold },
  arrowRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  arrowLine: { flex: 1, height: 1, backgroundColor: colors.line },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.mist,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.ink, padding: 0 },
  categoryLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginBottom: 8 },
  searchResultsContainer: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  searchResultTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.sea,
    backgroundColor: colors.mist,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  resultThumb: { width: 36, height: 36, borderRadius: 6, marginRight: 10 },
  resultThumbFallback: { backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
  resultInfo: { flex: 1 },
  resultName: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  resultMeta: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, marginTop: 2 },
  highlightsWrap: { marginTop: 14 },
  highlightsTitle: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginBottom: 8 },
  highlightsScroll: { gap: 10 },
  highlightCard: {
    width: 120,
    backgroundColor: colors.mist,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  highlightImg: { width: '100%', height: 60, borderRadius: 6, marginBottom: 6 },
  highlightImgFallback: { backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  highlightName: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink },
  highlightCategory: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted, marginTop: 2 },
  radiusRuleCard: {
    backgroundColor: colors.turmericLight,
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(244, 180, 26, 0.4)',
  },
  radiusRuleHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  radiusRuleTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  radiusRuleDesc: { fontFamily: fonts.regular, fontSize: 11, color: colors.ink, lineHeight: 18 },
  boldText: { fontFamily: fonts.bold },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.turmeric,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { fontFamily: fonts.extraBold, fontSize: 15, color: colors.ink },
});
