"""Seed data SINTETIS untuk pengujian collaborative filtering.

PERINGATAN:
Semua pengguna dan ulasan yang dibuat skrip ini adalah DATA SINTETIS.
Skrip ini tidak memakai ulasan nyata dan tidak boleh dipakai sebagai bukti
perilaku pengguna dunia nyata. Setiap baris ditandai ``is_synthetic = 1``.

Contoh:
    python apps/backend/scripts/seed_synthetic.py --reset
    python apps/backend/scripts/seed_synthetic.py --db C:\\temp\\uji.db --reset
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BACKEND = ROOT / "apps" / "backend"
sys.path.insert(0, str(BACKEND))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from core.cf import (  # noqa: E402
    connect,
    get_cf_scores,
    get_db_path,
    init_db,
    save_review,
    upsert_destination,
)

DATA_PATH = ROOT / "apps" / "mobile" / "src" / "data" / "baliDestinations.json"
SYNTHETIC_COMMENT = "Ulasan sintetis untuk pengujian item-based CF."

# Destinasi di sekitar skenario demo Tanah Lot/Kuta. Beberapa pengguna sintetis
# sengaja menilai destinasi yang sama agar item-based CF memiliki irisan item.
DEMO_COVERAGE_IDS = {
    "BL0104001",  # Puri Agung Jrokuta Denpasar
    "BL0104002",  # Puri Agung Denpasar
    "BL0104008",  # Uma Palak Lestari
    "BL0401008",  # Desa wisata Baturiti
    "BL0403012",  # Baturiti Bersemi Desa Wisata
    "BL0101045",  # Tanah Lot
    "BL0202050",  # Pantai Kuta
}


def _pick_core_destinations(destinations: list[dict]) -> dict[str, list[dict]]:
    """Memilih destinasi populer per kategori agar antar-pengguna tumpang tindih."""
    pools: dict[str, list[dict]] = defaultdict(list)
    for destination in sorted(
        destinations,
        key=lambda d: (-int(d.get("reviewCount", 0) or 0), str(d.get("name", ""))),
    ):
        category = str(destination.get("category", ""))
        if len(pools[category]) < 6:
            pools[category].append(destination)
    return pools


def _aspects(rng: random.Random, base: int) -> tuple[int, int, int]:
    return tuple(max(1, min(5, base + rng.choice([-1, 0, 0, 0, 1]))) for _ in range(3))  # type: ignore[return-value]


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed data SINTETIS untuk CF Lokayana.")
    parser.add_argument("--db", default=str(get_db_path()), help="Path SQLite tujuan.")
    parser.add_argument("--reset", action="store_true", help="Hapus basis data sebelum seed.")
    parser.add_argument("--users", type=int, default=10, help="Jumlah pengguna demo sintetis.")
    parser.add_argument("--reviews-per-user", type=int, default=8, help="Ulasan per pengguna.")
    args = parser.parse_args()

    db_path = Path(args.db).expanduser().resolve()
    os.environ["LOKAYANA_DB_PATH"] = str(db_path)
    if args.reset:
        for suffix in ("", "-wal", "-shm"):
            candidate = Path(str(db_path) + suffix)
            if candidate.exists():
                candidate.unlink()

    destinations = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    pools = _pick_core_destinations(destinations)
    all_categories = sorted(pools)
    if not all_categories:
        raise SystemExit("Tidak ada kategori destinasi yang dapat dipakai.")

    init_db()
    conn = connect()
    try:
        for destination in destinations:
            upsert_destination(conn, destination)
        conn.commit()
    finally:
        conn.close()

    rng = random.Random(2026)
    profiles = [
        ["Pantai", "Budaya & Museum", "Pura"],
        ["Pura", "Budaya & Museum", "Hutan & Alam"],
        ["Air Terjun", "Hutan & Alam", "Bukit & Tebing"],
        ["Pantai", "Rekreasi & Taman", "Patung & Monumen"],
        ["Danau & Sungai", "Pura", "Budaya & Museum"],
        ["Pantai", "Air Terjun", "Hutan & Alam"],
    ]

    users = ["admin", "guest"] + [f"demo_user_{index:02d}" for index in range(1, args.users + 1)]

    created_reviews = 0
    for index, user_id in enumerate(users):
        if user_id == "guest":
            continue
        preferred = profiles[index % len(profiles)]
        chosen: list[dict] = []
        for category in preferred:
            chosen.extend(rng.sample(pools[category], min(2, len(pools[category]))))
        extras = [d for d in destinations if d not in chosen]
        chosen.extend(rng.sample(extras, max(0, min(args.reviews_per_user - len(chosen), 3))))
        unique: dict[str, dict] = {str(d["id"]): d for d in chosen}
        for destination in list(unique.values())[: args.reviews_per_user]:
            preferred_category = str(destination.get("category", "")) in preferred
            base = rng.choice([4, 4, 5, 5] if preferred_category else [3, 4, 4, 5])
            beauty, access, facilities = _aspects(rng, base)
            save_review(
                user_id=user_id,
                destination_id=str(destination["id"]),
                beauty=beauty,
                access=access,
                facilities=facilities,
                comment=SYNTHETIC_COMMENT,
                destination=destination,
                is_synthetic=True,
            )
            created_reviews += 1

    # Pastikan admin punya profil yang cukup untuk mengaktifkan CF.
    admin_extra = [
        d for d in destinations
        if str(d.get("id")) in {"BL0101045", "BL0202050", "BL0202010", "BL0104001"}
    ]
    for destination in admin_extra:
        beauty, access, facilities = _aspects(rng, rng.choice([4, 4, 5]))
        save_review(
            user_id="admin",
            destination_id=str(destination["id"]),
            beauty=beauty,
            access=access,
            facilities=facilities,
            comment=SYNTHETIC_COMMENT,
            destination=destination,
            is_synthetic=True,
        )
        created_reviews += 1

    # Lapisan sintetis tambahan: enam pengguna menilai destinasi demo yang sama.
    # Tujuannya hanya membuat irisan item-based CF cukup untuk pengujian.
    coverage_users = [f"demo_user_{index:02d}" for index in range(1, 7)]
    demo_destinations = [d for d in destinations if str(d.get("id")) in DEMO_COVERAGE_IDS]
    for user_id in coverage_users:
        for destination in demo_destinations:
            base = rng.choice([4, 4, 4, 5])
            beauty, access, facilities = _aspects(rng, base)
            save_review(
                user_id=user_id,
                destination_id=str(destination["id"]),
                beauty=beauty,
                access=access,
                facilities=facilities,
                comment=SYNTHETIC_COMMENT,
                destination=destination,
                is_synthetic=True,
            )
            created_reviews += 1

    conn = connect()
    try:
        total_users = int(conn.execute("SELECT COUNT(*) FROM users").fetchone()[0])
        total_reviews = int(conn.execute("SELECT COUNT(*) FROM reviews").fetchone()[0])
    finally:
        conn.close()

    cf = get_cf_scores("admin")
    print("=" * 72)
    print("PERINGATAN: DATA SINTETIS — BUKAN ULASAN PENGGUNA NYATA")
    print("Semua pengguna/ulasan dari skrip ini memiliki is_synthetic = 1.")
    print("=" * 72)
    print(f"Basis data       : {db_path}")
    print(f"Destinasi        : {len(destinations)}")
    print(f"Pengguna di DB   : {total_users} (guest tidak dibuat karena tanpa ulasan)")
    print(f"Ulasan di DB     : {total_reviews} (percobaan tulis: {created_reviews})")
    print(f"CF admin         : used={cf.used}, ratings={cf.user_rating_count}, items={cf.total_items}")
    print(f"Alasan CF        : {cf.reason}")
    print("=" * 72)
    return 0


if __name__ == "__main__":
    sys.exit(main())
