/**
 * recommenderService.ts — Hybrid Engine: Python Backend Client + Resilient Local Fallback
 * =======================================================================================
 * Sistem utama:
 *   1. Mencoba menghubungi Python FastAPI Backend (POST /api/route)
 *      yang menjalankan Time-Aware A* TSP & AI Similarity Engine.
 *   2. Jika backend offline/unreachable (misal laptop belum menyalakan python),
 *      secara otomatis fallback ke kalkulasi lokal (Time-Aware A* + Best Timing)
 *      sehingga presentasi / aplikasi mobile tetap 100% berjalan tanpa crash!
 *
 * @see apps/backend/core/astar.py       — Time-Aware A* TSP Solver (Python)
 * @see apps/backend/core/best_timing.py — Best Timing Knowledge Base (Python)
 * @see apps/mobile/src/utils/bestTimingHelper.ts — Best Timing Knowledge Base (TypeScript)
 */

import type {
  AlternativeDestination,
  Coordinate,
  Destination,
  RecommendationResponse,
  SearchArea,
} from '../types';
import { getAllDestinations } from './destinationService';
import { API_BASE_URL } from '../config/api';
import { calculateHaversineDistance, calculateMultiStopRoute } from './routingService';
import { calculateTimeAwareOrder, getDestinationBestTiming } from '../utils/bestTimingHelper';

// ─── Konstanta ─────────────────────────────────────────────────────────────

/** Timeout cepat untuk cek backend (ms). Jika lewat batas, beralih ke local fallback */
const REQUEST_TIMEOUT_MS = 2_500;
const RADIUS_KM = 15.0;

// ─── Semantic Keywords untuk Kemiripan Lokal ────────────────────────────────

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

function calculateLocalSimilarity(
  target: Destination,
  candidate: Destination,
  distanceFromHubKm: number
): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Kategori (maks 45)
  if (candidate.category === target.category) {
    score += 45;
    reasons.push(`Sama-sama kategori ${candidate.category}`);
  } else if (candidate.broadCategory === target.broadCategory) {
    score += 28;
    reasons.push(`Vibe wisata ${candidate.broadCategory} sejenis`);
  } else {
    score += 12;
  }

  // 2. Semantik Keyword (maks 25)
  const targetKeywords = extractKeywords(`${target.name} ${target.category}`);
  const candidateKeywords = extractKeywords(`${candidate.name} ${candidate.category}`);
  const sharedKeywords = candidateKeywords.filter((k) => targetKeywords.includes(k));
  if (sharedKeywords.length > 0) {
    score += Math.min(25, sharedKeywords.length * 12);
    reasons.push(`Daya tarik sejenis (${sharedKeywords.slice(0, 2).join(', ')})`);
  }

  // 3. Wilayah (maks 15)
  if (candidate.city && target.city && candidate.city === target.city) {
    score += 10;
    if (candidate.district === target.district) {
      score += 5;
      reasons.push(`Di kawasan yang sama (${candidate.district})`);
    }
  }

  // 4. Rating (maks 10)
  if (candidate.rating >= 4.7) score += 10;
  else if (candidate.rating >= 4.4) score += 7;
  else if (candidate.rating >= 4.0) score += 4;

  // 5. Proximity bonus (maks 5)
  score += Math.max(0, Math.round((RADIUS_KM - distanceFromHubKm) / 3));

  const finalScore = Math.min(99, Math.max(62, Math.round(score)));
  const mainReason = reasons[0] || 'Alternatif populer di radius 15 km';
  return { score: finalScore, reason: mainReason };
}

// ─── Kalkulasi Lokal Fallback ───────────────────────────────────────────────

async function calculateLocalFallback(
  origin: Coordinate & { name: string },
  targets: Destination[]
): Promise<RecommendationResponse> {
  const allDestinations = getAllDestinations();

  // 1. Urutkan menggunakan Time-Aware A* TSP
  const orderedDestinations = calculateTimeAwareOrder(origin, targets, calculateHaversineDistance);
  const primaryDestination = orderedDestinations[orderedDestinations.length - 1] || targets[0];

  const isMultiStop = orderedDestinations.length > 1;
  const straightDistanceKm = isMultiStop
    ? orderedDestinations.reduce((acc, cur, idx) => {
        const prev = idx === 0 ? origin : orderedDestinations[idx - 1];
        return acc + calculateHaversineDistance(prev, cur);
      }, 0)
    : calculateHaversineDistance(origin, primaryDestination);

  const isDualRadius = isMultiStop || straightDistanceKm > RADIUS_KM;

  // 2. Bangun search areas
  const searchAreas: SearchArea[] = [];
  if (isMultiStop) {
    searchAreas.push({
      label: 'ORIGIN',
      latitude: origin.lat,
      longitude: origin.lng,
      radiusKm: RADIUS_KM,
      title: 'Radius Titik Awal (15 km)',
      description: `Zona keberangkatan sekitar ${origin.name}`,
    });
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
      description: `Jarak ${straightDistanceKm.toFixed(1)} km (≤ 15 km), pencarian dalam 1 radius 15 km`,
    });
  }

  // 3. Filter kandidat alternatif
  const selectedIds = new Set(targets.map((t) => t.id));
  const candidates: AlternativeDestination[] = [];

  for (const candidate of allDestinations) {
    if (selectedIds.has(candidate.id)) continue;

    const distToOrigin = calculateHaversineDistance(origin, candidate);
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
      const inDest = minDistToStop <= RADIUS_KM;
      const inOrig = distToOrigin <= RADIUS_KM;
      if (inDest || inOrig) {
        eligible = true;
        if (minDistToStop <= distToOrigin) {
          nearestCenter = 'DESTINATION';
          distanceFromHubKm = minDistToStop;
        } else {
          nearestCenter = 'ORIGIN';
          distanceFromHubKm = distToOrigin;
        }
      }
    } else {
      if (minDistToStop <= RADIUS_KM) {
        eligible = true;
        nearestCenter = 'MERGED';
        distanceFromHubKm = minDistToStop;
      }
    }

    if (eligible) {
      const { score, reason } = calculateLocalSimilarity(nearestStop, candidate, distanceFromHubKm);
      const timing = getDestinationBestTiming(candidate);
      candidates.push({
        ...candidate,
        similarityScore: score,
        similarityReason: `${reason} (dekat ${nearestStop.name})`,
        distanceFromHubKm: Number(distanceFromHubKm.toFixed(1)),
        nearestCenter,
        estimatedTravelMinutes: Math.max(5, Math.round((distanceFromHubKm / 35) * 60)),
        ratings: {
          beauty: candidate.rating >= 4.5 ? candidate.rating : 4.2,
          access: candidate.rating >= 4.0 ? 4.0 : 3.5,
          facilities: candidate.rating >= 4.2 ? 4.1 : 3.8,
        },
        rewardPoints: candidate.reviewCount < 50 ? 50 : 20,
        firstReviewBonusPoints: candidate.reviewCount < 50 ? 25 : 10,
        best_timing: timing,
      });
    }
  }

  candidates.sort((a, b) => b.similarityScore - a.similarityScore || b.rating - a.rating);
  const topAlternatives = candidates.slice(0, 30);

  // 4. Hitung rute multi-stop
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

// ─── Entry Point Utama ──────────────────────────────────────────────────────

export async function getRecommendations(
  origin: Coordinate & { name: string },
  destination: Coordinate & { name: string; destinationObj?: Destination | null },
  selectedDestinations?: Destination[]
): Promise<RecommendationResponse> {
  const targets: Destination[] =
    selectedDestinations && selectedDestinations.length > 0
      ? selectedDestinations
      : destination.destinationObj
      ? [destination.destinationObj]
      : [];

  if (targets.length === 0) {
    throw new Error('Pilih minimal 1 tempat wisata tujuan terlebih dahulu.');
  }

  // Coba hubungi Python Backend terlebih dahulu
  try {
    const allDestinations = getAllDestinations();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(`${API_BASE_URL}/api/route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        origin_name: origin.name,
        destinations: targets,
        all_destinations: allDestinations,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data: RecommendationResponse = await response.json();
      return data;
    }
  } catch {
    // Backend offline / unreachable -> beralih ke local fallback
  }

  // Fallback: jalankan algoritma Time-Aware A* TSP secara lokal
  return calculateLocalFallback(origin, targets);
}
