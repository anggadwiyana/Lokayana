import type { Coordinate, RouteInfo } from '../types';

/**
 * Menghitung jarak garis lurus (Haversine formula) dalam kilometer.
 */
export function calculateHaversineDistance(c1: Coordinate, c2: Coordinate): number {
  const R = 6371; // Radius bumi dalam km
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const lat1 = (c1.lat * Math.PI) / 180;
  const lat2 = (c2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Menghasilkan titik kurva halus jika OSRM sedang offline.
 */
function generateFallbackCurve(origin: Coordinate, dest: Coordinate): Coordinate[] {
  const points: Coordinate[] = [origin];
  const steps = 16;
  const midLat = (origin.lat + dest.lat) / 2;
  const midLng = (origin.lng + dest.lng) / 2;
  // Sedikit offset agar polyline tampak seperti jalan alami berbelok
  const offsetLat = (dest.lng - origin.lng) * 0.08;
  const offsetLng = (origin.lat - dest.lat) * 0.08;

  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    // Quadratic Bezier interpolation
    const lat = (1 - t) * (1 - t) * origin.lat + 2 * (1 - t) * t * (midLat + offsetLat) + t * t * dest.lat;
    const lng = (1 - t) * (1 - t) * origin.lng + 2 * (1 - t) * t * (midLng + offsetLng) + t * t * dest.lng;
    points.push({ lat, lng });
  }

  points.push(dest);
  return points;
}

/**
 * Mencari rute tercepat menggunakan OSRM API (gratis, tanpa API key).
 * Jika gagal atau offline, menggunakan perhitungan fallback cerdas.
 */
export async function calculateFastestRoute(
  origin: Coordinate,
  destination: Coordinate
): Promise<RouteInfo> {
  const straightDist = calculateHaversineDistance(origin, destination);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng.toFixed(6)},${origin.lat.toFixed(6)};${destination.lng.toFixed(6)},${destination.lat.toFixed(6)}?overview=full&geometries=geojson`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'LokayanaApp/1.0' },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const roadDistanceKm = Number((route.distance / 1000).toFixed(1));
        const baseDurationMinutes = Math.round(route.duration / 60);

        // Estimasi lalu lintas Bali:
        // Mobil: rata-rata 28-32 km/jam (sering kena macet di bypass/jalan sempit)
        // Motor: rata-rata 38-42 km/jam (bisa lewat jalur alternatif/gang tikus khas Bali)
        const carDurationMinutes = Math.max(
          Math.round(baseDurationMinutes * 1.1),
          Math.round((roadDistanceKm / 28) * 60)
        );
        const motorDurationMinutes = Math.max(
          Math.round(baseDurationMinutes * 0.8),
          Math.round((roadDistanceKm / 40) * 60)
        );

        const polylineCoords: Coordinate[] = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => ({ lat, lng })
        );

        const timeDiff = carDurationMinutes - motorDurationMinutes;
        const summaryNote =
          timeDiff > 5
            ? `🛵 Sepeda Motor adalah rute tercepat (hemat ~${timeDiff} menit dibanding mobil)`
            : 'Jalur optimal ditemukan, estimasi waktu tempuh lancar.';

        return {
          straightDistanceKm: Number(straightDist.toFixed(1)),
          roadDistanceKm,
          carDurationMinutes,
          motorDurationMinutes,
          fastestMode: 'MOTOR',
          polylineCoords,
          summaryNote,
        };
      }
    }
  } catch (err) {
    console.warn('OSRM routing fetch failed, using realistic fallback:', err);
  }

  // Fallback jika API OSRM tidak terjangkau
  const roadDistanceKm = Number((straightDist * 1.32).toFixed(1));
  const carDurationMinutes = Math.max(10, Math.round((roadDistanceKm / 28) * 60));
  const motorDurationMinutes = Math.max(8, Math.round((roadDistanceKm / 38) * 60));
  const timeDiff = carDurationMinutes - motorDurationMinutes;

  return {
    straightDistanceKm: Number(straightDist.toFixed(1)),
    roadDistanceKm,
    carDurationMinutes,
    motorDurationMinutes,
    fastestMode: 'MOTOR',
    polylineCoords: generateFallbackCurve(origin, destination),
    summaryNote: `🛵 Sepeda Motor tercepat (hemat ~${timeDiff} menit di lalu lintas Bali)`,
  };
}
