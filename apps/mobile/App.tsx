import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, FlatList, Alert } from 'react-native';
import { useFonts } from 'expo-font';
import { PlusJakartaSans_400Regular, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { HiddenGemCard } from './src/components/HiddenGemCard';

// Tipe data lokal agar tidak perlu setting alias monorepo di Expo
type HiddenGem = {
  id: string;
  name: string;
  categoryName: string;
  coverPhotoUrl: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number;
  nearestCenter: 'ORIGIN' | 'DESTINATION';
  reviewCount: number;
  ratings: {
    beauty: number | null;
    access: number | null;
    facilities: number | null;
  };
  rewardPoints: number;
  firstReviewBonusPoints: number;
};

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_700Bold,
  });
  
  const [gems, setGems] = useState<HiddenGem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // GANTI "192.168.X.X" DENGAN IP ADDRESS WIFI LAPTOPMU
    const API_URL = 'http://10.226.222.70:3000/recommendations/hidden-gems?originLat=-8.7184&originLng=115.1686&destLat=-8.5069&destLng=115.2624&categoryId=3';
    
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => {
        // Menangkap array "gems" dari respons API yang kamu tes di CMD tadi
        setGems(data.gems || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Gagal mengambil data:", err);
        setLoading(false);
      });
  }, []);

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rekomendasi Hidden Gem</Text>
      <FlatList
        data={gems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HiddenGemCard
            gem={item}
            onPressCard={(gem) => Alert.alert('Detail', `Membuka detail: ${gem.name}`)}
            onPressReview={(gem) => Alert.alert('Tulis Ulasan', `Membuka formulir ulasan untuk: ${gem.name}`)}
          />
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontFamily: 'PlusJakartaSans_700Bold', marginHorizontal: 16, marginBottom: 16, color: '#1A1A1A' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
});