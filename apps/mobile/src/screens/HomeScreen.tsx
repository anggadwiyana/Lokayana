/**
 * HomeScreen — Layar Utama Lokayana AI
 *
 * Fitur:
 * 1. Input Titik Awal:
 *    - GPS Otomatis (Lokasi Saat Ini)
 *    - Pilih dari Peta Interaktif (MapLocationPickerModal)
 *    - Preset lokasi populer Bali (Kuta, Bandara, Ubud, Sanur, dll)
 * 2. Pemilihan Destinasi Wisata (Mendukung Multi-Destinasi / Rute Berurutan):
 *    - Pengguna bisa memilih 1 atau lebih destinasi wisata sekaligus
 *    - Filter Kategori (Pantai, Pura, Patung & Monumen, Air Terjun, Bukit & Tebing, dll)
 *    - Pencarian live autocomplete dari 1.445 destinasi Bali
 *    - Quick add dari Rekomendasi Unggulan Bali atau Peta Interaktif
 * 3. Navigasi menuju kalkulasi Rute Tercepat (A* TSP & OSRM via Python Backend) & Rekomendasi Cerdas (Radius 15 km)
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
import ProfileMenu from '../components/ProfileMenu';
import {
  CATEGORIES,
  POPULAR_ORIGIN_PRESETS,
  POPULAR_DESTINATIONS,
  searchDestinations,
  findNearestDestination,
} from '../services/destinationService';
import { getRecommendations } from '../services/recommenderService';
import { getDestinationImageUrl } from '../utils/imageHelper';
import {
  getDestinationBestTiming,
  getTimingStatus,
  getCurrentTimeSlot,
  getCurrentTimeLabel,
} from '../utils/bestTimingHelper';

interface Props {
  onNavigate: (screen: AppScreen) => void;
  onLogout: () => void;
  isLoggedIn: boolean;
  origin: Coordinate | null;
  originName: string;
  onOriginChange: (coord: Coordinate, name: string) => void;
}

export default function HomeScreen({
  onNavigate,
  onLogout,
  isLoggedIn,
  origin,
  originName,
  onOriginChange,
}: Props) {
  // --- Titik Awal (state disimpan di App) ---
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showOriginMapModal, setShowOriginMapModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // --- Waktu Saat Ini (Real-time) ---
  const currentTimeSlot = useMemo(() => getCurrentTimeSlot(), []);
  const currentTimeLabel = useMemo(() => getCurrentTimeLabel(), []);

  // --- Multi-Destinasi ---
  const [selectedDestinations, setSelectedDestinations] = useState<Destination[]>([]);
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
      const nearest = findNearestDestination(coord);
      onOriginChange(coord, `Lokasi Saat Ini (${nearest.district})`);
    } catch {
      // Fallback simulasi GPS jika tidak tersedia
      onOriginChange(
        { lat: -8.7482, lng: 115.1672 },
        'Bandara Ngurah Rai (Simulasi GPS)'
      );
      Alert.alert(
        'GPS Perangkat Terbatas',
        'Menggunakan lokasi simulasi Bali (Bandara Ngurah Rai). Anda juga bisa memilih dari peta.'
      );
    } finally {
      setGpsLoading(false);
    }
  }, [onOriginChange]);

  // ── Pilih Preset Origin ───────────────────────────────────────────────
  const handleOriginPreset = (preset: { name: string; lat: number; lng: number }) => {
    onOriginChange({ lat: preset.lat, lng: preset.lng }, preset.name);
  };

  // ── Toggle Tambah/Hapus Destinasi ─────────────────────────────────────
  const handleToggleDestination = (dest: Destination) => {
    setSelectedDestinations((prev) => {
      const exists = prev.some((d) => d.id === dest.id);
      if (exists) {
        return prev.filter((d) => d.id !== dest.id);
      }
      if (prev.length >= 8) {
        Alert.alert('Batas Maksimal', 'Maksimal 8 destinasi untuk 1 rangkaian rute perjalanan.');
        return prev;
      }
      return [...prev, dest];
    });
  };

  const handleRemoveDestination = (id: string) => {
    setSelectedDestinations((prev) => prev.filter((d) => d.id !== id));
  };

  const handleClearDestinations = () => {
    setSelectedDestinations([]);
  };

  // ── Hasil Pencarian Live Destinasi (Diprioritaskan sesuai Waktu Kunjungan) ─
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() && !selectedCategory) return [];
    const results = searchDestinations(searchQuery, selectedCategory?.name);
    return [...results]
      .sort((a, b) => {
        const tA = getDestinationBestTiming(a);
        const tB = getDestinationBestTiming(b);
        const sA = getTimingStatus(tA.best_time);
        const sB = getTimingStatus(tB.best_time);
        const scoreA = sA.isIdeal ? 2 : sA.isPassed ? 0 : 1;
        const scoreB = sB.isIdeal ? 2 : sB.isPassed ? 0 : 1;
        return scoreB - scoreA;
      })
      .slice(0, 10);
  }, [searchQuery, selectedCategory]);

  // Rekomendasi Unggulan yang memprioritaskan destinasi sesuai jam saat ini
  const timeAwareHighlights = useMemo(() => {
    return [...POPULAR_DESTINATIONS].sort((a, b) => {
      const tA = getDestinationBestTiming(a);
      const tB = getDestinationBestTiming(b);
      const sA = getTimingStatus(tA.best_time);
      const sB = getTimingStatus(tB.best_time);
      const scoreA = sA.isIdeal ? 2 : sA.isPassed ? 0 : 1;
      const scoreB = sB.isIdeal ? 2 : sB.isPassed ? 0 : 1;
      return scoreB - scoreA;
    });
  }, []);

  // Set ID destinasi yang sudah dipilih untuk highlight cepat
  const selectedIdSet = useMemo(
    () => new Set(selectedDestinations.map((d) => d.id)),
    [selectedDestinations]
  );

  // ── Submit & Cari Rute + Rekomendasi Cerdas ───────────────────────────
  const handleSearchRoute = useCallback(async () => {
    if (!isLoggedIn) {
      Alert.alert(
        'Login Diperlukan',
        'Silakan login terlebih dahulu untuk mencari rute dan rekomendasi wisata.',
        [
          { text: 'Nanti', style: 'cancel' },
          { text: 'Login', onPress: () => onNavigate({ name: 'Login' }) },
        ]
      );
      return;
    }
    if (!origin) {
      Alert.alert('Peringatan', 'Silakan tentukan titik awal keberangkatan Anda.');
      return;
    }
    if (selectedDestinations.length === 0) {
      Alert.alert('Peringatan', 'Silakan pilih minimal 1 tempat wisata yang ingin dikunjungi.');
      return;
    }

    setSearchingRoute(true);
    try {
      const primaryDest = selectedDestinations[selectedDestinations.length - 1];
      const response = await getRecommendations(
        { ...origin, name: originName },
        {
          lat: primaryDest.lat,
          lng: primaryDest.lng,
          name: primaryDest.name,
          destinationObj: primaryDest,
        },
        selectedDestinations
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
  }, [isLoggedIn, origin, originName, selectedDestinations, onNavigate]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.appName}>Lokayana AI</Text>
          <Text style={styles.appSub}>Wisata Bali</Text>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => setShowProfileMenu(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="person-circle-outline" size={32} color={colors.turmeric} />
        </TouchableOpacity>
      </View>

      {/* ── Banner Waktu Saat Ini ── */}
      <View style={styles.timeBanner}>
        <Ionicons name="time-outline" size={14} color="#1D4ED8" />
        <Text style={styles.timeBannerText}>
          {'Sekarang '}
          <Text style={styles.timeBannerBold}>{currentTimeLabel}</Text>
          {' — Slot terbaik: '}
          <Text style={styles.timeBannerBold}>{currentTimeSlot}</Text>
        </Text>
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
              <Text style={styles.locationBadgeName} numberOfLines={1}>
                {originName}
              </Text>
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

        {/* ── CARD 2: TEMPAT WISATA TUJUAN (MULTI-DESTINASI) ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderBetween}>
            <View style={styles.cardHeader}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.cardTitle}>2. Tempat Wisata Tujuan</Text>
            </View>
            {selectedDestinations.length > 0 && (
              <View style={styles.selectedCountBadge}>
                <Text style={styles.selectedCountText}>
                  {selectedDestinations.length} Dipilih
                </Text>
              </View>
            )}
          </View>

          {/* Daftar Destinasi yang Dipilih (Chips / List) */}
          {selectedDestinations.length > 0 ? (
            <View style={styles.selectedListContainer}>
              <View style={styles.selectedHeaderRow}>
                <Text style={styles.selectedSubTitle}>Rencana Destinasi Kunjungan:</Text>
                {selectedDestinations.length > 1 && (
                  <TouchableOpacity onPress={handleClearDestinations}>
                    <Text style={styles.clearAllText}>Hapus Semua</Text>
                  </TouchableOpacity>
                )}
              </View>

              {selectedDestinations.map((dest, idx) => {
                const timing = dest.best_timing || getDestinationBestTiming(dest);
                const timingStatus = getTimingStatus(timing.best_time);
                return (
                  <View key={dest.id} style={styles.selectedDestCard}>
                    <View style={styles.destIndexBadge}>
                      <Text style={styles.destIndexText}>{idx + 1}</Text>
                    </View>
                    <View style={styles.selectedDestInfo}>
                      <Text style={styles.selectedDestName} numberOfLines={1}>
                        {dest.name}
                      </Text>
                      <Text style={styles.selectedDestMeta} numberOfLines={1}>
                        {dest.category} • ★ {dest.rating.toFixed(1)} • {timing.icon}{' '}
                        {timing.best_time}
                      </Text>
                      <Text
                        style={[styles.selectedDestStatus, { color: timingStatus.color }]}
                        numberOfLines={1}
                      >
                        {timingStatus.icon} {timingStatus.label}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.destRemoveBtn}
                      onPress={() => handleRemoveDestination(dest.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle" size={20} color={colors.muted} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyHint}>
              Pilih satu atau beberapa tempat wisata di bawah atau cari secara spesifik:
            </Text>
          )}

          {/* Search Input Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari tempat spesifik (cth: Tanah Lot, GWK, Kuta)…"
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

          {/* Dropdown Live Hasil Pencarian / Kategori */}
          {searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              <Text style={styles.searchResultTitle}>
                {searchQuery
                  ? `Hasil Pencarian "${searchQuery}" (${searchResults.length})`
                  : `Wisata Kategori ${selectedCategory?.name} (${searchResults.length})`}
              </Text>
              {searchResults.map((item) => {
                const isSelected = selectedIdSet.has(item.id);
                const itemTiming = getDestinationBestTiming(item);
                const itemStatus = getTimingStatus(itemTiming.best_time);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.searchResultItem,
                      isSelected && styles.searchResultItemSelected,
                    ]}
                    onPress={() => handleToggleDestination(item)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: getDestinationImageUrl(item.imageUrl, item.category) }}
                      style={styles.resultThumb}
                    />
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.resultMeta} numberOfLines={1}>
                        {item.category} • ★ {item.rating.toFixed(1)}
                      </Text>
                      <Text
                        style={[styles.resultTimingStatus, { color: itemStatus.color }]}
                        numberOfLines={1}
                      >
                        {itemTiming.icon} {itemTiming.best_time} • {itemStatus.label}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.toggleAddBadge,
                        isSelected && styles.toggleAddBadgeSelected,
                      ]}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark' : 'add'}
                        size={15}
                        color={isSelected ? '#FFFFFF' : colors.sea}
                      />
                      <Text
                        style={[
                          styles.toggleAddText,
                          isSelected && styles.toggleAddTextSelected,
                        ]}
                      >
                        {isSelected ? 'Dipilih' : 'Tambah'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Curated Bali Highlights jika belum ada input */}
          {searchResults.length === 0 && (
            <View style={styles.highlightsWrap}>
              <Text style={styles.highlightsTitle}>Rekomendasi Populer Bali:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.highlightsScroll}
              >
                {timeAwareHighlights.map((dest) => {
                  const isSelected = selectedIdSet.has(dest.id);
                  const destTiming = getDestinationBestTiming(dest);
                  const destStatus = getTimingStatus(destTiming.best_time);
                  return (
                    <TouchableOpacity
                      key={dest.id}
                      style={[
                        styles.highlightCard,
                        isSelected && styles.highlightCardSelected,
                      ]}
                      onPress={() => handleToggleDestination(dest)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: getDestinationImageUrl(dest.imageUrl, dest.category) }}
                        style={styles.highlightImg}
                      />
                      <Text style={styles.highlightName} numberOfLines={1}>
                        {dest.name}
                      </Text>
                      <View style={styles.highlightBottomRow}>
                        <Text style={styles.highlightCategory}>{dest.category}</Text>
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                          size={18}
                          color={isSelected ? colors.sea : colors.muted}
                        />
                      </View>
                      <Text
                        style={[
                          styles.highlightTimingText,
                          { color: destStatus.color },
                        ]}
                        numberOfLines={1}
                      >
                        {destTiming.icon} {destStatus.isIdeal ? 'Ideal Sekarang' : destTiming.best_time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* ── Info Radius Ringkas ── */}
        <View style={styles.radiusRuleCard}>
          <Ionicons name="shield-checkmark" size={15} color={colors.turmericDark} />
          <Text style={styles.radiusRuleCompactText}>
            Alternatif dicari dalam radius 15 km dan diurutkan sesuai waktu terbaik.
          </Text>
        </View>

        {/* ── TOMBOL CARI RUTE & ALTERNATIF ── */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!origin || selectedDestinations.length === 0 || searchingRoute) &&
              styles.submitBtnDisabled,
          ]}
          onPress={handleSearchRoute}
          disabled={!origin || selectedDestinations.length === 0 || searchingRoute}
          activeOpacity={0.85}
        >
          {searchingRoute ? (
            <ActivityIndicator color={colors.ink} size="small" />
          ) : (
            <Ionicons name="compass" size={22} color={colors.ink} />
          )}
          <Text style={styles.submitBtnText}>
            {searchingRoute
              ? 'Menghitung rute…'
              : selectedDestinations.length > 1
              ? `Cari Rute (${selectedDestinations.length} Destinasi)`
              : selectedDestinations.length === 1
              ? 'Cari Rute & Alternatif'
              : 'Pilih Destinasi Dulu'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Picker Titik Awal dari Peta */}
      <MapLocationPickerModal
        visible={showOriginMapModal}
        title="Pilih Titik Awal di Peta"
        initialCoord={origin}
        onSelect={(coord, name) => {
          onOriginChange(coord, name);
        }}
        onClose={() => setShowOriginMapModal(false)}
      />

      {/* Modal Picker Destinasi dari Peta */}
      <MapLocationPickerModal
        visible={showDestMapModal}
        title="Pilih Destinasi di Peta"
        initialCoord={
          selectedDestinations.length > 0
            ? selectedDestinations[selectedDestinations.length - 1]
            : { lat: -8.5069, lng: 115.2624 }
        }
        onSelect={(coord) => {
          const nearest = findNearestDestination(coord);
          handleToggleDestination(nearest);
        }}
        onClose={() => setShowDestMapModal(false)}
      />

      <ProfileMenu
        visible={showProfileMenu}
        isLoggedIn={isLoggedIn}
        onClose={() => setShowProfileMenu(false)}
        onViewProfile={() => {
          setShowProfileMenu(false);
          onNavigate({ name: 'Profile' });
        }}
        onLogin={() => {
          setShowProfileMenu(false);
          onNavigate({ name: 'Login' });
        }}
        onLogout={() => {
          setShowProfileMenu(false);
          onLogout();
        }}
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
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  selectedCountBadge: {
    backgroundColor: colors.sea,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  selectedCountText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  selectedListContainer: {
    marginBottom: 12,
    backgroundColor: colors.mist,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  selectedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  selectedSubTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.sea,
  },
  clearAllText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: '#DC2626',
  },
  selectedDestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  destIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.sea,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destIndexText: {
    fontFamily: fonts.extraBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  selectedDestInfo: { flex: 1 },
  selectedDestName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.ink,
  },
  selectedDestMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  selectedDestStatus: {
    fontFamily: fonts.bold,
    fontSize: 10,
    marginTop: 2,
  },
  destRemoveBtn: { padding: 4 },
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
  locationBadgeTextWrap: { flex: 1 },
  locationBadgeName: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
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
    paddingVertical: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  searchResultItemSelected: {
    backgroundColor: 'rgba(27, 107, 102, 0.06)',
  },
  resultThumb: { width: 38, height: 38, borderRadius: 6, marginRight: 10 },
  resultThumbFallback: { backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
  resultInfo: { flex: 1 },
  resultName: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  resultMeta: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, marginTop: 2 },
  toggleAddBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.sea,
  },
  toggleAddBadgeSelected: {
    backgroundColor: colors.sea,
    borderColor: colors.sea,
  },
  toggleAddText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.sea,
  },
  toggleAddTextSelected: {
    color: '#FFFFFF',
  },
  highlightsWrap: { marginTop: 14 },
  highlightsTitle: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginBottom: 8 },
  highlightsScroll: { gap: 10 },
  highlightCard: {
    width: 130,
    backgroundColor: colors.mist,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  highlightCardSelected: {
    borderColor: colors.sea,
    backgroundColor: 'rgba(27, 107, 102, 0.08)',
  },
  highlightImg: { width: '100%', height: 65, borderRadius: 6, marginBottom: 6 },
  highlightImgFallback: { backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  highlightName: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink },
  highlightBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  highlightCategory: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted },
  radiusRuleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.turmericLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(244, 180, 26, 0.4)',
  },
  radiusRuleCompactText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.ink,
    lineHeight: 16,
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
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { fontFamily: fonts.extraBold, fontSize: 15, color: colors.ink },
  destTimingBadge: {
    backgroundColor: 'rgba(244, 180, 26, 0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(244, 180, 26, 0.35)',
  },
  destTimingText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: '#92610A',
  },
  resultTimingText: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.sea,
    marginTop: 2,
  },
  // ── Styles Waktu Nyata ──
  timeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  timeBannerText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#1D4ED8',
  },
  timeBannerBold: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#1D4ED8',
  },
  timingStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
  },
  timingStatusText: {
    fontFamily: fonts.bold,
    fontSize: 10,
  },
  timingWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  timingWarningText: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: '#DC2626',
    flex: 1,
  },
  resultTimingStatus: {
    fontFamily: fonts.bold,
    fontSize: 10,
    marginTop: 2,
  },
  highlightTimingText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    marginTop: 3,
  },
});
