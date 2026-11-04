"""
core/recommender.py — Engine Rekomendasi Lokayana AI
=====================================================
Port dari TypeScript `recommenderService.ts` ke Python.

Mengimplementasikan:
  - Perhitungan skor kemiripan (similarity score) berbasis multi-kriteria
  - Logika radius pencarian (single / dual / multi-stop)
  - Gamifikasi reward points
  - Engine rekomendasi utama yang mengorkestrasi A* TSP dan radius search

Semua fungsi bersifat pure (tidak ada side effect I/O) kecuali
`get_recommendations` yang menerima data dari caller.
"""

from __future__ import annotations

from typing import Any

from core.astar import astar_tsp_order
from core.best_timing import get_best_timing
from core.haversine import haversine_km

# ---------------------------------------------------------------------------
# Konstanta
# ---------------------------------------------------------------------------

RADIUS_KM: float = 15.0  # Radius pencarian alternatif dalam km

# Daftar keyword semantik yang dikenali oleh sistem rekomendasi.
# Digunakan untuk mengidentifikasi kesamaan tema/daya-tarik antar destinasi.
KEYWORD_LIST: list[str] = [
    # Pantai & Air
    "pantai", "beach", "sunset", "sunrise", "pasir", "surf", "ombak", "karang",
    # Pura & Spiritualitas
    "pura", "temple", "candi", "tirta", "suci", "sakral", "sembahyang",
    # Alam & Air Terjun
    "air terjun", "waterfall", "curug", "sejuk", "hutan", "forest", "monkey",
    # Monumen & Patung
    "patung", "monumen", "gwk", "wisnu", "titi banda", "arca",
    # Bukit & Pemandangan
    "bukit", "hill", "tebing", "cliff", "lembah", "pemandangan",
    # Danau & Sungai
    "danau", "lake", "beratan", "batur", "buyan", "sungai", "rafting",
    # Taman & Rekreasi
    "taman", "park", "waterbom", "rekreasi", "kebun", "flower",
    # Seni & Budaya
    "museum", "galeri", "art", "seni", "budaya", "desa adat", "puri",
]


# ---------------------------------------------------------------------------
# Helper: Ekstraksi Keyword
# ---------------------------------------------------------------------------


def _extract_keywords(text: str) -> list[str]:
    """
    Mengekstrak keyword yang relevan dari teks destinasi.

    Args:
        text (str): Teks gabungan (nama + kategori) destinasi.

    Returns:
        list[str]: Daftar keyword dari KEYWORD_LIST yang ditemukan dalam teks.
    """
    lower = text.lower()
    return [k for k in KEYWORD_LIST if k in lower]


# ---------------------------------------------------------------------------
# Helper: Kalkulasi Reward Points (Gamifikasi)
# ---------------------------------------------------------------------------


def _calculate_points(review_count: int) -> tuple[int, int]:
    """
    Menghitung reward poin gamifikasi Lokayana berdasarkan jumlah ulasan.

    Destinasi dengan ulasan lebih sedikit mendapat reward lebih tinggi
    untuk mendorong eksplorasi "hidden gem".

    Args:
        review_count (int): Jumlah ulasan destinasi.

    Returns:
        tuple[int, int]: (reward_points, first_review_bonus_points)
    """
    if review_count < 10:
        return 80, 50
    elif review_count < 50:
        return 50, 25
    elif review_count < 200:
        return 30, 15
    return 20, 10


# ---------------------------------------------------------------------------
# Fungsi Utama: Skor Kemiripan
# ---------------------------------------------------------------------------


def calculate_similarity_score(
    target: dict,
    candidate: dict,
    distance_from_hub_km: float,
) -> tuple[int, str]:
    """
    Menghitung skor kemiripan AI (62–99%) antara destinasi target dan kandidat.

    Skoring multi-kriteria:
      1. Kesamaan kategori       — maks 45 poin
      2. Analisis semantik keyword — maks 25 poin
      3. Kesamaan wilayah/kabupaten — maks 15 poin
      4. Rating & kualitas       — maks 10 poin
      5. Bonus kedekatan ≤ 15 km — maks 5 poin

    Skor akhir dinormalisasi ke rentang [62, 99].

    Args:
        target (dict): Destinasi referensi (stop terdekat).
                       Harus memiliki key: category, broadCategory, city, district,
                       rating, name.
        candidate (dict): Destinasi kandidat alternatif.
                          Harus memiliki key yang sama seperti target.
        distance_from_hub_km (float): Jarak kandidat dari hub terdekat dalam km.

    Returns:
        tuple[int, str]:
            - int: Skor kemiripan (62–99)
            - str: Alasan utama kemiripan dalam Bahasa Indonesia
    """
    score: int = 0
    reasons: list[str] = []

    # ------------------------------------------------------------------
    # 1. Kesamaan Kategori (Bobot Maks: 45 poin)
    # ------------------------------------------------------------------
    if candidate.get("category") == target.get("category"):
        score += 45
        reasons.append(f"Sama-sama kategori {candidate.get('category', '')}")
    elif candidate.get("broadCategory") == target.get("broadCategory"):
        score += 28
        reasons.append(f"Vibe wisata {candidate.get('broadCategory', '')} sejenis")
    else:
        score += 12  # Skor dasar untuk kategori berbeda

    # ------------------------------------------------------------------
    # 2. Analisis Semantik Kata Kunci (Bobot Maks: 25 poin)
    # ------------------------------------------------------------------
    target_text = f"{target.get('name', '')} {target.get('category', '')}"
    candidate_text = f"{candidate.get('name', '')} {candidate.get('category', '')}"

    target_keywords = _extract_keywords(target_text)
    candidate_keywords = _extract_keywords(candidate_text)
    shared_keywords = [k for k in candidate_keywords if k in target_keywords]

    if shared_keywords:
        kw_bonus = min(25, len(shared_keywords) * 12)
        score += kw_bonus
        preview = ", ".join(shared_keywords[:2])
        reasons.append(f"Daya tarik sejenis ({preview})")

    # ------------------------------------------------------------------
    # 3. Kesamaan Wilayah / Kabupaten (Bobot Maks: 15 poin)
    # ------------------------------------------------------------------
    if candidate.get("city") and target.get("city") and candidate["city"] == target["city"]:
        score += 10  # Kota/kabupaten sama (10 poin)
        if candidate.get("district") == target.get("district"):
            score += 5  # Kecamatan sama (tambahan 5 poin)
            reasons.append(f"Di kawasan yang sama ({candidate.get('district', '')})")

    # ------------------------------------------------------------------
    # 4. Rating & Kualitas (Bobot Maks: 10 poin)
    # ------------------------------------------------------------------
    rating: float = float(candidate.get("rating", 0.0))
    if rating >= 4.7:
        score += 10
    elif rating >= 4.4:
        score += 7
    elif rating >= 4.0:
        score += 4
    # rating < 4.0 tidak mendapat poin tambahan

    # ------------------------------------------------------------------
    # 5. Bonus Kedekatan dalam Radius 15 km (Bobot Maks: 5 poin)
    # ------------------------------------------------------------------
    # Formula: max(0, round((15 - jarak) / 3))
    proximity_bonus = max(0, round((RADIUS_KM - distance_from_hub_km) / 3))
    score += proximity_bonus

    # ------------------------------------------------------------------
    # Normalisasi skor ke rentang [62, 99]
    # ------------------------------------------------------------------
    final_score = min(99, max(62, round(score)))
    main_reason = reasons[0] if reasons else "Alternatif populer di radius 15 km"

    return final_score, main_reason


# ---------------------------------------------------------------------------
# Fungsi Utama: Engine Rekomendasi
# ---------------------------------------------------------------------------


def get_recommendations(
    origin: dict[str, Any],
    destinations: list[dict[str, Any]],
    all_destinations: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Engine rekomendasi utama Lokayana AI.

    Mengorkestrasi:
      1. Pengurutan destinasi menggunakan A* TSP
      2. Evaluasi aturan radius (single / dual / multi-stop)
      3. Filter kandidat alternatif dalam radius 15 km
      4. Perhitungan similarity score per kandidat
      5. Pengembalian respons lengkap sesuai schema RecommendationResponse

    Args:
        origin (dict[str, Any]): Titik awal. Harus memiliki key:
                                  'lat' (float), 'lng' (float), 'name' (str).
        destinations (list[dict[str, Any]]): Destinasi yang dipilih user.
                                              Masing-masing dengan key:
                                              'lat', 'lng', 'id', 'name', dll.
        all_destinations (list[dict[str, Any]]): Seluruh database destinasi
                                                  (untuk mencari kandidat alternatif).

    Returns:
        dict[str, Any]: Dictionary sesuai schema RecommendationResponse:
            - origin: dict dengan lat, lng, name
            - destination: dict dengan lat, lng, name, destinationObj
            - orderedDestinations: list destinasi urutan A*
            - stops: alias orderedDestinations
            - straightDistanceKm: float
            - isDualRadius: bool
            - searchAreas: list[dict] area radius pencarian
            - route: dict placeholder (diisi oleh route handler dengan OSRM)
            - alternatives: list[dict] kandidat alternatif terurut

    Raises:
        ValueError: Jika `destinations` kosong.
    """
    if not destinations:
        raise ValueError("Daftar destinasi tidak boleh kosong")

    # ------------------------------------------------------------------
    # 1. Urutkan destinasi menggunakan Time-Aware A* TSP
    # ------------------------------------------------------------------
    ordered_destinations = astar_tsp_order(origin, destinations, consider_timing=True)

    # Destinasi utama: stop terakhir dalam rute A*
    primary_destination = ordered_destinations[-1] if ordered_destinations else destinations[0]

    is_multi_stop = len(ordered_destinations) > 1

    # ------------------------------------------------------------------
    # 2. Hitung total jarak lurus (Haversine) antar semua stops
    # ------------------------------------------------------------------
    if is_multi_stop:
        straight_distance_km = sum(
            haversine_km(
                origin if idx == 0 else ordered_destinations[idx - 1],
                cur,
            )
            for idx, cur in enumerate(ordered_destinations)
        )
    else:
        straight_distance_km = haversine_km(origin, primary_destination)

    is_dual_radius = is_multi_stop or straight_distance_km > RADIUS_KM

    # ------------------------------------------------------------------
    # 3. Bangun search areas sesuai aturan radius
    # ------------------------------------------------------------------
    search_areas: list[dict[str, Any]] = []

    if is_multi_stop:
        # Radius awal (Origin)
        search_areas.append({
            "label": "ORIGIN",
            "latitude": origin["lat"],
            "longitude": origin["lng"],
            "radiusKm": RADIUS_KM,
            "title": "Radius Titik Awal (15 km)",
            "description": f"Zona keberangkatan sekitar {origin.get('name', 'Titik Awal')}",
        })
        # Radius setiap pemberhentian
        for i, dest in enumerate(ordered_destinations):
            search_areas.append({
                "label": "DESTINATION",
                "latitude": dest["lat"],
                "longitude": dest["lng"],
                "radiusKm": RADIUS_KM,
                "title": f"Stop {i + 1}: {dest.get('name', f'Destinasi {i+1}')} (15 km)",
                "description": f"Zona destinasi {dest.get('name', '')}",
            })

    elif is_dual_radius:
        # Dual radius: destinasi + origin
        search_areas.append({
            "label": "DESTINATION",
            "latitude": primary_destination["lat"],
            "longitude": primary_destination["lng"],
            "radiusKm": RADIUS_KM,
            "title": "Radius Destinasi (15 km)",
            "description": f"Mencari alternatif serupa di sekitar {primary_destination.get('name', '')}",
        })
        search_areas.append({
            "label": "ORIGIN",
            "latitude": origin["lat"],
            "longitude": origin["lng"],
            "radiusKm": RADIUS_KM,
            "title": "Radius Titik Awal (15 km)",
            "description": f"Mencari alternatif serupa di sekitar {origin.get('name', '')}",
        })

    else:
        # Single radius (jarak ≤ 15 km)
        search_areas.append({
            "label": "MERGED",
            "latitude": primary_destination["lat"],
            "longitude": primary_destination["lng"],
            "radiusKm": RADIUS_KM,
            "title": "Radius Tunggal (15 km)",
            "description": (
                f"Jarak perjalanan {straight_distance_km:.1f} km (≤ 15 km), "
                "pencarian alternatif difokuskan dalam 1 radius 15 km"
            ),
        })

    # ------------------------------------------------------------------
    # 4. Kumpulkan ID destinasi yang sudah dipilih user (exclude dari rekomendasi)
    # ------------------------------------------------------------------
    selected_ids: set[str] = {str(d.get("id", "")) for d in destinations}

    # ------------------------------------------------------------------
    # 5. Filter dan skor kandidat alternatif
    # ------------------------------------------------------------------
    candidates: list[dict[str, Any]] = []

    for candidate in all_destinations:
        if str(candidate.get("id", "")) in selected_ids:
            continue  # Skip destinasi yang sudah dipilih user

        dist_to_origin = haversine_km(origin, candidate)

        # Cari stop terdekat ke kandidat
        nearest_stop = primary_destination
        min_dist_to_stop = float("inf")
        for stop in ordered_destinations:
            d = haversine_km(stop, candidate)
            if d < min_dist_to_stop:
                min_dist_to_stop = d
                nearest_stop = stop

        # Tentukan eligibilitas dan nearest center berdasarkan mode radius
        eligible = False
        nearest_center = "DESTINATION"
        distance_from_hub_km = min_dist_to_stop

        if is_multi_stop:
            if min_dist_to_stop <= RADIUS_KM or dist_to_origin <= RADIUS_KM:
                eligible = True
                if min_dist_to_stop <= dist_to_origin:
                    nearest_center = "DESTINATION"
                    distance_from_hub_km = min_dist_to_stop
                else:
                    nearest_center = "ORIGIN"
                    distance_from_hub_km = dist_to_origin

        elif is_dual_radius:
            in_dest_radius = min_dist_to_stop <= RADIUS_KM
            in_origin_radius = dist_to_origin <= RADIUS_KM

            if in_dest_radius and in_origin_radius:
                eligible = True
                if min_dist_to_stop <= dist_to_origin:
                    nearest_center = "DESTINATION"
                    distance_from_hub_km = min_dist_to_stop
                else:
                    nearest_center = "ORIGIN"
                    distance_from_hub_km = dist_to_origin
            elif in_dest_radius:
                eligible = True
                nearest_center = "DESTINATION"
                distance_from_hub_km = min_dist_to_stop
            elif in_origin_radius:
                eligible = True
                nearest_center = "ORIGIN"
                distance_from_hub_km = dist_to_origin

        else:
            # Single radius mode
            if min_dist_to_stop <= RADIUS_KM:
                eligible = True
                nearest_center = "MERGED"
                distance_from_hub_km = min_dist_to_stop

        if not eligible:
            continue

        # Hitung similarity score
        score, reason = calculate_similarity_score(nearest_stop, candidate, distance_from_hub_km)
        reward, bonus = _calculate_points(int(candidate.get("reviewCount", 0)))

        # Estimasi waktu perjalanan ke kandidat: asumsi kecepatan rata-rata 35 km/h
        estimated_travel_minutes = max(5, round((distance_from_hub_km / 35) * 60))

        rating_val = float(candidate.get("rating", 0.0))

        candidates.append({
            **candidate,
            "similarityScore": score,
            "similarityReason": f"{reason} (dekat {nearest_stop.get('name', '')})",
            "distanceFromHubKm": round(distance_from_hub_km, 1),
            "nearestCenter": nearest_center,
            "estimatedTravelMinutes": estimated_travel_minutes,
            "ratings": {
                "beauty": rating_val if rating_val >= 4.5 else 4.2,
                "access": 4.0 if rating_val >= 4.0 else 3.5,
                "facilities": 4.1 if rating_val >= 4.2 else 3.8,
            },
            "rewardPoints": reward,
            "firstReviewBonusPoints": bonus,
            "best_timing": get_best_timing(candidate),
        })

    # ------------------------------------------------------------------
    # 6. Urutkan kandidat: similarity score tertinggi, lalu rating tertinggi
    # ------------------------------------------------------------------
    candidates.sort(
        key=lambda c: (-c["similarityScore"], -float(c.get("rating", 0.0)))
    )

    top_alternatives = candidates[:30]

    # ------------------------------------------------------------------
    # 7. Bangun dan kembalikan respons
    # ------------------------------------------------------------------
    destination_name = (
        f"{len(ordered_destinations)} Destinasi ({primary_destination.get('name', '')})"
        if is_multi_stop
        else primary_destination.get("name", "")
    )

    return {
        "origin": {
            "lat": origin["lat"],
            "lng": origin["lng"],
            "name": origin.get("name", ""),
        },
        "destination": {
            "lat": primary_destination["lat"],
            "lng": primary_destination["lng"],
            "name": destination_name,
            "destinationObj": primary_destination,
        },
        "orderedDestinations": ordered_destinations,
        "stops": ordered_destinations,
        "straightDistanceKm": round(straight_distance_km, 1),
        "isDualRadius": is_dual_radius,
        "searchAreas": search_areas,
        # 'route' akan diisi oleh route handler setelah fetch OSRM
        "route": None,
        "alternatives": top_alternatives,
    }
