import type {
  AlternativeDestination,
  Coordinate,
  Destination,
  RecommendationResponse,
  SearchArea,
} from '../types';
import {
  calculateHaversineDistance,
  calculateGreedyOrder,
  calculateMultiStopRoute,
} from './routingService';
import { getAllDestinations, findNearestDestination } from './destinationService';

const KEYWORD_LIST = [
  'pantai', 'beach', 'sunset', 'sunrise', 'pasir', 'surf', 'ombak', 'karang',
  'pura', 'temple', 'candi', 'tirta', 'suci', 'sakral', 'sembahyang',
  'air terjun', 'waterfall', 'curug', 'sejuk', 'hutan', 'forest', 'monkey',
  'patung', 'monumen', 'gwk', 'wisnu', 'titi banda', 'arca',
  'bukit', 'hill', 'tebing', 'cliff', 'lembah', 'pemandangan',
  'danau', 'lake', 'beratan', 'batur', 'buyan', 'sungai', 'rafting',
  'taman', 'park', 'waterbom', 'rekreasi', 'kebun', 'flower',
  'museum', 'galeri', 'art', 'seni', 'budaya', 'desa adat', 'puri',
];

function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  return KEYWORD_LIST.filter((k) => lower.includes(k));
}

/**
 * Menghitung skor kemiripan AI (0 - 100%) antara destinasi tujuan dan calon alternatif.
 */
function calculateSimilarityScore(
  target: Destination,
  candidate: Destination,
  distanceFromHubKm: number
): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Kesamaan Kategori (Bobot Maks: 45)
  if (candidate.category === target.category) {
    score += 45;
    reasons.push(`Sama-sama kategori ${candidate.category}`);
  } else if (candidate.broadCategory === target.broadCategory) {
    score += 28;
    reasons.push(`Vibe wisata ${candidate.broadCategory} sejenis`);
  } else {
    score += 12;
  }

  // 2. Analisis Semantik Kata Kunci (Bobot Maks: 25)
  const targetKeywords = extractKeywords(`${target.name} ${target.category}`);
  const candidateKeywords = extractKeywords(`${candidate.name} ${candidate.category}`);
  const sharedKeywords = candidateKeywords.filter((k) => targetKeywords.includes(k));

  if (sharedKeywords.length > 0) {
    const kwBonus = Math.min(25, sharedKeywords.length * 12);
    score += kwBonus;
    reasons.push(`Daya tarik sejenis (${sharedKeywords.slice(0, 2).join(', ')})`);
  }

  // 3. Kesamaan Wilayah / Kabupaten (Bobot Maks: 15)
  if (candidate.city && target.city && candidate.city === target.city) {
    score += 10;
    if (candidate.district === target.district) {
      score += 5;
      reasons.push(`Di kawasan yang sama (${candidate.district})`);
    }
  }

  // 4. Rating & Kualitas (Bobot Maks: 10)
  if (candidate.rating >= 4.7) {
    score += 10;
  } else if (candidate.rating >= 4.4) {
    score += 7;
  } else if (candidate.rating >= 4.0) {
    score += 4;
  }

  // 5. Bonus Kedekatan dalam Radius 15 km (Bobot Maks: 5)
  const proximityBonus = Math.max(0, Math.round((15 - distanceFromHubKm) / 3));
  score += proximityBonus;

  // Normalisasi skor antara 60% - 99%
  const finalScore = Math.min(99, Math.max(62, Math.round(score)));
  const mainReason = reasons.length > 0 ? reasons[0] : `Alternatif populer di radius 15 km`;

  return { score: finalScore, reason: mainReason };
}

/**
 * Menghitung reward poin gamifikasi Lokayana
 */
function calculatePoints(reviewCount: number, similarityScore: number): { reward: number; bonus: number } {
  if (reviewCount < 10) {
    return { reward: 80, bonus: 50 };
  } else if (reviewCount < 50) {
    return { reward: 50, bonus: 25 };
  } else if (reviewCount < 200) {
    return { reward: 30, bonus: 15 };
  }
  return { reward: 20, bonus: 10 };
}

/**
 * Engine Utama Rekomendasi & Optimasi Rute Lokayana AI
 * Mendukung:
 *  - Destinasi tunggal maupun multi-tujuan (Multi-Stop Trip)
 *  - Algoritma Greedy TSP untuk menentukan urutan kunjungan tercepat
 *  - Logika radius:
 *    * Jika jarak > 15 km: 2 titik radius (Origin 15 km + Destinasi 15 km)
 *    * Jika jarak <= 15 km: 1 titik radius gabungan (15 km)
 *    * Multi-destinasi: radius 15 km di setiap simpul rute
 *  - Rekomendasi alternatif serupa di sepanjang zona 15 km
 */
export async function getRecommendations(
  origin: Coordinate & { name: string },
  destination: Coordinate & { name: string; destinationObj?: Destination | null },
  selectedDestinations?: Destination[]
): Promise<RecommendationResponse> {
  const allDestinations = getAllDestinations();

  // Tentukan daftar target destinasi
  let targets: Destination[] = [];
  if (selectedDestinations && selectedDestinations.length > 0) {
    targets = [...selectedDestinations];
  } else if (destination.destinationObj) {
    targets = [destination.destinationObj];
  } else {
    targets = [findNearestDestination(destination)];
  }

  // 1. Urutkan destinasi menggunakan Greedy TSP (Nearest Neighbour)
  const orderedDestinations = calculateGreedyOrder(origin, targets);
  const primaryDestination = orderedDestinations[orderedDestinations.length - 1] ?? targets[0];

  const RADIUS_KM = 15.0;
  const isMultiStop = orderedDestinations.length > 1;

  // 2. Evaluasi Aturan Radius (Requirement 5 & 6)
  const straightDistanceKm = isMultiStop
    ? orderedDestinations.reduce((acc, cur, idx) => {
        const prev = idx === 0 ? origin : orderedDestinations[idx - 1];
        return acc + calculateHaversineDistance(prev, cur);
      }, 0)
    : calculateHaversineDistance(origin, primaryDestination);

  const isDualRadius = isMultiStop || straightDistanceKm > RADIUS_KM;

  const searchAreas: SearchArea[] = [];
  if (isMultiStop) {
    // Radius awal
    searchAreas.push({
      label: 'ORIGIN',
      latitude: origin.lat,
      longitude: origin.lng,
      radiusKm: RADIUS_KM,
      title: 'Radius Titik Awal (15 km)',
      description: `Zona keberangkatan sekitar ${origin.name}`,
    });
    // Radius setiap pemberhentian
    orderedDestinations.forEach((dest, i) => {
      searchAreas.push({
        label: 'DESTINATION',
        latitude: dest.lat,
        longitude: dest.lng,
        radiusKm: RADIUS_KM,
        title: `Stop ${i + 1}: ${dest.name} (15 km)`,
        description: `Zona destinasi ${dest.name}`,
      });
    });
  } else if (isDualRadius) {
    searchAreas.push({
      label: 'DESTINATION',
      latitude: primaryDestination.lat,
      longitude: primaryDestination.lng,
      radiusKm: RADIUS_KM,
      title: 'Radius Destinasi (15 km)',
      description: `Mencari alternatif serupa di sekitar ${primaryDestination.name}`,
    });
    searchAreas.push({
      label: 'ORIGIN',
      latitude: origin.lat,
      longitude: origin.lng,
      radiusKm: RADIUS_KM,
      title: 'Radius Titik Awal (15 km)',
      description: `Mencari alternatif serupa di sekitar ${origin.name}`,
    });
  } else {
    searchAreas.push({
      label: 'MERGED',
      latitude: primaryDestination.lat,
      longitude: primaryDestination.lng,
      radiusKm: RADIUS_KM,
      title: 'Radius Tunggal (15 km)',
      description: `Jarak perjalanan ${straightDistanceKm.toFixed(1)} km (≤ 15 km), pencarian alternatif difokuskan dalam 1 radius 15 km`,
    });
  }

  // Set ID destinasi yang sudah dipilih user agar tidak direkomendasikan kembali
  const selectedIds = new Set(targets.map((t) => t.id));

  // 3. Filter calon destinasi dalam radius 15 km
  const candidates: AlternativeDestination[] = [];

  for (const candidate of allDestinations) {
    if (selectedIds.has(candidate.id)) continue;

    // Cek jarak ke origin
    const distToOrigin = calculateHaversineDistance(origin, candidate);

    // Cari stop terdekat ke kandidat
    let nearestStop = primaryDestination;
    let minDistToStop = Infinity;

    for (const stop of orderedDestinations) {
      const d = calculateHaversineDistance(stop, candidate);
      if (d < minDistToStop) {
        minDistToStop = d;
        nearestStop = stop;
      }
    }

    let eligible = false;
    let nearestCenter: 'ORIGIN' | 'DESTINATION' | 'MERGED' = 'DESTINATION';
    let distanceFromHubKm = minDistToStop;

    if (isMultiStop) {
      if (minDistToStop <= RADIUS_KM || distToOrigin <= RADIUS_KM) {
        eligible = true;
        if (minDistToStop <= distToOrigin) {
          nearestCenter = 'DESTINATION';
          distanceFromHubKm = minDistToStop;
        } else {
          nearestCenter = 'ORIGIN';
          distanceFromHubKm = distToOrigin;
        }
      }
    } else if (isDualRadius) {
      const inDestRadius = minDistToStop <= RADIUS_KM;
      const inOriginRadius = distToOrigin <= RADIUS_KM;

      if (inDestRadius && inOriginRadius) {
        eligible = true;
        if (minDistToStop <= distToOrigin) {
          nearestCenter = 'DESTINATION';
          distanceFromHubKm = minDistToStop;
        } else {
          nearestCenter = 'ORIGIN';
          distanceFromHubKm = distToOrigin;
        }
      } else if (inDestRadius) {
        eligible = true;
        nearestCenter = 'DESTINATION';
        distanceFromHubKm = minDistToStop;
      } else if (inOriginRadius) {
        eligible = true;
        nearestCenter = 'ORIGIN';
        distanceFromHubKm = distToOrigin;
      }
    } else {
      // Single radius mode
      if (minDistToStop <= RADIUS_KM) {
        eligible = true;
        nearestCenter = 'MERGED';
        distanceFromHubKm = minDistToStop;
      }
    }

    if (eligible) {
      const { score, reason } = calculateSimilarityScore(
        nearestStop,
        candidate,
        distanceFromHubKm
      );
      const { reward, bonus } = calculatePoints(candidate.reviewCount, score);

      const estimatedTravelMinutes = Math.max(
        5,
        Math.round((distanceFromHubKm / 35) * 60)
      );

      candidates.push({
        ...candidate,
        similarityScore: score,
        similarityReason: `${reason} (dekat ${nearestStop.name})`,
        distanceFromHubKm: Number(distanceFromHubKm.toFixed(1)),
        nearestCenter,
        estimatedTravelMinutes,
        ratings: {
          beauty: candidate.rating >= 4.5 ? candidate.rating : 4.2,
          access: candidate.rating >= 4.0 ? 4.0 : 3.5,
          facilities: candidate.rating >= 4.2 ? 4.1 : 3.8,
        },
        rewardPoints: reward,
        firstReviewBonusPoints: bonus,
      });
    }
  }

  // 4. Urutkan berdasarkan similarity score tertinggi
  candidates.sort((a, b) => {
    if (b.similarityScore !== a.similarityScore) {
      return b.similarityScore - a.similarityScore;
    }
    return b.rating - a.rating;
  });

  const topAlternatives = candidates.slice(0, 30);

  // 5. Hitung rute tercepat (multi-stop)
  const routePoints = [origin, ...orderedDestinations];
  const route = await calculateMultiStopRoute(routePoints);

  return {
    origin,
    destination: {
      lat: primaryDestination.lat,
      lng: primaryDestination.lng,
      name: isMultiStop
        ? `${orderedDestinations.length} Destinasi (${primaryDestination.name})`
        : primaryDestination.name,
      destinationObj: primaryDestination,
    },
    orderedDestinations,
    stops: orderedDestinations,
    straightDistanceKm: Number(straightDistanceKm.toFixed(1)),
    isDualRadius,
    searchAreas,
    route,
    alternatives: topAlternatives,
  };
}
