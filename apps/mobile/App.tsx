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
import type { AppScreen, AlternativeDestination, RecommendationResponse } from './src/types';
import HomeScreen from './src/screens/HomeScreen';
import GemListScreen from './src/screens/GemListScreen';
import ReviewScreen from './src/screens/ReviewScreen';
import ProfileScreen from './src/screens/ProfileScreen';
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

  // ── State Gamifikasi Poin & Lencana ──
  const [totalPoints, setTotalPoints] = useState<number>(180);
  const [hiddenGemReviews, setHiddenGemReviews] = useState<number>(3);

  // ── Handler Ganti Screen ──
  const handleNavigate = useCallback((screen: AppScreen) => {
    setCurrentScreen(screen);
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
          const newResponse = await getRecommendations(
            prevParams.origin,
            {
              lat: gem.lat,
              lng: gem.lng,
              name: gem.name,
              destinationObj: gem,
            }
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
      return <HomeScreen onNavigate={handleNavigate} />;

    case 'GemList':
      return (
        <GemListScreen
          params={currentScreen.params}
          onNavigate={handleNavigate}
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
          onNavigate={handleNavigate}
        />
      );

    default:
      return <HomeScreen onNavigate={handleNavigate} />;
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