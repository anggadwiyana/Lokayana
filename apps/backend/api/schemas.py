"""
api/schemas.py — Pydantic v2 Models untuk Lokayana AI Backend
=============================================================
Mendefinisikan semua schema request/response yang digunakan oleh
FastAPI route handlers.

Semua model menggunakan Pydantic v2 dengan field validation dan type hints
yang eksplisit.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Shared / Nested Models
# ---------------------------------------------------------------------------


class Coordinate(BaseModel):
    """Representasi koordinat geografis (lintang dan bujur)."""

    lat: float = Field(..., description="Lintang (latitude) dalam derajat desimal.")
    lng: float = Field(..., description="Bujur (longitude) dalam derajat desimal.")


class BestTiming(BaseModel):
    """Informasi waktu terbaik kunjungan destinasi wisata (Best Timing)."""

    best_time: str = Field(..., description="Slot waktu terbaik: 'Subuh', 'Pagi', 'Siang', 'Sore', 'Malam'.")
    window: str = Field(..., description="Rentang jam optimal (mis. '16:00 – 18:30').")
    icon: str = Field(..., description="Emoji representasi waktu (mis. '🌅').")
    reason: str = Field(..., description="Alasan mengapa waktu ini terbaik.")
    avoid: str = Field(..., description="Waktu yang sebaiknya dihindari.")
    time_order: float = Field(..., description="Nilai jam kronologis untuk pengurutan A* TSP.")


class DestinationIn(BaseModel):
    """
    Schema destinasi wisata yang dikirim oleh client (mobile app).

    Mencerminkan struktur `Destination` dari TypeScript types/index.ts.
    """

    id: str = Field(..., description="ID unik destinasi.")
    name: str = Field(..., description="Nama destinasi wisata.")
    category: str = Field(..., description="Kategori spesifik destinasi (mis. 'Pantai', 'Pura').")
    broadCategory: str = Field(..., description="Kategori luas/broad (mis. 'Alam', 'Budaya').")
    district: str = Field(..., description="Nama kecamatan/desa destinasi.")
    city: str = Field(..., description="Nama kabupaten/kota destinasi.")
    rating: float = Field(..., ge=0.0, le=5.0, description="Rating destinasi (0.0 – 5.0).")
    reviewCount: int = Field(..., ge=0, description="Jumlah ulasan destinasi.")
    lat: float = Field(..., description="Lintang destinasi.")
    lng: float = Field(..., description="Bujur destinasi.")
    mapLink: str = Field(..., description="URL Google Maps destinasi.")
    imageUrl: str | None = Field(None, description="URL gambar destinasi (opsional).")
    best_timing: BestTiming | None = Field(None, description="Informasi waktu terbaik kunjungan (opsional).")


# ---------------------------------------------------------------------------
# Request Schema
# ---------------------------------------------------------------------------


class RouteRequest(BaseModel):
    """
    Schema request untuk endpoint POST /api/route.

    Berisi titik awal (origin), destinasi yang dipilih user,
    dan seluruh database destinasi untuk pencarian alternatif.
    """

    origin_lat: float = Field(..., description="Lintang titik awal.")
    origin_lng: float = Field(..., description="Bujur titik awal.")
    origin_name: str = Field(..., description="Nama lokasi titik awal (mis. 'Hotel Kuta').")
    destinations: list[DestinationIn] = Field(
        ...,
        min_length=1,
        description="Daftar destinasi yang dipilih user (minimal 1).",
    )
    all_destinations: list[DestinationIn] = Field(
        ...,
        description="Seluruh database destinasi untuk pencarian alternatif.",
    )


# ---------------------------------------------------------------------------
# Response Nested Schemas
# ---------------------------------------------------------------------------


class OriginInfo(BaseModel):
    """Info titik awal dalam respons rekomendasi."""

    lat: float
    lng: float
    name: str


class DestinationInfo(BaseModel):
    """Info destinasi utama dalam respons rekomendasi."""

    lat: float
    lng: float
    name: str
    destinationObj: dict[str, Any] | None = None


class SearchArea(BaseModel):
    """Area radius pencarian alternatif destinasi."""

    label: str = Field(..., description="Label area: 'ORIGIN', 'DESTINATION', atau 'MERGED'.")
    latitude: float
    longitude: float
    radiusKm: float = Field(..., description="Radius pencarian dalam km.")
    title: str = Field(..., description="Judul area pencarian.")
    description: str = Field(..., description="Deskripsi singkat area pencarian.")


class RatingDetail(BaseModel):
    """Detail rating sub-kriteria destinasi alternatif."""

    beauty: float | None = None
    access: float | None = None
    facilities: float | None = None


class AlternativeDestination(BaseModel):
    """
    Schema destinasi alternatif yang direkomendasikan.

    Extends DestinationIn dengan field-field hasil scoring AI.
    """

    id: str
    name: str
    category: str
    broadCategory: str
    district: str
    city: str
    rating: float
    reviewCount: int
    lat: float
    lng: float
    mapLink: str
    imageUrl: str | None = None
    # AI Scoring Fields
    similarityScore: int = Field(..., description="Skor kemiripan AI (62–99).")
    similarityReason: str = Field(..., description="Alasan utama kemiripan.")
    distanceFromHubKm: float = Field(..., description="Jarak dari hub terdekat dalam km.")
    nearestCenter: str = Field(..., description="Label hub terdekat.")
    estimatedTravelMinutes: int = Field(..., description="Estimasi waktu perjalanan ke kandidat (menit).")
    ratings: RatingDetail | None = None
    rewardPoints: int = Field(..., description="Reward poin gamifikasi Lokayana.")
    firstReviewBonusPoints: int = Field(..., description="Bonus poin untuk ulasan pertama.")
    best_timing: BestTiming | None = Field(None, description="Informasi waktu terbaik kunjungan (Best Timing).")


class RouteInfo(BaseModel):
    """Informasi rute jalan raya dari OSRM atau fallback curve."""

    straightDistanceKm: float = Field(..., description="Total jarak lurus Haversine (km).")
    roadDistanceKm: float = Field(..., description="Total jarak jalan raya dari OSRM (km).")
    carDurationMinutes: int = Field(..., description="Estimasi durasi perjalanan mobil (menit).")
    motorDurationMinutes: int = Field(..., description="Estimasi durasi perjalanan motor (menit).")
    fastestMode: str = Field("MOTOR", description="Mode tercepat: 'MOTOR' atau 'CAR'.")
    polylineCoords: list[Coordinate] = Field(..., description="Titik-titik polyline rute.")
    summaryNote: str = Field(..., description="Catatan ringkasan rute.")


# ---------------------------------------------------------------------------
# Response Schema
# ---------------------------------------------------------------------------


class RouteResponse(BaseModel):
    """
    Schema respons utama endpoint POST /api/route.

    Mencerminkan struktur `RecommendationResponse` dari TypeScript types/index.ts.
    """

    origin: OriginInfo = Field(..., description="Info titik awal perjalanan.")
    destination: DestinationInfo = Field(..., description="Info destinasi utama/akhir rute.")
    orderedDestinations: list[dict[str, Any]] = Field(
        ...,
        description="Daftar destinasi dalam urutan kunjungan optimal (A* TSP).",
    )
    stops: list[dict[str, Any]] = Field(
        ...,
        description="Alias orderedDestinations — seluruh pemberhentian rute.",
    )
    straightDistanceKm: float = Field(..., description="Total jarak lurus perjalanan (km).")
    isDualRadius: bool = Field(..., description="True jika menggunakan dual/multi radius.")
    searchAreas: list[SearchArea] = Field(..., description="Area-area radius pencarian alternatif.")
    route: RouteInfo = Field(..., description="Informasi rute jalan raya dari OSRM.")
    alternatives: list[AlternativeDestination] = Field(
        ...,
        description="Daftar destinasi alternatif yang direkomendasikan (maks 30).",
    )
