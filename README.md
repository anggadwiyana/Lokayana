# Lokayana AI 🌴
> **Sistem Navigasi Cerdas & Rekomendasi Destinasi Wisata Bali Berbasis Kecerdasan Tiruan (AI)**  
> *Proyek Mata Kuliah Kecerdasan Buatan / Kecerdasan Tiruan — Semester 3*

---

## 📌 Sekilas Proyek

**Lokayana AI** adalah aplikasi cerdas perencanaan perjalanan wisata untuk Pulau Bali. Pengguna dapat menentukan lokasi keberangkatan, memilih satu atau beberapa destinasi wisata sekaligus, dan sistem secara otomatis:
1. **Time-Aware A\* TSP (Travelling Salesperson Problem):** Mengurutkan urutan kunjungan optimal berdasarkan efisiensi jarak fisik (Haversine) **sekaligus kesesuaian waktu kunjungan terbaik (*Best Timing*)** dalam alur sehari (Subuh $\to$ Pagi $\to$ Siang $\to$ Sore $\to$ Malam).
2. **Dynamic Real-Time Timing & Warning System:** Menyesuaikan rekomendasi dengan jam perangkat saat ini (misal jam siang mengutamakan aktivitas indoor/museum, jam sore mengutamakan pantai sunset). Jika pengguna memilih tempat yang waktu terbaiknya sudah terlewat, aplikasi memberikan **peringatan informatif (*warning badge*)** tanpa membatasi kebebasan pengguna untuk tetap berkunjung.
3. **Best Timing Knowledge Base (80+ Destinasi Bali):** Memberikan rekomendasi jam kunjungan ideal spesifik untuk setiap destinasi (Pantai Sanur saat **Subuh/Sunrise**, Pura Besakih & Tukad Cepung saat **Pagi**, Museum saat **Siang**, Pura Tanah Lot, Uluwatu & Pantai Kuta saat **Sore/Sunset**, dan Tari Tradisional saat **Malam**).
4. **Rute Jalan Nyata via OSRM (Open Source Routing Machine):** Memetakan rute jalan raya riil dengan perbandingan estimasi waktu tempuh **Sepeda Motor vs Mobil**.
5. **Logika Radius Cerdas 15 km:** Menerapkan zona koridor pencarian (1 radius vs 2 radius) di sepanjang simpul rute perjalanan.
6. **AI Similarity Scoring:** Merekomendasikan destinasi alternatif (*hidden gems*) serupa berdasarkan kemiripan kategori, semantik keyword, lokasi, dan rating.

---

## 🏗️ Arsitektur Sistem

```
┌────────────────────────────────────────────────────────┐
│            Mobile App (React Native / Expo)            │
│  ├── Antarmuka ramah pengguna (bebas koordinat mentah) │
│  ├── Real-Time Timing Banner & Warning Informatif      │
│  ├── Peta Interaktif Leaflet & OpenStreetMap           │
│  └── Dual-Engine Auto-Fallback (Local A* & Similarity) │
└───────────────────────────┬────────────────────────────┘
                            │ POST /api/route (JSON)
                            ▼
┌────────────────────────────────────────────────────────┐
│          Backend AI (Python FastAPI - Port 8000)       │
│  ├── Time-Aware A* TSP Solver (Multi-Objective)        │
│  ├── Best Visit Timing Knowledge Base (80+ overrides)  │
│  ├── AI Multi-criteria Similarity Engine               │
│  └── OSRM Real Road Routing & Haversine Failover       │
└────────────────────────────────────────────────────────┘
```

> **🛡️ Resiliensi Dual-Engine (Offline-Ready):**  
> Aplikasi mobile dilengkapi **Dual-Engine Auto-Fallback**. Jika backend Python aktif, rute diproses via FastAPI server. Namun jika backend belum dinyalakan atau jaringan terputus, aplikasi mobile **otomatis beralih ke kalkulasi lokal Time-Aware A\* TSP & AI Similarity di sisi TypeScript** tanpa error ataupun crash.

---

## 🚀 Panduan Instalasi & Menjalankan Proyek

### 1. Menjalankan Backend Python (Pilih salah satu cara)

#### 🐳 Cara A: Menggunakan Docker (Direkomendasikan — 1 Perintah)
Pastikan Docker Desktop sudah aktif di komputer Anda, lalu buka terminal di root direktori proyek:

```bash
# Build dan jalankan container backend di latar belakang:
docker-compose up --build -d

# Cek status container dan healthcheck:
docker-compose ps

# Melihat log aktivitas API secara realtime:
docker-compose logs -f

# Menghentikan container jika selesai digunakan:
docker-compose down
```

#### 🐍 Cara B: Menjalankan Manual dengan Python Lokal
```bash
# Masuk ke folder backend
cd apps/backend

# (Opsional) Buat virtual environment
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate

# Install dependensi
pip install -r requirements.txt

# Jalankan server FastAPI
python main.py
# atau: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

*Server aktif di `http://localhost:8000`. Dokumentasi interaktif Swagger API dapat diakses di `http://localhost:8000/docs`.*

---

### 2. Menjalankan Aplikasi Mobile (React Native / Expo)

Buka terminal baru:

```bash
# Jalankan langsung dari root proyek:
npm start

# ATAU masuk ke folder mobile:
cd apps/mobile
npm install
npx expo start -c
```

#### 📱 Panduan Membuka di HP Fisik (Expo Go):

> **💡 Tips Koneksi Jaringan:**  
> Pastikan Laptop dan HP terhubung ke **jaringan Wi-Fi yang sama**. Jika berada di Wi-Fi kampus atau kafe yang memblokir koneksi lokal (AP isolation), **gunakan Hotspot Pribadi dari HP** agar laptop dan HP bisa saling mendeteksi dengan lancar.

1. **Untuk Pengguna Android:**
   * Buka aplikasi **Expo Go** di HP Android.
   * Ketuk tombol **Scan QR Code**, lalu arahkan kamera ke QR Code di terminal laptop Anda.
   * Aplikasi Lokayana AI akan langsung terunduh dan terbuka (bebas tanpa perlu login akun apa pun).

2. **Untuk Pengguna iOS (iPhone):**
   * **Langkah A (Penting):** Buka *Settings (Pengaturan)* iPhone $\to$ scroll ke bawah pilih *Expo Go* $\to$ pastikan izin **Local Network (Jaringan Lokal)** dalam posisi **ON (Hijau)**.
   * **Langkah B (Buka via Safari):** Buka browser **Safari** di iPhone, ketik alamat IP laptop Anda:  
     `exp://<IP_LAPTOP>:8081` (misal: `exp://172.16.174.115:8081`) $\to$ tekan Go $\to$ klik **Open in Expo Go**.
   * *(Atau login ke akun Expo yang sama di Expo Go jika ingin langsung scan).*

3. **Menghubungkan ke Backend Python:**
   * Cek IP Wi-Fi laptop Anda (`ipconfig` di Windows).
   * Buka file `apps/mobile/src/config/api.ts`, sesuaikan IP:
     ```typescript
     export const API_BASE_URL = 'http://<IP_LAPTOP>:8000';
     ```
   * *Catatan: Jika backend belum aktif, aplikasi tetap 100% berjalan normal berkat fitur Dual-Engine Local Fallback!*

---

## 🧪 Fitur AI Unggulan untuk Presentasi Dosen

### 1. Time-Aware A\* TSP (Travelling Salesperson Problem)
Algoritma ini tidak sekadar mencari jarak terpendek, melainkan menggabungkan optimasi jarak fisik dengan alur kronologis waktu terbaik (*Best Timing*):
$$\min \sum \left( \text{Haversine}(d_i, d_{i+1}) + \text{Penalty}_{\text{inversion}}(t_i, t_{i+1}) \right)$$
- **Penalti Pembalikan Waktu (*Time Inversion Penalty*):** Jika rute melompat mundur dalam waktu (misalnya dari tempat Sore ke tempat Subuh), rute tersebut dikenakan penalti biaya ($16.0\text{ km}$ per jam pembalikan waktu).
- **Contoh Nyata:** Jika pengguna memilih **Pantai Sanur (Sunrise / Subuh)**, **Museum Blanco (Siang)**, dan **Tanah Lot (Sunset / Sore)**, algoritma A\* secara otomatis mengurutkan:
  $$\text{Sanur (Subuh)} \longrightarrow \text{Museum (Siang)} \longrightarrow \text{Tanah Lot (Sore)}$$

### 2. Sistem Waktu Nyata & Rekomendasi Adaptif
- **Deteksi Jam Otomatis:** Aplikasi membaca jam perangkat pengguna dan membaginya ke dalam 5 slot waktu:
  - **Subuh:** 04:30 – 07:30
  - **Pagi:** 07:30 – 11:30
  - **Siang:** 11:30 – 15:00
  - **Sore:** 15:00 – 18:30
  - **Malam:** 18:30 – 22:00
- **Prioritas Rekomendasi Jam Sekarang:** Destinasi yang cocok dengan jam saat ini otomatis diprioritaskan di bagian atas rekomendasi dan hasil pencarian.
- **Peringatan Waktu Informatif (Non-Blocking):** Jika pengguna memilih tempat yang waktu terbaiknya sudah lewat hari ini, muncul peringatan informatif tanpa memblokir rencana perjalanan:  
  *⚠️ "Waktu kunjungan kurang ideal untuk hari ini karena waktu terbaik sudah lewat. Namun Anda tetap dapat mengunjunginya jika berkenan."*

### 3. Knowledge Base Best Timing (80+ Destinasi Bali)
- **Subuh / Sunrise (05:30 – 07:30):** Pantai Sanur, Amed, Candidasa, Sunrise Batur Trekking, Lovina Dolphin.
- **Pagi (07:30 – 11:00):** Pura Besakih, Gerbang Surga Lempuyang, Tirta Empul, Air Terjun Tukad Cepung (*sinar dewa gua*), Gitgit, Tegalalang Rice Terrace.
- **Siang (11:00 – 14:30):** Museum Blanco, Galeri Seni Ubud, Museum Puri Lukisan, Kuliner & Oleh-oleh indoor.
- **Sore / Sunset (15:30 – 18:30):** Pura Tanah Lot, Pura Uluwatu (*Sunset + Tari Kecak*), Pantai Kuta, Seminyak, Canggu, Jimbaran Seafood, GWK Cultural Park.
- **Malam (18:30 – 21:30):** Pementasan Tari Puri Ubud, Pasar Senggol Gianyar.

### 4. Titik Awal Keberangkatan Fleksibel
- Pengguna tidak perlu memasukkan angka latitude/longitude manual.
- Mendukung **GPS Otomatis**, **Pilih langsung di Peta Interaktif**, dan **Preset Lokasi Populer Bali** (Kuta, Bandara Ngurah Rai, Ubud, Sanur, Canggu, Seminyak, Jimbaran, Nusa Dua).

---

## 📁 Struktur Direktori Repositori

```
lokayana_ai/
├── docker-compose.yml        # Orchestrasi container Docker (FastAPI)
├── .dockerignore             # Exclude rule Docker build
├── .gitignore                # Exclude node_modules, cache, python temp
├── README.md                 # Dokumentasi utama proyek
│
├── apps/
│   ├── backend/              # Python FastAPI AI Server
│   │   ├── Dockerfile        # Container image Python 3.11-slim
│   │   ├── requirements.txt  # FastAPI, Uvicorn, Pydantic, HTTPX
│   │   ├── main.py           # Entry point API server
│   │   ├── README_BACKEND.md # Dokumentasi teknis backend
│   │   ├── core/
│   │   │   ├── astar.py      # Time-Aware A* TSP Solver
│   │   │   ├── best_timing.py# Knowledge Base Best Timing Bali
│   │   │   ├── haversine.py  # Kalkulasi jarak lurus bumi
│   │   │   └── recommender.py# Rekomendasi & AI similarity
│   │   └── api/
│   │       ├── routes.py     # Endpoints (/api/route, /health)
│   │       └── schemas.py    # Schema data Pydantic v2
│   │
│   └── mobile/               # React Native / Expo Frontend
│       ├── package.json      # Dependensi Expo SDK & React Native
│       ├── tsconfig.json     # Konfigurasi TypeScript
│       ├── App.tsx           # Root navigation & state
│       └── src/
│           ├── config/api.ts # Konfigurasi URL backend & badge
│           ├── types/        # Definisi antarmuka TypeScript
│           ├── utils/
│           │   ├── bestTimingHelper.ts # Engine timing & status waktu nyata
│           │   └── imageHelper.ts      # Unsplash Bali photo resolver
│           ├── services/
│           │   ├── recommenderService.ts # Hybrid API/local solver
│           │   ├── routingService.ts     # Haversine & OSRM client
│           │   └── destinationService.ts # 1.445 destinasi Bali
│           ├── screens/
│           │   ├── HomeScreen.tsx    # Layar utama pemilihan rute
│           │   ├── GemListScreen.tsx # Hasil rute & alternatif
│           │   ├── ProfileScreen.tsx # Gamifikasi poin & lencana
│           │   └── ReviewScreen.tsx  # Tulis ulasan hidden gem
│           └── components/
│               ├── FastestRouteCard.tsx       # Timeline rute & timing
│               ├── AlternativeGemCard.tsx     # Kartu rekomendasi
│               ├── DestinationDetailModal.tsx # Modal detail & warning
│               └── LeafletMapView.tsx         # Peta rute interaktif
```

---

## 👥 Tim Pengembang

Proyek ini dikembangkan oleh Tim Mahasiswa Semester 3 untuk Mata Kuliah **Kecerdasan Buatan / Kecerdasan Tiruan**:

* **Kadek Angga Dwiyana Putra** ([@anggadwiyana](https://github.com/anggadwiyana))
* **Ni Luh Angelina Nadia** ([@angienadia](https://github.com/anggienadia))
* **Pande Nyoman Temaja Erlangga** ([@TejaErlangga](https://github.com/TejaErlangga))
* **Komang Astri Saptari** ([@astrisaptari](https://github.com/astrisaptari))
* **Putu Aldo Chrisna Arkananta Suwidana** ([@TheNightShadeee](https://github.com/TheNightShadeee))

---

## 📄 Lisensi
Proyek ini dilisensikan di bawah [MIT License](LICENSE). Bebas digunakan untuk keperluan pembelajaran dan pengembangan akademis.
