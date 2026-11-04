import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { colors, fonts } from './src/theme';
import type {
  AppScreen,
  AlternativeDestination,
  Coordinate,
  RecommendationResponse,
} from './src/types';
import HomeScreen from './src/screens/HomeScreen';
import GemListScreen from './src/screens/GemListScreen';
import ReviewScreen from './src/screens/ReviewScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import { getRecommendations } from './src/services/recommenderService';

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // ── State Navigasi Antar Layar ──
  const [currentScreen, setCurrentScreen] = useState<AppScreen>({ name: 'Home' });

  // ── State Autentikasi (default sudah login sebagai admin) ──
  const [authUser, setAuthUser] = useState<string | null>('admin');

  // ── State Titik Awal (disimpan di App agar tidak reset saat pindah layar) ──
  const [origin, setOrigin] = useState<Coordinate | null>({
    lat: -8.7184,
    lng: 115.1686,
  }); // Default Kuta
  const [originName, setOriginName] = useState('Kuta Central');

  // ── State Gamifikasi Poin & Lencana ──
  const [totalPoints, setTotalPoints] = useState<number>(180);
  const [hiddenGemReviews, setHiddenGemReviews] = useState<number>(3);

  // ── Handler Ganti Screen ──
  const handleNavigate = useCallback((screen: AppScreen) => {
    setCurrentScreen(screen);
  }, []);

  // ── Handler Ubah Titik Awal ──
  const handleOriginChange = useCallback((coord: Coordinate, name: string) => {
    setOrigin(coord);
    setOriginName(name);
  }, []);

  // ── Handler Logout (kembali ke Home sebagai tamu) ──
  const handleLogout = useCallback(() => {
    setAuthUser(null);
    setCurrentScreen({ name: 'Home' });
  }, []);

  // ── Handler Login Berhasil ──
  const handleLoginSuccess = useCallback((username: string) => {
    setAuthUser(username);
    setCurrentScreen({ name: 'Home' });
  }, []);

  // ── Handler Setelah Submit Ulasan ──
  const handleReviewSubmitted = useCallback((earnedPoints: number) => {
    setTotalPoints((prev) => prev + earnedPoints);
    setHiddenGemReviews((prev) => prev + 1);
  }, []);

  // ── Handler Beralih Destinasi ke Alternatif yang Dipilih ──
  const handleSwitchDestination = useCallback(
    async (gem: AlternativeDestination) => {
      if (currentScreen.name === 'GemList') {
        const prevParams = currentScreen.params;
        try {
          const currentDestinations =
            prevParams.orderedDestinations && prevParams.orderedDestinations.length > 0
              ? prevParams.orderedDestinations.map((d) =>
                  d.id === prevParams.destination.destinationObj?.id ? gem : d
                )
              : [gem];

          const newResponse = await getRecommendations(
            prevParams.origin,
            {
              lat: gem.lat,
              lng: gem.lng,
              name: gem.name,
              destinationObj: gem,
            },
            currentDestinations
          );
          setCurrentScreen({
            name: 'GemList',
            params: newResponse,
          });
        } catch (err) {
          console.error('Failed to recalculate with new destination:', err);
        }
      }
    },
    [currentScreen]
  );

  // Loading Screen saat memuat font
  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.brandBadge}>
          <Text style={styles.brandIcon}>🧭</Text>
        </View>
        <Text style={styles.brandName}>Lokayana AI</Text>
        <Text style={styles.brandSub}>Menyiapkan peta & kecerdasan navigasi Bali…</Text>
        <ActivityIndicator size="large" color={colors.sea} style={{ marginTop: 20 }} />
      </View>
    );
  }

  // ── Render Layar Aktif ──
  switch (currentScreen.name) {
    case 'Home':
      return (
        <HomeScreen
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          isLoggedIn={authUser !== null}
          origin={origin}
          originName={originName}
          onOriginChange={handleOriginChange}
        />
      );

    case 'GemList':
      return (
        <GemListScreen
          params={currentScreen.params}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          isLoggedIn={authUser !== null}
          onSwitchDestination={handleSwitchDestination}
        />
      );

    case 'Review':
      return (
        <ReviewScreen
          params={currentScreen.params}
          onNavigate={handleNavigate}
          onReviewSubmitted={handleReviewSubmitted}
        />
      );

    case 'Profile':
      return (
        <ProfileScreen
          totalPoints={totalPoints}
          hiddenGemReviews={hiddenGemReviews}
          username={authUser}
          onNavigate={handleNavigate}
        />
      );

    case 'Login':
      return (
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onBack={() => handleNavigate({ name: 'Home' })}
        />
      );

    default:
      return (
        <HomeScreen
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          isLoggedIn={authUser !== null}
          origin={origin}
          originName={originName}
          onOriginChange={handleOriginChange}
        />
      );
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  brandBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandIcon: {
    fontSize: 32,
  },
  brandName: {
    fontSize: 26,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: 13,
    color: colors.mist,
    marginTop: 6,
    textAlign: 'center',
  },
});