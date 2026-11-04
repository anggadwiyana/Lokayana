"""
core/astar.py — Time-Aware A* Heuristic TSP Solver untuk Lokayana AI
===================================================================
Mengurutkan daftar destinasi wisata dari titik awal (origin) agar
total rute perjalanan efisien secara jarak (Haversine) DAN optimal
secara waktu kunjungan (Best Timing Aware: Subuh -> Pagi -> Siang -> Sore -> Malam).

Konsep Algoritma:
  f(n) = g(n) + h(n)

  - g(n): Biaya aktual terakumulasi sejauh ini
          = Jarak tempuh (km) + Penalti pembalikan waktu (time inversion penalty)
  - h(n): Heuristic admissible
          = Jarak lurus Haversine terpanjang ke salah satu destinasi yang belum dikunjungi

Mengapa Time-Aware TSP penting untuk Pariwisata Bali?
  Sebuah rute yang efisien jaraknya bisa jadi tidak berguna jika wisatawan tiba di:
    - Pantai Sanur pada sore hari (kehilangan momen sunrise terbaik)
    - Pura Tanah Lot pada pagi hari (kehilangan momen sunset siluet pura)
    - Air Terjun Tukad Cepung pada siang/sore (kehilangan fenomena cahaya sinar dewa)
  Oleh karena itu, fungsi objektif A* menyatukan minimasi jarak fisik dengan
  kelancaran kronologi daylight tour (Subuh -> Pagi -> Siang -> Sore -> Malam).

Kompleksitas: O(n^2 * 2^n) dengan branch & bound pruning — sangat cepat untuk n <= 10.
"""

from __future__ import annotations

import heapq
import math
from dataclasses import dataclass, field
from typing import Any

from core.best_timing import get_best_timing
from core.haversine import haversine_km

# Bobot penalti jika urutan destinasi melanggar kronologi waktu terbaik (km/jam)
TIME_INVERSION_WEIGHT: float = 16.0


# ---------------------------------------------------------------------------
# Data Class Node
# ---------------------------------------------------------------------------


@dataclass(order=True)
class AStarNode:
    """
    Node dalam priority queue A* TSP.

    Diurutkan berdasarkan f_cost (total estimasi biaya).
    Field lain diberi compare=False agar tidak ikut dalam perbandingan heap.
    """

    f_cost: float
    g_cost: float = field(compare=False)
    current_idx: int = field(compare=False)       # index destinasi saat ini
    path: list[int] = field(compare=False)         # urutan index yang sudah dikunjungi
    visited: frozenset[int] = field(compare=False) # set index yang sudah dikunjungi


# ---------------------------------------------------------------------------
# Heuristic Function (Admissible)
# ---------------------------------------------------------------------------


def _heuristic(current_pos: dict[str, Any], unvisited: list[dict[str, Any]]) -> float:
    """
    Heuristic admissible: jarak Haversine terpanjang dari posisi saat ini
    ke salah satu destinasi yang belum dikunjungi.

    Karena jarak Haversine (garis lurus) selalu <= jarak tempuh jalan raya nyata,
    nilai ini dijamin admissible (tidak pernah overestimate sisa biaya).

    Args:
        current_pos: Koordinat posisi saat ini {'lat': float, 'lng': float}.
        unvisited: Daftar koordinat destinasi yang belum dikunjungi.

    Returns:
        float: Estimasi sisa jarak minimum dalam km (0.0 jika unvisited kosong).
    """
    if not unvisited:
        return 0.0
    return max(haversine_km(current_pos, u) for u in unvisited)


# ---------------------------------------------------------------------------
# Time Inversion Penalty
# ---------------------------------------------------------------------------


def _calculate_timing_penalty(prev_dest: dict[str, Any] | None, next_dest: dict[str, Any]) -> float:
    """
    Menghitung penalti jika urutan kunjungan melanggar kronologi waktu terbaik.

    Contoh:
      - Subuh (06:00) -> Pagi (09:00): t_next >= t_prev -> penalty = 0.0
      - Pagi (09:00)  -> Sore (16:30): t_next >= t_prev -> penalty = 0.0
      - Sore (16:30)  -> Pagi (09:00): t_next < t_prev  -> PENALTI!
        (Wisatawan mengunjungi spot sunset dulu lalu berbalik ke spot pagi)

    Args:
        prev_dest: Destinasi sebelumnya (None jika baru berangkat dari origin).
        next_dest: Destinasi berikutnya yang akan dikunjungi.

    Returns:
        float: Nilai penalti yang ditambahkan ke g_cost (dalam satuan km ekuivalen).
    """
    next_timing = next_dest.get("best_timing") or get_best_timing(next_dest)
    t_next: float = float(next_timing.get("time_order", 9.0))

    if prev_dest is None:
        # Dari origin: jika memilih spot malam/sore di awal hari padahal ada spot pagi,
        # berikan sedikit penalti awal agar memulai dari waktu yang lebih pagi
        return max(0.0, (t_next - 10.0) * 4.0)

    prev_timing = prev_dest.get("best_timing") or get_best_timing(prev_dest)
    t_prev: float = float(prev_timing.get("time_order", 9.0))

    # Pelanggaran kronologi: t_next < t_prev
    if t_next < t_prev:
        time_diff = t_prev - t_next
        return time_diff * TIME_INVERSION_WEIGHT

    return 0.0


# ---------------------------------------------------------------------------
# A* TSP Solver Utama
# ---------------------------------------------------------------------------


def astar_tsp_order(
    origin: dict[str, Any],
    destinations: list[dict[str, Any]],
    consider_timing: bool = True,
) -> list[dict[str, Any]]:
    """
    Mengurutkan destinasi wisata menggunakan algoritma A* Heuristic TSP
    dengan optimasi ganda: jarak tempuh fisik + kesesuaian waktu terbaik (Best Timing).

    Algoritma:
        1. Inject informasi `best_timing` ke seluruh destinasi
        2. Masukkan semua kandidat langkah awal dari `origin` ke priority queue A*
        3. Tiap iterasi, ekspansi node dengan f(n) terkecil
        4. Transisi memperhitungkan jarak Haversine + penalti pelanggaran waktu
        5. Pruning otomatis bila f(n) >= biaya solusi terbaik yang ditemukan
        6. Berhenti saat semua destinasi terkunjungi dengan biaya optimal

    Args:
        origin: Titik awal dengan key 'lat' dan 'lng'.
        destinations: Daftar destinasi wisata yang dipilih user.
        consider_timing: True untuk mengaktifkan kronologi waktu terbaik (default True).

    Returns:
        list[dict[str, Any]]: Destinasi dalam urutan kunjungan optimal versi A*.
    """
    if not destinations:
        raise ValueError("Daftar destinasi tidak boleh kosong")

    # Pastikan setiap destinasi memiliki field 'best_timing'
    annotated_destinations: list[dict[str, Any]] = []
    for d in destinations:
        d_copy = dict(d)
        if "best_timing" not in d_copy or not d_copy["best_timing"]:
            d_copy["best_timing"] = get_best_timing(d_copy)
        annotated_destinations.append(d_copy)

    # Edge case: satu destinasi
    if len(annotated_destinations) == 1:
        return annotated_destinations

    n = len(annotated_destinations)
    all_indices: frozenset[int] = frozenset(range(n))

    # Inisialisasi heap: dari origin menuju setiap destinasi
    heap: list[AStarNode] = []
    for i, dest in enumerate(annotated_destinations):
        dist = haversine_km(origin, dest)
        penalty = _calculate_timing_penalty(None, dest) if consider_timing else 0.0
        g = dist + penalty

        remaining = [annotated_destinations[j] for j in range(n) if j != i]
        h = _heuristic(dest, remaining)

        node = AStarNode(
            f_cost=g + h,
            g_cost=g,
            current_idx=i,
            path=[i],
            visited=frozenset([i]),
        )
        heapq.heappush(heap, node)

    best_path: list[int] = []
    best_f: float = math.inf

    while heap:
        node = heapq.heappop(heap)

        # Pruning
        if node.f_cost >= best_f:
            continue

        # Goal state: seluruh destinasi sudah dikunjungi
        if node.visited == all_indices:
            if node.f_cost < best_f:
                best_f = node.f_cost
                best_path = node.path
            continue

        current_dest = annotated_destinations[node.current_idx]
        unvisited_indices = [i for i in range(n) if i not in node.visited]

        for next_idx in unvisited_indices:
            next_dest = annotated_destinations[next_idx]
            dist = haversine_km(current_dest, next_dest)
            penalty = _calculate_timing_penalty(current_dest, next_dest) if consider_timing else 0.0

            new_g = node.g_cost + dist + penalty
            new_visited = node.visited | frozenset([next_idx])

            remaining = [annotated_destinations[j] for j in range(n) if j not in new_visited]
            h = _heuristic(next_dest, remaining)

            new_node = AStarNode(
                f_cost=new_g + h,
                g_cost=new_g,
                current_idx=next_idx,
                path=node.path + [next_idx],
                visited=new_visited,
            )
            heapq.heappush(heap, new_node)

    if not best_path:
        # Fallback jika tidak ditemukan (sangat jarang)
        best_path = list(range(n))

    return [annotated_destinations[i] for i in best_path]
