"""
api/routes.py — FastAPI Router Lokayana AI
==========================================
Mendefinisikan semua endpoint HTTP untuk Lokayana AI Backend:

  - POST /api/route   : Rekomendasi rute & alternatif destinasi
  - GET  /api/health  : Health check service

Logika bisnis di-delegate ke core/ (recommender, A*, haversine).
Fetch rute jalan raya menggunakan OSRM dengan fallback otomatis.
"""

from __future__ import annotations

import math
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException

from api.schemas import (
    AlternativeDestination,
    Coordinate,
    DestinationInfo,
    OriginInfo,
    RatingDetail,
    RouteInfo,
    RouteRequest,
    RouteResponse,
    SearchArea,
)
from core.haversine import haversine_km
from core.recommender import get_recommendations

# ---------------------------------------------------------------------------
# Router Instance
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/api", tags=["Lokayana AI"])

# ---------------------------------------------------------------------------
# OSRM Constants
# ---------------------------------------------------------------------------

# Timeout per percobaan request OSRM dalam detik
OSRM_TIMEOUT_SECONDS: int = 6

# Daftar endpoint OSRM yang dicoba secara berurutan (failover)
OSRM_ENDPOINTS: list[str] = [
    "https://routing.openstreetmap.de/routed-car/route/v1/driving",
    "https://router.project-osrm.org/route/v1/driving",
    "http://router.project-osrm.org/route/v1/driving",
]

# Faktor koreksi jarak lurus -> jarak jalan raya saat fallback
ROAD_DISTANCE_FACTOR: float = 1.32

# Kecepatan rata-rata (km/h) untuk estimasi durasi fallback
CAR_SPEED_KMH: float = 28.0
MOTOR_SPEED_KMH: float = 38.0

# Durasi minimum (menit) untuk rute fallback
MIN_CAR_MINUTES: int = 12
MIN_MOTOR_MINUTES: int = 9


# ---------------------------------------------------------------------------
# Helper: Fallback Curve Generator
# ---------------------------------------------------------------------------


def _generate_fallback_curve(origin: dict, dest: dict) -> list[dict]:
    """
    Menghasilkan kurva Bezier kuadratik realistis antar dua titik.

    Digunakan sebagai fallback polyline jika seluruh endpoint OSRM tidak bisa
    dijangkau. Kurva dihasilkan dengan offset lateral untuk tampilan yang
    lebih natural di peta.

    Args:
        origin (dict): Koordinat awal dengan key 'lat' dan 'lng'.
        dest (dict):   Koordinat tujuan dengan key 'lat' dan 'lng'.

    Returns:
        list[dict]: Daftar titik koordinat {'lat': float, 'lng': float}
                    yang membentuk kurva dari origin ke dest (inklusif).
    """
    points: list[dict] = [{"lat": origin["lat"], "lng": origin["lng"]}]
    steps = 16  # Jumlah segmen kurva

    mid_lat = (origin["lat"] + dest["lat"]) / 2
    mid_lng = (origin["lng"] + dest["lng"]) / 2

    # Offset lateral untuk membuat kurva (bukan garis lurus)
    offset_lat = (dest["lng"] - origin["lng"]) * 0.08
    offset_lng = (origin["lat"] - dest["lat"]) * 0.08

    for i in range(1, steps):
        t = i / steps
        # Formula Bezier kuadratik: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
        lat = (
            (1 - t) ** 2 * origin["lat"]
            + 2 * (1 - t) * t * (mid_lat + offset_lat)
            + t**2 * dest["lat"]
        )
        lng = (
            (1 - t) ** 2 * origin["lng"]
            + 2 * (1 - t) * t * (mid_lng + offset_lng)
            + t**2 * dest["lng"]
        )
        points.append({"lat": lat, "lng": lng})

    points.append({"lat": dest["lat"], "lng": dest["lng"]})
    return points


# ---------------------------------------------------------------------------
# Helper: OSRM Route Fetcher
# ---------------------------------------------------------------------------


async def fetch_osrm_route(points: list[dict]) -> dict[str, Any]:
    """
    Fetch rute nyata dari OSRM API dengan failover otomatis ke beberapa endpoint.

    Urutan percobaan:
      1. routing.openstreetmap.de (mirror resmi)
      2. router.project-osrm.org  (OSRM demo server HTTPS)
      3. router.project-osrm.org  (OSRM demo server HTTP)
      4. Fallback: estimasi berbasis kurva Bezier + rumus kecepatan

    Args:
        points (list[dict]): Daftar titik koordinat rute
                             [{'lat': float, 'lng': float}, ...].
                             Minimal 2 titik (origin + 1 destinasi).

    Returns:
        dict[str, Any]: Dictionary dengan key:
            - roadDistanceKm (float): Jarak jalan raya total (km)
            - carDurationMinutes (int): Durasi perjalanan mobil (menit)
            - motorDurationMinutes (int): Durasi perjalanan motor (menit)
            - polylineCoords (list[dict]): Titik-titik polyline
            - summaryNote (str): Ringkasan rute
    """
    # Hitung total jarak lurus sebagai baseline
    total_straight_km = sum(
        haversine_km(points[i], points[i + 1])
        for i in range(len(points) - 1)
    )

    if len(points) < 2:
        return {
            "straightDistanceKm": 0.0,
            "roadDistanceKm": 0.0,
            "carDurationMinutes": 0,
            "motorDurationMinutes": 0,
            "fastestMode": "MOTOR",
            "polylineCoords": points,
            "summaryNote": "Rute titik tunggal",
        }

    # Bangun string koordinat untuk OSRM: "lng,lat;lng,lat;..."
    coords_string = ";".join(
        f"{p['lng']:.6f},{p['lat']:.6f}" for p in points
    )
    query_params = "?overview=full&geometries=geojson"
    stop_count = len(points) - 1
    stop_label = f"{stop_count} pemberhentian" if stop_count > 1 else "1 destinasi"

    # Coba setiap endpoint OSRM
    async with httpx.AsyncClient(
        timeout=OSRM_TIMEOUT_SECONDS,
        headers={"User-Agent": "LokayanaAI/1.0"},
    ) as client:
        for base_url in OSRM_ENDPOINTS:
            url = f"{base_url}/{coords_string}{query_params}"
            try:
                response = await client.get(url)
                if not response.is_success:
                    continue

                data = response.json()
                if not data.get("routes"):
                    continue

                osrm_route = data["routes"][0]
                road_distance_km = round(osrm_route["distance"] / 1000, 1)
                base_duration_min = round(osrm_route["duration"] / 60)

                # Durasi mobil: max(OSRM * 1.1, jarak/28 * 60) — faktor kemacetan Bali
                car_duration = max(
                    round(base_duration_min * 1.1),
                    round((road_distance_km / CAR_SPEED_KMH) * 60),
                )
                # Durasi motor: max(OSRM * 0.8, jarak/40 * 60) — motor lebih lincah
                motor_duration = max(
                    round(base_duration_min * 0.8),
                    round((road_distance_km / MOTOR_SPEED_KMH) * 60),
                )

                # Ekstrak polyline dari GeoJSON
                polyline_coords = [
                    {"lat": lat, "lng": lng}
                    for lng, lat in osrm_route["geometry"]["coordinates"]
                ]

                time_diff = car_duration - motor_duration
                if time_diff > 5:
                    summary_note = (
                        f"🛵 Motor rute tercepat untuk {stop_label} "
                        f"(hemat ~{time_diff} mnt vs mobil)"
                    )
                else:
                    summary_note = f"Jalur optimal ditemukan untuk {stop_label}."

                return {
                    "straightDistanceKm": round(total_straight_km, 1),
                    "roadDistanceKm": road_distance_km,
                    "carDurationMinutes": car_duration,
                    "motorDurationMinutes": motor_duration,
                    "fastestMode": "MOTOR",
                    "polylineCoords": polyline_coords,
                    "summaryNote": summary_note,
                }

            except (httpx.TimeoutException, httpx.RequestError, KeyError, ValueError):
                # Coba mirror berikutnya jika ada error jaringan atau parsing
                continue

    # ------------------------------------------------------------------
    # Fallback: semua OSRM endpoint tidak tersedia
    # Gunakan kurva Bezier + estimasi berbasis kecepatan rata-rata
    # ------------------------------------------------------------------
    fallback_polyline: list[dict] = []
    for i in range(len(points) - 1):
        curve = _generate_fallback_curve(points[i], points[i + 1])
        if i > 0:
            curve = curve[1:]  # Hindari duplikasi titik sambungan
        fallback_polyline.extend(curve)

    road_distance_km = round(total_straight_km * ROAD_DISTANCE_FACTOR, 1)
    car_duration = max(MIN_CAR_MINUTES, round((road_distance_km / CAR_SPEED_KMH) * 60))
    motor_duration = max(MIN_MOTOR_MINUTES, round((road_distance_km / MOTOR_SPEED_KMH) * 60))
    time_diff = car_duration - motor_duration

    return {
        "straightDistanceKm": round(total_straight_km, 1),
        "roadDistanceKm": road_distance_km,
        "carDurationMinutes": car_duration,
        "motorDurationMinutes": motor_duration,
        "fastestMode": "MOTOR",
        "polylineCoords": fallback_polyline,
        "summaryNote": f"🛵 Motor rute tercepat (hemat ~{time_diff} mnt di jalanan Bali)",
    }


# ---------------------------------------------------------------------------
# Endpoint: POST /api/route
# ---------------------------------------------------------------------------


@router.post("/route", response_model=RouteResponse, summary="Rekomendasi Rute & Destinasi")
async def post_route(request: RouteRequest) -> RouteResponse:
    """
    Endpoint utama rekomendasi rute Lokayana AI.

    Proses:
      1. Bangun objek origin dari request
      2. Konversi DestinationIn -> dict untuk core engine
      3. Panggil get_recommendations() dari core/recommender.py
      4. Fetch rute jalan raya dari OSRM (atau fallback curve)
      5. Gabungkan hasil dan kembalikan sebagai RouteResponse

    Args:
        request (RouteRequest): Data request dari client.

    Returns:
        RouteResponse: Respons lengkap berisi rute optimal, area radius,
                       dan daftar destinasi alternatif yang direkomendasikan.

    Raises:
        HTTPException 400: Jika daftar destinations kosong.
        HTTPException 500: Jika terjadi error internal yang tidak terduga.
    """
    # Bangun origin dict
    origin: dict[str, Any] = {
        "lat": request.origin_lat,
        "lng": request.origin_lng,
        "name": request.origin_name,
    }

    # Konversi Pydantic models ke dict (kompatibel dengan core engine)
    destinations_dicts = [d.model_dump() for d in request.destinations]
    all_destinations_dicts = [d.model_dump() for d in request.all_destinations]

    # Validasi tambahan
    if not destinations_dicts:
        raise HTTPException(status_code=400, detail="Daftar destinations tidak boleh kosong.")

    try:
        # Panggil core engine rekomendasi
        result = get_recommendations(
            origin=origin,
            destinations=destinations_dicts,
            all_destinations=all_destinations_dicts,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error internal engine rekomendasi: {exc}",
        ) from exc

    # Fetch rute dari OSRM
    route_points = [origin] + list(result["orderedDestinations"])
    try:
        osrm_result = await fetch_osrm_route(route_points)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error saat mengambil rute OSRM: {exc}",
        ) from exc

    # ------------------------------------------------------------------
    # Bangun RouteInfo dari hasil OSRM
    # ------------------------------------------------------------------
    route_info = RouteInfo(
        straightDistanceKm=float(result["straightDistanceKm"]),
        roadDistanceKm=float(osrm_result["roadDistanceKm"]),
        carDurationMinutes=int(osrm_result["carDurationMinutes"]),
        motorDurationMinutes=int(osrm_result["motorDurationMinutes"]),
        fastestMode=str(osrm_result.get("fastestMode", "MOTOR")),
        polylineCoords=[
            Coordinate(lat=p["lat"], lng=p["lng"])
            for p in osrm_result["polylineCoords"]
        ],
        summaryNote=str(osrm_result["summaryNote"]),
    )

    # ------------------------------------------------------------------
    # Bangun SearchArea list
    # ------------------------------------------------------------------
    search_areas = [
        SearchArea(
            label=sa["label"],
            latitude=sa["latitude"],
            longitude=sa["longitude"],
            radiusKm=sa["radiusKm"],
            title=sa["title"],
            description=sa["description"],
        )
        for sa in result["searchAreas"]
    ]

    # ------------------------------------------------------------------
    # Bangun AlternativeDestination list
    # ------------------------------------------------------------------
    alternatives: list[AlternativeDestination] = []
    for alt in result["alternatives"]:
        ratings_raw = alt.get("ratings")
        rating_detail: RatingDetail | None = None
        if isinstance(ratings_raw, dict):
            rating_detail = RatingDetail(
                beauty=ratings_raw.get("beauty"),
                access=ratings_raw.get("access"),
                facilities=ratings_raw.get("facilities"),
            )

        alternatives.append(
            AlternativeDestination(
                id=str(alt.get("id", "")),
                name=str(alt.get("name", "")),
                category=str(alt.get("category", "")),
                broadCategory=str(alt.get("broadCategory", "")),
                district=str(alt.get("district", "")),
                city=str(alt.get("city", "")),
                rating=float(alt.get("rating", 0.0)),
                reviewCount=int(alt.get("reviewCount", 0)),
                lat=float(alt.get("lat", 0.0)),
                lng=float(alt.get("lng", 0.0)),
                mapLink=str(alt.get("mapLink", "")),
                imageUrl=alt.get("imageUrl"),
                similarityScore=int(alt.get("similarityScore", 62)),
                similarityReason=str(alt.get("similarityReason", "")),
                distanceFromHubKm=float(alt.get("distanceFromHubKm", 0.0)),
                nearestCenter=str(alt.get("nearestCenter", "DESTINATION")),
                estimatedTravelMinutes=int(alt.get("estimatedTravelMinutes", 5)),
                ratings=rating_detail,
                rewardPoints=int(alt.get("rewardPoints", 20)),
                firstReviewBonusPoints=int(alt.get("firstReviewBonusPoints", 10)),
                best_timing=alt.get("best_timing"),
            )
        )

    # ------------------------------------------------------------------
    # Bangun dan kembalikan RouteResponse
    # ------------------------------------------------------------------
    dest_raw = result["destination"]
    origin_raw = result["origin"]

    return RouteResponse(
        origin=OriginInfo(
            lat=origin_raw["lat"],
            lng=origin_raw["lng"],
            name=origin_raw["name"],
        ),
        destination=DestinationInfo(
            lat=dest_raw["lat"],
            lng=dest_raw["lng"],
            name=dest_raw["name"],
            destinationObj=dest_raw.get("destinationObj"),
        ),
        orderedDestinations=list(result["orderedDestinations"]),
        stops=list(result["stops"]),
        straightDistanceKm=float(result["straightDistanceKm"]),
        isDualRadius=bool(result["isDualRadius"]),
        searchAreas=search_areas,
        route=route_info,
        alternatives=alternatives,
    )


# ---------------------------------------------------------------------------
# Endpoint: GET /api/health
# ---------------------------------------------------------------------------


@router.get("/health", summary="Health Check")
async def health_check() -> dict[str, str]:
    """
    Health check endpoint untuk monitoring service Lokayana AI Backend.

    Returns:
        dict[str, str]: Status service, nama service, dan algoritma yang digunakan.
    """
    return {
        "status": "ok",
        "service": "Lokayana AI Backend",
        "algorithm": "Time-Aware A* TSP (Best Timing + Distance)",
    }
