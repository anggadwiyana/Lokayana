/**
 * routingService.ts — Utility Routing Lokal (Fallback)
 * ======================================================
 * Catatan Arsitektur:
 *   Algoritma utama (A* TSP, Similarity Scoring, OSRM fetch) sudah
 *   dipindahkan ke Python backend (apps/backend/).
 *
 *   File ini hanya menyimpan:
 *     1. calculateHaversineDistance — dipakai oleh beberapa komponen UI
 *        (radius lingkaran, estimasi jarak cepat di peta)
 *     2. calculateMultiStopRoute    — masih dipertahankan sebagai fallback
 *        jika komponen tertentu butuh rute langsung tanpa lewat backend
 *
 * @see apps/backend/core/haversine.py  — versi Python Haversine
 * @see apps/backend/core/astar.py      — A* TSP (menggantikan Greedy TSP)
 * @see apps/backend/api/routes.py      — OSRM fetch di backend
 */

import type { Coordinate, RouteInfo } from '../types';

// ─── Haversine Distance ─────────────────────────────────────────────────────

/**
 * Menghitung jarak garis lurus antar dua koordinat (Haversine formula).
 *
 * Digunakan oleh komponen UI untuk:
 *   - Menampilkan estimasi jarak di kartu destinasi
 *   - Menghitung radius lingkaran pada LeafletMapView
 *
 * @param c1 Koordinat pertama
 * @param c2 Koordinat kedua
 * @returns  Jarak dalam kilometer
 */
export function calculateHaversineDistance(c1: Coordinate, c2: Coordinate): number {
  const R = 6_371; // Radius bumi (km)
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const lat1 = (c1.lat * Math.PI) / 180;
  const lat2 = (c2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── OSRM Fallback Curve ────────────────────────────────────────────────────

/**
 * Menghasilkan kurva Bezier kuadratik antar dua titik.
 * Digunakan sebagai fallback visual jika OSRM tidak tersedia.
 *
 * @param origin Koordinat asal
 * @param dest   Koordinat tujuan
 * @returns      Array koordinat kurva
 */
function generateFallbackCurve(origin: Coordinate, dest: Coordinate): Coordinate[] {
  const STEPS = 16;
  const midLat = (origin.lat + dest.lat) / 2;
  const midLng = (origin.lng + dest.lng) / 2;
  // Offset perpendicular kecil agar terlihat seperti jalan melengkung
  const offsetLat = (dest.lng - origin.lng) * 0.08;
  const offsetLng = (origin.lat - dest.lat) * 0.08;

  const points: Coordinate[] = [origin];
  for (let i = 1; i < STEPS; i++) {
    const t = i / STEPS;
    const lat =
      (1 - t) ** 2 * origin.lat +
      2 * (1 - t) * t * (midLat + offsetLat) +
      t ** 2 * dest.lat;
    const lng =
      (1 - t) ** 2 * origin.lng +
      2 * (1 - t) * t * (midLng + offsetLng) +
      t ** 2 * dest.lng;
    points.push({ lat, lng });
  }
  points.push(dest);
  return points;
}

// ─── Multi-Stop Route (Fallback Lokal) ─────────────────────────────────────

/** Faktor konversi jarak lurus ke jarak jalan raya (empiris Bali). */
const ROAD_DISTANCE_FACTOR = 1.32;

/** Kecepatan rata-rata (km/jam) untuk estimasi durasi. */
const AVG_SPEED_CAR_KMH = 28;
const AVG_SPEED_MOTOR_KMH = 40;

/**
 * Menghitung rute multi-titik dengan OSRM, dengan fallback ke Bezier curve.
 *
 * ⚠️  Fungsi ini hanya dipakai jika komponen tertentu membutuhkan rute
 *     tanpa melalui Python backend. Untuk flow utama, gunakan
 *     `getRecommendations()` di recommenderService.ts.
 *
 * @param points Array koordinat [origin, dest1, dest2, ...]
 * @returns      RouteInfo dengan polyline dan estimasi durasi
 */
export async function calculateMultiStopRoute(points: Coordinate[]): Promise<RouteInfo> {
  if (points.length < 2) {
    return {
      straightDistanceKm: 0,
      roadDistanceKm: 0,
      carDurationMinutes: 0,
      motorDurationMinutes: 0,
      fastestMode: 'MOTOR',
      polylineCoords: points,
      summaryNote: 'Rute titik tunggal',
    };
  }

  // Hitung total jarak lurus
  let totalStraight = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalStraight += calculateHaversineDistance(points[i], points[i + 1]);
  }

  const coordsString = points
    .map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`)
    .join(';');

  const osrmEndpoints = [
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordsString}?overview=full&geometries=geojson`,
    `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`,
    `http://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`,
  ];

  for (const url of osrmEndpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6_000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'LokayanaApp/2.0' },
      });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const data = await res.json();
      if (!data.routes?.length) continue;

      const route = data.routes[0];
      const roadDistanceKm = Number((route.distance / 1_000).toFixed(1));
      const baseDurationMinutes = Math.round(route.duration / 60);

      const carDurationMinutes = Math.max(
        Math.round(baseDurationMinutes * 1.1),
        Math.round((roadDistanceKm / AVG_SPEED_CAR_KMH) * 60)
      );
      const motorDurationMinutes = Math.max(
        Math.round(baseDurationMinutes * 0.8),
        Math.round((roadDistanceKm / AVG_SPEED_MOTOR_KMH) * 60)
      );

      const polylineCoords: Coordinate[] = route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => ({ lat, lng })
      );

      const timeDiff = carDurationMinutes - motorDurationMinutes;
      const stopCount = points.length - 1;
      const stopLabel = stopCount > 1 ? `${stopCount} pemberhentian` : '1 destinasi';

      const summaryNote =
        timeDiff > 5
          ? `🛵 Motor rute tercepat untuk ${stopLabel} (hemat ~${timeDiff} mnt vs mobil)`
          : `Jalur optimal ditemukan untuk ${stopLabel}.`;

      return {
        straightDistanceKm: Number(totalStraight.toFixed(1)),
        roadDistanceKm,
        carDurationMinutes,
        motorDurationMinutes,
        fastestMode: 'MOTOR',
        polylineCoords,
        summaryNote,
      };
    } catch {
      // Coba endpoint berikutnya
      continue;
    }
  }

  // ── Fallback: Bezier curve + estimasi empiris ──────────────────────────
  const fallbackPolyline: Coordinate[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const curve = generateFallbackCurve(points[i], points[i + 1]);
    if (i > 0) curve.shift(); // Hindari titik sambungan duplikat
    fallbackPolyline.push(...curve);
  }

  const roadDistanceKm = Number((totalStraight * ROAD_DISTANCE_FACTOR).toFixed(1));
  const carDurationMinutes = Math.max(12, Math.round((roadDistanceKm / AVG_SPEED_CAR_KMH) * 60));
  const motorDurationMinutes = Math.max(9, Math.round((roadDistanceKm / AVG_SPEED_MOTOR_KMH) * 60));
  const timeDiff = carDurationMinutes - motorDurationMinutes;

  return {
    straightDistanceKm: Number(totalStraight.toFixed(1)),
    roadDistanceKm,
    carDurationMinutes,
    motorDurationMinutes,
    fastestMode: 'MOTOR',
    polylineCoords: fallbackPolyline,
    summaryNote: `🛵 Motor rute tercepat (hemat ~${timeDiff} mnt di jalanan Bali) [Offline Mode]`,
  };
}

/**
 * Menghitung rute 2 titik (kompatibilitas mundur).
 *
 * @param origin      Koordinat asal
 * @param destination Koordinat tujuan
 * @returns           RouteInfo
 */
export async function calculateFastestRoute(
  origin: Coordinate,
  destination: Coordinate
): Promise<RouteInfo> {
  return calculateMultiStopRoute([origin, destination]);
}
