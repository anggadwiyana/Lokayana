"""Uji fitur CF, endpoint ulasan, dan fallback model keramaian.

Jalankan dari root repositori:
    python -m unittest discover -s apps/backend/tests -v

Tes memakai basis data SQLite sementara melalui ``LOKAYANA_DB_PATH`` dan
tidak mengubah basis data demo utama.
"""

from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BACKEND = ROOT / "apps" / "backend"
sys.path.insert(0, str(BACKEND))

from core.cf import get_cf_scores, get_reviews, init_db, save_review  # noqa: E402
from core.crowd import DEFAULT_MODEL_PATH, CrowdModel  # noqa: E402
from core.recommender import get_recommendations  # noqa: E402


def destination(dest_id: str, name: str, category: str = "Pantai") -> dict:
    return {
        "id": dest_id,
        "name": name,
        "category": category,
        "broadCategory": "Alam",
        "district": "Kuta",
        "city": "Kabupaten Badung",
        "rating": 4.5,
        "reviewCount": 10,
        "lat": -8.72,
        "lng": 115.17,
        "mapLink": "https://example.test/maps",
        "imageUrl": None,
    }


class FeatureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.db_path = Path(cls.temp_dir.name) / "test.db"
        os.environ["LOKAYANA_DB_PATH"] = str(cls.db_path)
        init_db()

        cls.d1 = destination("D1", "Dest One")
        cls.d2 = destination("D2", "Dest Two", "Pura")
        cls.d3 = destination("D3", "Dest Three", "Pantai")

        # u1: D1,D2; u2: D1,D2,D3; u3: D1,D3. Memberi irisan item untuk CF.
        ratings = {
            "u1": [("D1", 5), ("D2", 4)],
            "u2": [("D1", 4), ("D2", 5), ("D3", 4)],
            "u3": [("D1", 5), ("D3", 5)],
            "u4": [("D1", 4)],
        }
        destinations = {"D1": cls.d1, "D2": cls.d2, "D3": cls.d3}
        for user_id, items in ratings.items():
            for dest_id, value in items:
                save_review(
                    user_id=user_id,
                    destination_id=dest_id,
                    beauty=value,
                    access=value,
                    facilities=value,
                    destination=destinations[dest_id],
                    is_synthetic=True,
                )

        # Import setelah env DB diatur.
        from fastapi.testclient import TestClient
        from main import app

        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.temp_dir.cleanup()
        os.environ.pop("LOKAYANA_DB_PATH", None)

    def test_lightweight_health_endpoint(self) -> None:
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_cold_start_for_new_user(self) -> None:
        result = get_cf_scores("user_baru")
        self.assertFalse(result.used)
        self.assertIn("Cold start", result.reason)

    def test_cold_start_for_user_with_one_rating(self) -> None:
        result = get_cf_scores("u4")
        self.assertFalse(result.used)
        self.assertEqual(result.user_rating_count, 1)

    def test_item_based_cf_produces_scores(self) -> None:
        result = get_cf_scores("u1")
        self.assertTrue(result.used)
        self.assertIn("D3", result.scores)
        self.assertGreaterEqual(result.scores["D3"], 0.0)
        self.assertLessEqual(result.scores["D3"], 100.0)

    def test_review_endpoint_roundtrip_and_validation(self) -> None:
        api_dest = destination("API_DEST", "API Destination", "Pura")
        payload = {
            "user_id": "api_user",
            "destination_id": "API_DEST",
            "destination": api_dest,
            "beauty": 5,
            "access": 4,
            "facilities": 4,
            "comment": "Ulasan uji endpoint.",
        }
        response = self.client.post("/api/reviews", json=payload)
        self.assertEqual(response.status_code, 201, response.text)
        body = response.json()
        self.assertEqual(body["destination_id"], "API_DEST")
        self.assertFalse(body["is_synthetic"])
        self.assertAlmostEqual(body["overall_rating"], 4.33, places=2)
        self.assertIn("reward_points", body)

        listed = self.client.get("/api/reviews", params={"destination_id": "API_DEST"})
        self.assertEqual(listed.status_code, 200, listed.text)
        self.assertEqual(listed.json()["count"], 1)

        invalid = dict(payload, beauty=6)
        self.assertEqual(self.client.post("/api/reviews", json=invalid).status_code, 422)

        missing = {
            "user_id": "api_user",
            "destination_id": "TIDAK_ADA",
            "beauty": 5,
            "access": 5,
            "facilities": 5,
        }
        self.assertEqual(self.client.post("/api/reviews", json=missing).status_code, 404)

    def test_route_integrates_cf_and_crowd(self) -> None:
        cf = get_cf_scores("u1")
        result = get_recommendations(
            origin={"lat": -8.7184, "lng": 115.1686, "name": "Kuta Central"},
            destinations=[self.d1],
            all_destinations=[self.d1, self.d2, self.d3],
            user_id="u1",
            cf_scores=cf.scores,
            cf_used=cf.used,
            cf_reason=cf.reason,
            crowd_predictor=lambda _dest, _hour: 55.0,
        )
        self.assertGreater(len(result["alternatives"]), 0)
        first = result["alternatives"][0]
        for key in ("cfScore", "cfUsed", "cfReason", "crowdLevel", "crowdLabel", "crowdSource", "rankingScore"):
            self.assertIn(key, first)
        self.assertEqual(first["crowdLabel"], "Sedang")
        self.assertEqual(first["crowdSource"], "xgboost")
        self.assertTrue(result["personalization"]["cfUsed"])
        self.assertTrue(result["personalization"]["crowdModelUsed"])

    def test_crowd_model_fallback_when_files_missing(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            model = CrowdModel(
                model_path=Path(temp_dir) / "tidak_ada.json",
                meta_path=Path(temp_dir) / "tidak_ada_meta.json",
            )
            self.assertFalse(model.available)
            self.assertIsNone(model.predict(self.d1, 12.0))

    def test_trained_crowd_model_loads(self) -> None:
        if not DEFAULT_MODEL_PATH.exists():
            self.skipTest("Model belum dilatih; jalankan ml/train_crowd_model.py")
        model = CrowdModel()
        self.assertTrue(model.available, model.error)
        prediction = model.predict(self.d1, 12.0, day_of_week=2, is_holiday=False)
        self.assertIsNotNone(prediction)
        self.assertGreaterEqual(prediction, 0.0)
        self.assertLessEqual(prediction, 100.0)


if __name__ == "__main__":
    unittest.main()
