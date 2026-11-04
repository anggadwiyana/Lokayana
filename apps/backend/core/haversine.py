"""
core/haversine.py — Kalkulasi Jarak Haversine
==============================================
Fungsi murni Python untuk menghitung jarak garis lurus antara dua titik
koordinat di permukaan bumi menggunakan formula Haversine.

Referensi:
    https://en.wikipedia.org/wiki/Haversine_formula
"""

import math


def haversine_km(c1: dict, c2: dict) -> float:
    """
    Menghitung jarak Haversine antara dua koordinat geografis dalam kilometer.

    Formula Haversine memberikan jarak lingkaran besar (great-circle distance)
    antara dua titik pada permukaan bola, berdasarkan lintang dan bujurnya.
    Hasilnya adalah jarak lurus (garis lurus di permukaan bumi), bukan jarak
    jalan raya.

    Args:
        c1 (dict): Koordinat pertama dengan key 'lat' (float) dan 'lng' (float).
                   Contoh: {'lat': -8.6521, 'lng': 115.2191}
        c2 (dict): Koordinat kedua dengan format yang sama seperti c1.

    Returns:
        float: Jarak dalam kilometer (km) antara c1 dan c2. Selalu >= 0.

    Examples:
        >>> c_kuta   = {'lat': -8.7215, 'lng': 115.1685}
        >>> c_ubud   = {'lat': -8.5069, 'lng': 115.2625}
        >>> round(haversine_km(c_kuta, c_ubud), 1)
        25.5
    """
    R = 6_371.0  # Radius rata-rata bumi dalam km (WGS-84)

    lat1 = math.radians(c1["lat"])
    lat2 = math.radians(c2["lat"])
    d_lat = math.radians(c2["lat"] - c1["lat"])
    d_lng = math.radians(c2["lng"] - c1["lng"])

    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(d_lng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c
