import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors, fonts } from '../theme';
import type { Coordinate } from '../types';
import { POPULAR_ORIGIN_PRESETS, findNearestDestination } from '../services/destinationService';

interface Props {
  visible: boolean;
  title?: string;
  initialCoord?: Coordinate | null;
  onSelect: (coord: Coordinate, placeName: string) => void;
  onClose: () => void;
}

const BALI_CENTER = {
  latitude: -8.55,
  longitude: 115.2,
  latitudeDelta: 0.55,
  longitudeDelta: 0.55,
};

export default function MapLocationPickerModal({
  visible,
  title = 'Pilih Titik di Peta',
  initialCoord,
  onSelect,
  onClose,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const [selectedCoord, setSelectedCoord] = useState<Coordinate>(
    initialCoord ?? { lat: -8.7184, lng: 115.1686 } // Default Kuta
  );
  const [locationName, setLocationName] = useState<string>('Pilih titik pada peta');
  const [gpsLoading, setGpsLoading] = useState(false);

  // Update nearest place name whenever coordinate changes
  const updateCoord = (coord: Coordinate, customName?: string) => {
    setSelectedCoord(coord);
    if (customName) {
      setLocationName(customName);
    } else {
      const nearest = findNearestDestination(coord);
      setLocationName(`Dekat ${nearest.name} (${nearest.district})`);
    }
  };

  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    updateCoord({ lat: latitude, lng: longitude });
  };

  const handleGetGPS = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Lokasi', 'Aktifkan izin lokasi untuk menggunakan GPS perangkat.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coord = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      updateCoord(coord, 'Lokasi Saat Ini (GPS)');
      mapRef.current?.animateToRegion(
        {
          latitude: coord.lat,
          longitude: coord.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        500
      );
    } catch {
      Alert.alert('Gagal Membaca GPS', 'Pastikan GPS perangkat Anda aktif.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSelectPreset = (preset: { name: string; lat: number; lng: number }) => {
    updateCoord({ lat: preset.lat, lng: preset.lng }, preset.name);
    mapRef.current?.animateToRegion(
      {
        latitude: preset.lat,
        longitude: preset.lng,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      },
      400
    );
  };

  const handleConfirm = () => {
    onSelect(selectedCoord, locationName);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={colors.ink} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSub}>Ketuk peta atau pilih lokasi rekomendasi</Text>
          </View>
        </View>

        {/* Preset Chips */}
        <View style={styles.presetContainer}>
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
                  locationName === p.name && styles.presetChipActive,
                ]}
                onPress={() => handleSelectPreset(p)}
              >
                <Ionicons
                  name="location-outline"
                  size={12}
                  color={locationName === p.name ? '#FFFFFF' : colors.sea}
                />
                <Text
                  style={[
                    styles.presetText,
                    locationName === p.name && styles.presetTextActive,
                  ]}
                >
                  {p.name.split(' (')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Map */}
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            style={styles.map}
            mapType={Platform.OS === 'android' ? 'none' : 'standard'}
            initialRegion={{
              latitude: selectedCoord.lat,
              longitude: selectedCoord.lng,
              latitudeDelta: BALI_CENTER.latitudeDelta,
              longitudeDelta: BALI_CENTER.longitudeDelta,
            }}
            onPress={handleMapPress}
            showsUserLocation
          >
            <UrlTile
              urlTemplate="https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
              maximumZ={19}
              flipY={false}
              zIndex={-1}
            />
            <Marker
              coordinate={{ latitude: selectedCoord.lat, longitude: selectedCoord.lng }}
              draggable
              onDragEnd={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                updateCoord({ lat: latitude, lng: longitude });
              }}
              title="Titik Terpilih"
              description={locationName}
            >
              <View style={styles.pinContainer}>
                <View style={styles.pinPulse} />
                <View style={styles.pin}>
                  <Ionicons name="location" size={22} color="#FFFFFF" />
                </View>
              </View>
            </Marker>
          </MapView>

          {/* Floating GPS Button */}
          <TouchableOpacity
            style={styles.floatingGpsBtn}
            onPress={handleGetGPS}
            disabled={gpsLoading}
            activeOpacity={0.85}
          >
            {gpsLoading ? (
              <ActivityIndicator color={colors.ink} size="small" />
            ) : (
              <Ionicons name="locate" size={22} color={colors.ink} />
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom confirmation card */}
        <View style={styles.bottomCard}>
          <View style={styles.locationInfo}>
            <View style={styles.locationIconWrap}>
              <Ionicons name="navigate-circle" size={32} color={colors.sea} />
            </View>
            <View style={styles.locationTextWrap}>
              <Text style={styles.locationTitle} numberOfLines={1}>
                {locationName}
              </Text>
              <Text style={styles.locationCoords}>
                {selectedCoord.lat.toFixed(5)}, {selectedCoord.lng.toFixed(5)}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
            <Ionicons name="checkmark-sharp" size={20} color="#FFFFFF" />
            <Text style={styles.confirmBtnText}>Pilih Titik Ini</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 44 : 54,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flex: 1, marginLeft: 12 },
  headerTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  headerSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  presetContainer: { backgroundColor: colors.paper, paddingVertical: 10 },
  presetScroll: { paddingHorizontal: 16, gap: 8 },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.line,
  },
  presetChipActive: { backgroundColor: colors.sea, borderColor: colors.sea },
  presetText: { fontFamily: fonts.medium, fontSize: 12, color: colors.ink },
  presetTextActive: { color: '#FFFFFF', fontFamily: fonts.bold },
  mapWrap: { flex: 1, position: 'relative' },
  map: { width: '100%', height: '100%' },
  pinContainer: { alignItems: 'center', justifyContent: 'center' },
  pinPulse: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(27, 107, 102, 0.25)',
  },
  pin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.sea,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  floatingGpsBtn: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  bottomCard: {
    backgroundColor: colors.paper,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'android' ? 20 : 34,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -3 },
  },
  locationInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  locationIconWrap: { marginRight: 12 },
  locationTextWrap: { flex: 1 },
  locationTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  locationCoords: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.sea,
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmBtnText: { fontFamily: fonts.bold, fontSize: 15, color: '#FFFFFF' },
});
