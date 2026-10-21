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
 * Nearest-Neighbour (Greedy TSP):
 * Mengurutkan destinasi agar rute perjalanan efisien dari titik awal (Origin -> Dest 1 -> Dest 2 -> ...).
 */
export function calculateGreedyOrder<T extends Coordinate>(
  origin: Coordinate,
  destinations: T[]
): T[] {
  if (destinations.length <= 1) return [...destinations];

  const unvisited = [...destinations];
  const ordered: T[] = [];
  let current: Coordinate = origin;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDist = calculateHaversineDistance(current, unvisited[0]);

    for (let i = 1; i < unvisited.length; i++) {
      const d = calculateHaversineDistance(current, unvisited[i]);
      if (d < minDist) {
        minDist = d;
        nearestIdx = i;
      }
    }

    const nextPlace = unvisited.splice(nearestIdx, 1)[0];
    ordered.push(nextPlace);
    current = nextPlace;
  }

  return ordered;
}

/**
 * Menghasilkan kurva realistis antar dua titik jika API OSRM offline.
 */
function generateFallbackCurve(origin: Coordinate, dest: Coordinate): Coordinate[] {
  const points: Coordinate[] = [origin];
  const steps = 16;
  const midLat = (origin.lat + dest.lat) / 2;
  const midLng = (origin.lng + dest.lng) / 2;
  const offsetLat = (dest.lng - origin.lng) * 0.08;
  const offsetLng = (origin.lat - dest.lat) * 0.08;

  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const lat = (1 - t) * (1 - t) * origin.lat + 2 * (1 - t) * t * (midLat + offsetLat) + t * t * dest.lat;
    const lng = (1 - t) * (1 - t) * origin.lng + 2 * (1 - t) * t * (midLng + offsetLng) + t * t * dest.lng;
    points.push({ lat, lng });
  }

  points.push(dest);
  return points;
}

/**
 * Menghitung rute multi-titik (Origin -> Dest1 -> Dest2 -> ...).
 * Mendukung beberapa OSRM mirror dengan failover otomatis.
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

  // Hitung total straight line distance
  let totalStraight = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalStraight += calculateHaversineDistance(points[i], points[i + 1]);
  }

  const coordsString = points
    .map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`)
    .join(';');

  const candidateEndpoints = [
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordsString}?overview=full&geometries=geojson`,
    `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`,
    `http://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`,
  ];

  for (const url of candidateEndpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

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
        }
      }
    } catch {
      // Coba mirror berikutnya
      continue;
    }
  }

  // Fallback gabungan jika seluruh OSRM endpoint offline
  const fallbackPolyline: Coordinate[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const curve = generateFallbackCurve(points[i], points[i + 1]);
    if (i > 0) curve.shift(); // Hindari duplikasi titik sambungan
    fallbackPolyline.push(...curve);
  }

  const roadDistanceKm = Number((totalStraight * 1.32).toFixed(1));
  const carDurationMinutes = Math.max(12, Math.round((roadDistanceKm / 28) * 60));
  const motorDurationMinutes = Math.max(9, Math.round((roadDistanceKm / 38) * 60));
  const timeDiff = carDurationMinutes - motorDurationMinutes;

  return {
    straightDistanceKm: Number(totalStraight.toFixed(1)),
    roadDistanceKm,
    carDurationMinutes,
    motorDurationMinutes,
    fastestMode: 'MOTOR',
    polylineCoords: fallbackPolyline,
    summaryNote: `🛵 Motor rute tercepat (hemat ~${timeDiff} mnt di jalanan Bali)`,
  };
}

/**
 * Kompatibilitas mundur untuk kalkulasi rute 2 titik (Origin -> Single Destination).
 */
export async function calculateFastestRoute(
  origin: Coordinate,
  destination: Coordinate
): Promise<RouteInfo> {
  return calculateMultiStopRoute([origin, destination]);
}
