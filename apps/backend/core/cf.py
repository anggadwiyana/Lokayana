"""core/cf.py — Penyimpanan SQLite dan item-based collaborative filtering.

Catatan penting:
- Basis data ini adalah SQLite lokal, bukan server basis data terpisah.
- Ulasan yang dibuat oleh skrip seed bersifat SINTETIS dan ditandai
  ``is_synthetic = 1`` pada tabel ``users`` dan ``reviews``.
- CF di sini adalah item-based collaborative filtering: cosine similarity
  dihitung pada matriks pengguna x destinasi yang dibentuk dari tabel
  ``reviews``. Jika data pengguna belum cukup, pemanggil harus memakai
  cold-start fallback berbasis ``rating`` dan ``reviewCount`` agregat.
"""

from __future__ import annotations

import math
import os
import sqlite3
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_DB_PATH = Path(__file__).resolve().parents[1] / "data" / "lokayana.db"
MIN_USER_RATINGS = 2
SHRINKAGE = 1.0


def get_db_path() -> Path:
    """Mengembalikan path SQLite dari env atau lokasi default."""
    raw = os.environ.get("LOKAYANA_DB_PATH")
    path = Path(raw).expanduser() if raw else DEFAULT_DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def connect() -> sqlite3.Connection:
    """Membuka koneksi SQLite dengan row factory dan foreign key aktif."""
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def init_db(conn: sqlite3.Connection | None = None) -> None:
    """Membuat tabel pengguna, destinasi, dan ulasan bila belum ada."""
    own_connection = conn is None
    if own_connection:
        conn = connect()
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                is_synthetic INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS destinations (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT '',
                broad_category TEXT NOT NULL DEFAULT '',
                district TEXT NOT NULL DEFAULT '',
                city TEXT NOT NULL DEFAULT '',
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                rating REAL NOT NULL DEFAULT 0,
                review_count INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                destination_id TEXT NOT NULL,
                beauty INTEGER NOT NULL CHECK (beauty BETWEEN 1 AND 5),
                access INTEGER NOT NULL CHECK (access BETWEEN 1 AND 5),
                facilities INTEGER NOT NULL CHECK (facilities BETWEEN 1 AND 5),
                overall_rating REAL NOT NULL,
                comment TEXT,
                is_synthetic INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE (user_id, destination_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_reviews_destination
                ON reviews(destination_id);
            CREATE INDEX IF NOT EXISTS idx_reviews_user
                ON reviews(user_id);
            """
        )
        conn.commit()
    finally:
        if own_connection:
            conn.close()


def upsert_user(
    conn: sqlite3.Connection,
    user_id: str,
    username: str | None = None,
    is_synthetic: bool = False,
) -> None:
    """Menyisipkan pengguna atau memperbarui nama pengguna."""
    user_id = str(user_id).strip()
    if not user_id:
        raise ValueError("user_id tidak boleh kosong")
    username = (username or user_id).strip()
    conn.execute(
        """
        INSERT INTO users (id, username, is_synthetic, created_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            username = excluded.username,
            is_synthetic = MAX(users.is_synthetic, excluded.is_synthetic)
        """,
        (user_id, username, 1 if is_synthetic else 0, _now()),
    )


def upsert_destination(conn: sqlite3.Connection, destination: dict[str, Any]) -> None:
    """Menyisipkan atau memperbarui satu destinasi dari dataset."""
    dest_id = str(destination.get("id", "")).strip()
    if not dest_id:
        raise ValueError("Destinasi harus memiliki id")
    conn.execute(
        """
        INSERT INTO destinations (
            id, name, category, broad_category, district, city,
            lat, lng, rating, review_count, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            category = excluded.category,
            broad_category = excluded.broad_category,
            district = excluded.district,
            city = excluded.city,
            lat = excluded.lat,
            lng = excluded.lng,
            rating = excluded.rating,
            review_count = excluded.review_count,
            updated_at = excluded.updated_at
        """,
        (
            dest_id,
            str(destination.get("name", "")),
            str(destination.get("category", "")),
            str(destination.get("broadCategory", destination.get("broad_category", ""))),
            str(destination.get("district", "")),
            str(destination.get("city", "")),
            float(destination.get("lat", 0.0)),
            float(destination.get("lng", 0.0)),
            float(destination.get("rating", 0.0)),
            int(destination.get("reviewCount", destination.get("review_count", 0)) or 0),
            _now(),
        ),
    )


def save_review(
    user_id: str,
    destination_id: str,
    beauty: int,
    access: int,
    facilities: int,
    comment: str | None = None,
    destination: dict[str, Any] | None = None,
    is_synthetic: bool = False,
) -> dict[str, Any]:
    """Menyimpan atau memperbarui ulasan satu pengguna untuk satu destinasi."""
    user_id = str(user_id).strip()
    destination_id = str(destination_id).strip()
    if not user_id:
        raise ValueError("user_id tidak boleh kosong")
    if not destination_id:
        raise ValueError("destination_id tidak boleh kosong")
    for label, value in (("beauty", beauty), ("access", access), ("facilities", facilities)):
        if int(value) < 1 or int(value) > 5:
            raise ValueError(f"{label} harus bernilai 1–5")

    conn = connect()
    init_db(conn)
    try:
        upsert_user(conn, user_id, is_synthetic=is_synthetic)
        if destination is not None:
            destination = dict(destination)
            destination["id"] = destination_id
            upsert_destination(conn, destination)

        dest_row = conn.execute(
            "SELECT id, name, review_count FROM destinations WHERE id = ?",
            (destination_id,),
        ).fetchone()
        if dest_row is None:
            raise LookupError(
                "Destinasi belum tersimpan. Kirim objek destination atau seed dataset terlebih dahulu."
            )

        overall = round((int(beauty) + int(access) + int(facilities)) / 3.0, 2)
        now = _now()
        conn.execute(
            """
            INSERT INTO reviews (
                user_id, destination_id, beauty, access, facilities,
                overall_rating, comment, is_synthetic, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, destination_id) DO UPDATE SET
                beauty = excluded.beauty,
                access = excluded.access,
                facilities = excluded.facilities,
                overall_rating = excluded.overall_rating,
                comment = excluded.comment,
                is_synthetic = MAX(reviews.is_synthetic, excluded.is_synthetic),
                updated_at = excluded.updated_at
            """,
            (
                user_id,
                destination_id,
                int(beauty),
                int(access),
                int(facilities),
                overall,
                comment.strip() if isinstance(comment, str) and comment.strip() else None,
                1 if is_synthetic else 0,
                now,
                now,
            ),
        )
        conn.commit()

        row = conn.execute(
            """
            SELECT id, user_id, destination_id, beauty, access, facilities,
                   overall_rating, comment, is_synthetic, created_at, updated_at
            FROM reviews
            WHERE user_id = ? AND destination_id = ?
            """,
            (user_id, destination_id),
        ).fetchone()
        result = dict(row)
        result["is_synthetic"] = bool(result["is_synthetic"])
        result["destination_name"] = str(dest_row["name"])
        result["destination_review_count"] = int(dest_row["review_count"])
        return result
    finally:
        conn.close()


def get_reviews(
    destination_id: str | None = None,
    user_id: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Membaca ulasan, opsional difilter berdasarkan destinasi atau pengguna."""
    conn = connect()
    init_db(conn)
    try:
        clauses: list[str] = []
        params: list[Any] = []
        if destination_id:
            clauses.append("r.destination_id = ?")
            params.append(destination_id)
        if user_id:
            clauses.append("r.user_id = ?")
            params.append(user_id)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        params.append(max(1, min(int(limit), 200)))
        rows = conn.execute(
            f"""
            SELECT r.id, r.user_id, u.username, r.destination_id,
                   d.name AS destination_name, r.beauty, r.access, r.facilities,
                   r.overall_rating, r.comment, r.is_synthetic,
                   r.created_at, r.updated_at, d.review_count AS destination_review_count
            FROM reviews r
            JOIN users u ON u.id = r.user_id
            JOIN destinations d ON d.id = r.destination_id
            {where}
            ORDER BY r.updated_at DESC, r.id DESC
            LIMIT ?
            """,
            params,
        ).fetchall()
        results: list[dict[str, Any]] = []
        for row in rows:
            item = dict(row)
            item["is_synthetic"] = bool(item["is_synthetic"])
            results.append(item)
        return results
    finally:
        conn.close()


def _cosine(left: dict[str, float], right: dict[str, float]) -> float:
    """Cosine similarity antara dua vektor rating yang diindeks user_id."""
    common = set(left) & set(right)
    if not common:
        return 0.0
    numerator = sum(left[user] * right[user] for user in common)
    left_norm = math.sqrt(sum(left[user] ** 2 for user in common))
    right_norm = math.sqrt(sum(right[user] ** 2 for user in common))
    if left_norm == 0.0 or right_norm == 0.0:
        return 0.0
    return numerator / (left_norm * right_norm)


@dataclass
class CFResult:
    """Hasil perhitungan CF untuk satu pengguna."""

    used: bool
    scores: dict[str, float] = field(default_factory=dict)
    reason: str = ""
    user_rating_count: int = 0
    total_reviews: int = 0
    total_items: int = 0


def get_cf_scores(user_id: str | None) -> CFResult:
    """Menghitung skor item-based CF 0–100 untuk seluruh destinasi.

    Cold start dikembalikan bila pengguna tidak ada, jumlah rating pengguna
    kurang dari ``MIN_USER_RATINGS``, atau tidak ada item yang memiliki
    kemiripan positif dengan item yang sudah dinilai pengguna.
    """
    if not user_id or not str(user_id).strip():
        return CFResult(False, reason="Cold start: user_id tidak tersedia")

    try:
        conn = connect()
        init_db(conn)
        try:
            rows = conn.execute(
                "SELECT user_id, destination_id, overall_rating FROM reviews"
            ).fetchall()
        finally:
            conn.close()
    except sqlite3.Error as exc:
        return CFResult(False, reason=f"Cold start: SQLite tidak dapat dibaca ({exc})")

    if not rows:
        return CFResult(False, reason="Cold start: belum ada ulasan")

    user_ratings: dict[str, dict[str, float]] = defaultdict(dict)
    item_users: dict[str, dict[str, float]] = defaultdict(dict)
    all_ratings: list[float] = []
    for row in rows:
        uid = str(row["user_id"])
        item = str(row["destination_id"])
        rating = float(row["overall_rating"])
        user_ratings[uid][item] = rating
        item_users[item][uid] = rating
        all_ratings.append(rating)

    target_user = str(user_id).strip()
    target_ratings = user_ratings.get(target_user, {})
    if len(target_ratings) < MIN_USER_RATINGS:
        return CFResult(
            False,
            reason=(
                f"Cold start: pengguna {target_user} baru memiliki "
                f"{len(target_ratings)} rating (minimum {MIN_USER_RATINGS})"
            ),
            user_rating_count=len(target_ratings),
            total_reviews=len(rows),
            total_items=len(item_users),
        )

    global_mean = sum(all_ratings) / len(all_ratings)
    scores: dict[str, float] = {}
    for candidate_item, candidate_users in item_users.items():
        if candidate_item in target_ratings:
            actual = target_ratings[candidate_item]
            scores[candidate_item] = round(max(0.0, min(100.0, (actual - 1.0) / 4.0 * 100.0)), 1)
            continue

        weighted_sum = 0.0
        similarity_sum = 0.0
        for rated_item, rated_value in target_ratings.items():
            similarity = _cosine(candidate_users, item_users[rated_item])
            if similarity > 0.0:
                weighted_sum += similarity * rated_value
                similarity_sum += similarity

        if similarity_sum <= 0.0:
            continue

        predicted = (weighted_sum + SHRINKAGE * global_mean) / (similarity_sum + SHRINKAGE)
        normalized = max(0.0, min(100.0, (predicted - 1.0) / 4.0 * 100.0))
        scores[candidate_item] = round(normalized, 1)

    if not scores:
        return CFResult(
            False,
            reason="Cold start: tidak ada item yang mirip dengan rating pengguna",
            user_rating_count=len(target_ratings),
            total_reviews=len(rows),
            total_items=len(item_users),
        )

    return CFResult(
        True,
        scores=scores,
        reason=(
            f"Item-based CF (cosine) dari {len(target_ratings)} rating pengguna "
            f"pada {len(item_users)} destinasi"
        ),
        user_rating_count=len(target_ratings),
        total_reviews=len(rows),
        total_items=len(item_users),
    )
