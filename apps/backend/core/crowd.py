"""core/crowd.py — Pemuatan model XGBoost prediksi keramaian.

Model dilatih pada DATA SINTETIS oleh ``ml/train_crowd_model.py``.
Prediksi hanya boleh disebut sebagai prediksi pada pola sintetis, bukan
data keramaian nyata. Jika model atau pustaka XGBoost tidak tersedia,
``CrowdModel.predict`` mengembalikan ``None`` dan pemanggil harus memakai
aturan lama (``best_timing``, radius 15 km, proksi ``reviewCount``).
"""

from __future__ import annotations

import json
import os
from datetime import date, datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_MODEL_PATH = REPO_ROOT / "ml" / "artifacts" / "crowd_model.json"
DEFAULT_META_PATH = REPO_ROOT / "ml" / "artifacts" / "crowd_model_meta.json"


def _holiday_dates() -> set[str]:
    raw = os.environ.get("LOKAYANA_HOLIDAY_DATES", "")
    return {item.strip() for item in raw.split(",") if item.strip()}


def crowd_label(level: float | None) -> str | None:
    """Mengubah angka 0–100 menjadi label kualitatif."""
    if level is None:
        return None
    if level < 35.0:
        return "Sepi"
    if level <= 65.0:
        return "Sedang"
    return "Ramai"


class CrowdModel:
    """Pembungkus model Booster XGBoost dan metadata fiturnya."""

    def __init__(
        self,
        model_path: str | Path | None = None,
        meta_path: str | Path | None = None,
    ) -> None:
        self.model_path = Path(
            model_path or os.environ.get("LOKAYANA_CROWD_MODEL_PATH") or DEFAULT_MODEL_PATH
        )
        self.meta_path = Path(
            meta_path or os.environ.get("LOKAYANA_CROWD_META_PATH") or DEFAULT_META_PATH
        )
        self.model: Any = None
        self.meta: dict[str, Any] | None = None
        self.available = False
        self.error: str | None = None
        self.category_to_id: dict[str, int] = {}
        self._load()

    def _load(self) -> None:
        try:
            import xgboost as xgb  # type: ignore

            if not self.model_path.exists():
                raise FileNotFoundError(f"Model tidak ditemukan: {self.model_path}")
            if not self.meta_path.exists():
                raise FileNotFoundError(f"Metadata tidak ditemukan: {self.meta_path}")

            booster = xgb.Booster()
            booster.load_model(str(self.model_path))
            meta = json.loads(self.meta_path.read_text(encoding="utf-8"))
            self.model = booster
            self.meta = meta
            self.category_to_id = {
                str(key): int(value)
                for key, value in dict(meta.get("category_to_id", {})).items()
            }
            self.available = True
        except Exception as exc:  # noqa: BLE001 - fallback harus tetap hidup
            self.available = False
            self.error = str(exc)

    def predict(
        self,
        destination: dict[str, Any],
        hour: float,
        day_of_week: int | None = None,
        is_holiday: bool | None = None,
    ) -> float | None:
        """Memprediksi tingkat keramaian 0–100 untuk destinasi pada jam tertentu.

        Fitur: jam, hari dalam pekan, akhir pekan, hari libur, ``reviewCount``,
        ``rating``, dan kategori destinasi. Mengembalikan ``None`` bila model
        tidak tersedia agar pemanggil memakai aturan lama.
        """
        if not self.available or self.model is None:
            return None
        try:
            import numpy as np  # type: ignore
            import xgboost as xgb  # type: ignore

            if day_of_week is None:
                day_of_week = datetime.now().weekday()
            if is_holiday is None:
                is_holiday = date.today().isoformat() in _holiday_dates()

            category = str(destination.get("category", ""))
            category_id = self.category_to_id.get(category, 0)
            review_count = float(
                destination.get("reviewCount", destination.get("review_count", 0)) or 0
            )
            rating = float(destination.get("rating", 0.0) or 0.0)
            weekend = 1.0 if int(day_of_week) >= 5 else 0.0

            features = np.asarray(
                [[
                    float(hour),
                    float(day_of_week),
                    weekend,
                    1.0 if is_holiday else 0.0,
                    review_count,
                    rating,
                    float(category_id),
                ]],
                dtype=np.float32,
            )
            prediction = float(self.model.predict(xgb.DMatrix(features))[0])
            return round(max(0.0, min(100.0, prediction)), 1)
        except Exception:  # noqa: BLE001 - prediksi gagal harus fallback
            return None


@lru_cache(maxsize=1)
def get_crowd_model() -> CrowdModel:
    """Memuat model sekali per proses."""
    return CrowdModel()
