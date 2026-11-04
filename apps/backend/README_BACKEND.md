# Lokayana AI — Python Backend

Backend API untuk sistem rekomendasi wisata Bali **Lokayana AI**, dibangun dengan **FastAPI** dan algoritma **A\* TSP** untuk optimasi rute multi-destinasi.

---

## Teknologi

| Library | Versi | Fungsi |
|---|---|---|
| FastAPI | 0.115.0 | Web framework async |
| Uvicorn | 0.30.6 | ASGI server |
| Pydantic | 2.9.2 | Validasi data & schema |
| HTTPX | 0.27.2 | HTTP client async (OSRM) |

---

## Struktur Folder

```
apps/backend/
├── Dockerfile               # Konfigurasi container Docker production-ready
├── .dockerignore            # File yang diabaikan dalam build image
├── main.py                  # Entry point FastAPI app
├── requirements.txt         # Python dependencies
├── README_BACKEND.md        # Dokumentasi ini
├── core/
│   ├── __init__.py
│   ├── haversine.py         # Kalkulasi jarak Haversine (pure Python)
│   ├── best_timing.py       # Knowledge base & engine Best Visit Timing Bali
│   ├── astar.py             # Algoritma Time-Aware A* TSP Solver
│   └── recommender.py       # Engine rekomendasi & kesamaan semantik
└── api/
    ├── __init__.py
    ├── schemas.py           # Pydantic v2 request/response models
    └── routes.py            # FastAPI router & endpoint handlers
```

---

## Cara Menjalankan

### Opsi 1: Menggunakan Docker (Paling Praktis)

Dari root direktori project:
```bash
# Build dan jalankan container
docker-compose up --build -d

# Cek logs
docker-compose logs -f

# Hentikan
docker-compose down
```

Atau build container backend langsung dari folder ini:
```bash
docker build -t lokayana-backend .
docker run -p 8000:8000 --name lokayana-api lokayana-backend
```

---

### Opsi 2: Manual Menggunakan Python (Lokal)

#### 1. Prasyarat
- Python 3.11 atau lebih baru
- pip atau virtualenv

### 2. Masuk ke folder backend

```bash
cd apps/backend
```

### 3. (Opsional) Buat virtual environment

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

### 4. Install dependencies

```bash
pip install -r requirements.txt
```

### 5. Jalankan server

```bash
# Cara 1: via uvicorn langsung (production-style)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Cara 2: via Python (development)
python main.py
```

Server berjalan di: **http://0.0.0.0:8000**

---

## Dokumentasi API

Setelah server berjalan, buka:

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## Endpoint

### `GET /`
Info singkat service.

**Response:**
```json
{
  "service": "Lokayana AI Backend",
  "version": "1.0.0",
  "description": "...",
  "docs": "/docs",
  "health": "/api/health"
}
```

---

### `GET /api/health`
Health check untuk monitoring.

**Response:**
```json
{
  "status": "ok",
  "service": "Lokayana AI Backend",
  "algorithm": "A* TSP"
}
```

---

### `POST /api/route`
**Endpoint utama** — Rekomendasi rute + destinasi alternatif.

**Request Body:**
```json
{
  "origin_lat": -8.6521,
  "origin_lng": 115.2191,
  "origin_name": "Hotel Kuta",
  "destinations": [
    {
      "id": "dest_001",
      "name": "Pantai Kuta",
      "category": "Pantai",
      "broadCategory": "Alam",
      "district": "Kuta",
      "city": "Badung",
      "rating": 4.5,
      "reviewCount": 1200,
      "lat": -8.7215,
      "lng": 115.1685,
      "mapLink": "https://maps.google.com/...",
      "imageUrl": null
    }
  ],
  "all_destinations": [...]
}
```

**Response:** `RouteResponse` lengkap berisi:
- `orderedDestinations` — urutan kunjungan optimal (A* TSP)
- `searchAreas` — zona radius pencarian alternatif
- `route` — data rute jalan raya dari OSRM (atau fallback)
- `alternatives` — maks 30 destinasi alternatif dengan similarity score AI

---

## Algoritma

### A\* TSP Solver (`core/astar.py`)
Mengurutkan multi-destinasi dengan formula:

```
f(n) = g(n) + h(n)
```

- **g(n)**: Total jarak aktual yang sudah ditempuh dari origin
- **h(n)**: Heuristic admissible — jarak Haversine ke destinasi terjauh yang belum dikunjungi

### Similarity Score (`core/recommender.py`)
Skor kemiripan multi-kriteria (range 62–99%):

| Kriteria | Bobot Maks |
|---|---|
| Kesamaan kategori | 45 poin |
| Analisis semantik keyword | 25 poin |
| Kesamaan wilayah/kabupaten | 15 poin |
| Rating & kualitas | 10 poin |
| Bonus kedekatan ≤ 15 km | 5 poin |

### OSRM Integration (`api/routes.py`)
Fetch rute jalan raya nyata dengan failover otomatis:
1. `routing.openstreetmap.de` (mirror resmi)
2. `router.project-osrm.org` (HTTPS)
3. `router.project-osrm.org` (HTTP)
4. Fallback: kurva Bezier + estimasi kecepatan

---

## Environment

Server menggunakan CORS `allow_origins=["*"]` agar bisa diakses dari:
- Expo Go (Android/iOS emulator)
- React Native mobile app
- Browser (development)
