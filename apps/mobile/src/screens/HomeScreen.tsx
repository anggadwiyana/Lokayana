/**
 * HomeScreen — Layar utama pencarian hidden gem.
 *
 * Alur:
 *  1. Pilih titik awal (GPS otomatis atau pilih preset)
 *  2. Pilih destinasi (preset Bali atau koordinat manual)
 *  3. Pilih kategori wisata
 *  4. Tekan "Temukan Hidden Gem" → panggil API → navigasi ke GemListScreen
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, StatusBar, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors, fonts } from '../theme';
import { CATEGORIES, PRESET_DESTINATIONS, API_BASE_URL } from '../config/api';
import CategoryPicker from '../components/CategoryPicker';
import type { AppScreen, Category, Coordinate, HiddenGemsResponse } from '../types';

interface Props {
  onNavigate: (screen: AppScreen) => void;
}

export default function HomeScreen({ onNavigate }: Props) {
  // --- State titik awal ---
  const [origin, setOrigin] = useState<Coordinate | null>(null);
  const [originName, setOriginName] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  // --- State destinasi ---
  const [destination, setDestination] = useState<Coordinate | null>(null);
  const [destinationName, setDestinationName] = useState('');
  const [showDestPresets, setShowDestPresets] = useState(false);

  // --- State kategori ---
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // --- State pencarian ---
  const [searching, setSearching] = useState(false);

  // ── GPS ──────────────────────────────────────────────────────────────
  const handleGetGPS = useCallback(async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Ditolak', 'Aktifkan izin lokasi di pengaturan perangkat.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setOrigin({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setOriginName('Lokasi Saat Ini');
    } catch {
      Alert.alert('Gagal', 'Tidak bisa membaca GPS. Coba pilih lokasi manual.');
    } finally {
      setGpsLoading(false);
    }
  }, []);

  // ── Preset origin ────────────────────────────────────────────────────
  const handleOriginPreset = (preset: { name: string; lat: number; lng: number }) => {
    setOrigin({ lat: preset.lat, lng: preset.lng });
    setOriginName(preset.name);
  };

  // ── Preset destination ────────────────────────────────────────────────
  const handleDestPreset = (preset: { name: string; lat: number; lng: number }) => {
    setDestination({ lat: preset.lat, lng: preset.lng });
    setDestinationName(preset.name);
    setShowDestPresets(false);
  };

  // ── Search ───────────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    if (!origin) { Alert.alert('Oops', 'Pilih titik awal terlebih dahulu.'); return; }
    if (!destination) { Alert.alert('Oops', 'Pilih destinasi terlebih dahulu.'); return; }
    if (!selectedCategory) { Alert.alert('Oops', 'Pilih kategori wisata.'); return; }

    setSearching(true);
    try {
      const url =
        `${API_BASE_URL}/recommendations/hidden-gems` +
        `?originLat=${origin.lat}&originLng=${origin.lng}` +
        `&destLat=${destination.lat}&destLng=${destination.lng}` +
        `&categoryId=${selectedCategory.id}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as HiddenGemsResponse;

      onNavigate({
        name: 'GemList',
        params: { response: data, origin, originName, destination, destinationName },
      });
    } catch (err) {
      Alert.alert('Gagal', `Tidak bisa terhubung ke server.\n${String(err)}\n\nPastikan API berjalan dan IP sudah benar di src/config/api.ts`);
    } finally {
      setSearching(false);
    }
  }, [origin, destination, selectedCategory, originName, destinationName, onNavigate]);

  // ─────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.ink} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>Lokayana</Text>
          <Text style={styles.appSub}>Permata Tersembunyi Bali</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => onNavigate({ name: 'Profile' })}>
          <Ionicons name="person-circle-outline" size={32} color={colors.turmeric} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Kartu Titik Awal ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.cardTitle}>Titik Awal</Text>
          </View>

          {origin ? (
            <View style={styles.coordBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.sea} />
              <Text style={styles.coordText}>{originName}</Text>
              <Text style={styles.coordSub}>{origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}</Text>
            </View>
          ) : (
            <Text style={styles.emptyHint}>Belum dipilih</Text>
          )}

          {/* GPS Button */}
          <TouchableOpacity style={styles.gpsBtn} onPress={handleGetGPS} disabled={gpsLoading} activeOpacity={0.8}>
            {gpsLoading
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Ionicons name="navigate" size={16} color={colors.white} />}
            <Text style={styles.gpsBtnText}>{gpsLoading ? 'Mencari GPS…' : 'Gunakan Lokasi Saat Ini'}</Text>
          </TouchableOpacity>

          {/* Preset titik awal */}
          <Text style={styles.orLabel}>— atau pilih lokasi —</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetScroll}>
            {PRESET_DESTINATIONS.map((p) => (
              <TouchableOpacity
                key={p.name}
                style={[styles.presetChip, originName === p.name && styles.presetChipActive]}
                onPress={() => handleOriginPreset(p)}
              >
                <Text style={[styles.presetText, originName === p.name && styles.presetTextActive]}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Panah penghubung ── */}
        <View style={styles.arrowRow}>
          <View style={styles.arrowLine} />
          <View style={styles.arrowCircle}>
            <Ionicons name="arrow-down" size={16} color={colors.sea} />
          </View>
          <View style={styles.arrowLine} />
        </View>

        {/* ── Kartu Destinasi ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.cardTitle}>Destinasi</Text>
          </View>

          {destination ? (
            <View style={styles.coordBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.sea} />
              <View>
                <Text style={styles.coordText}>{destinationName}</Text>
                <Text style={styles.coordSub}>{destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyHint}>Belum dipilih</Text>
          )}

          <TouchableOpacity
            style={styles.pickDestBtn}
            onPress={() => setShowDestPresets((v) => !v)}
            activeOpacity={0.8}
          >
            <Ionicons name="map-outline" size={16} color={colors.sea} />
            <Text style={styles.pickDestText}>Pilih Destinasi</Text>
            <Ionicons name={showDestPresets ? 'chevron-up' : 'chevron-down'} size={16} color={colors.sea} />
          </TouchableOpacity>

          {showDestPresets && (
            <View style={styles.presetList}>
              {PRESET_DESTINATIONS.map((p) => (
                <TouchableOpacity
                  key={p.name}
                  style={[styles.presetListItem, destinationName === p.name && styles.presetListItemActive]}
                  onPress={() => handleDestPreset(p)}
                >
                  <Ionicons name="location-outline" size={14} color={destinationName === p.name ? colors.sea : colors.muted} />
                  <Text style={[styles.presetListText, destinationName === p.name && styles.presetListTextActive]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Kategori ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="layers-outline" size={18} color={colors.sea} />
            <Text style={styles.cardTitle}>Kategori Wisata</Text>
          </View>
          {!selectedCategory && <Text style={styles.emptyHint}>Pilih kategori untuk filter hidden gem</Text>}
          <CategoryPicker
            categories={CATEGORIES}
            selectedId={selectedCategory?.id ?? null}
            onSelect={setSelectedCategory}
          />
        </View>

        {/* ── Tombol Cari ── */}
        <TouchableOpacity
          style={[styles.searchBtn, (!origin || !destination || !selectedCategory || searching) && styles.searchBtnDisabled]}
          onPress={handleSearch}
          disabled={!origin || !destination || !selectedCategory || searching}
          activeOpacity={0.85}
        >
          {searching
            ? <ActivityIndicator color={colors.ink} size="small" />
            : <Ionicons name="diamond" size={20} color={colors.ink} />}
          <Text style={styles.searchBtnText}>
            {searching ? 'Mencari Hidden Gem…' : 'Temukan Hidden Gem'}
          </Text>
        </TouchableOpacity>

        {/* ── Info radius ── */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
          <Text style={styles.infoText}>
            Radius pencarian 15 km dari titik awal & destinasi. Hanya tempat dengan {'<'} 10 ulasan yang ditampilkan.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.ink, paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingBottom: 20, paddingHorizontal: 20,
  },
  appName: { fontFamily: fonts.extraBold, fontSize: 26, color: colors.turmeric },
  appSub: { fontFamily: fonts.medium, fontSize: 13, color: colors.mist, marginTop: 2 },
  profileBtn: { padding: 4 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  // Card
  card: {
    backgroundColor: colors.paper, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: colors.line,
    shadowColor: colors.ink, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2, gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  dot: { width: 10, height: 10, borderRadius: 5 },

  // Coord badge
  coordBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.mist, borderRadius: 10, padding: 10 },
  coordText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  coordSub: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  emptyHint: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },

  // GPS button
  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.sea, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16,
  },
  gpsBtnText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },

  // Or label
  orLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, textAlign: 'center' },

  // Preset horizontal chips
  presetScroll: { gap: 8 },
  presetChip: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: colors.mist, borderWidth: 1, borderColor: colors.line,
  },
  presetChipActive: { backgroundColor: colors.sea, borderColor: colors.sea },
  presetText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  presetTextActive: { color: colors.white },

  // Destination picker button
  pickDestBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: colors.sea, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  pickDestText: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.sea },

  // Preset list (dropdown)
  presetList: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8, gap: 4 },
  presetListItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10,
  },
  presetListItemActive: { backgroundColor: colors.mist },
  presetListText: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  presetListTextActive: { color: colors.sea, fontFamily: fonts.bold },

  // Arrow connector
  arrowRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20 },
  arrowLine: { flex: 1, height: 1, backgroundColor: colors.line },
  arrowCircle: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1.5,
    borderColor: colors.sea, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.paper,
  },

  // Search button
  searchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.turmeric, borderRadius: 16, paddingVertical: 16,
    shadowColor: colors.turmeric, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  searchBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  searchBtnText: { fontFamily: fonts.extraBold, fontSize: 16, color: colors.ink },

  // Info box
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: colors.mist, borderRadius: 12, padding: 12,
  },
  infoText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.muted, lineHeight: 18 },
});
