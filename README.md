# Lokayana AI 🌴
> **Sistem Navigasi Cerdas & Rekomendasi Destinasi Wisata Bali Berbasis Kecerdasan Tiruan (AI)**  
> *Proyek Mata Kuliah Kecerdasan Buatan / Kecerdasan Tiruan — Semester 3*

---

## 📌 Sekilas Proyek

**Lokayana AI** adalah aplikasi perencanaan rute wisata cerdas untuk pulau Bali. Pengguna dapat menentukan lokasi keberangkatan, memilih satu atau banyak tempat wisata tujuan, dan sistem secara otomatis menghitung urutan kunjungan tercepat (TSP) serta merekomendasikan destinasi alternatif serupa (*hidden gems*) berdasarkan aturan radius 15 km.

Aplikasi tersedia dalam 2 versi pada cabang GitHub:
* **Branch `feature/mobile-app`**: Aplikasi Mobile interaktif (React Native + Expo)
* **Branch `main`**: Aplikasi Web berbasis Python (Streamlit + Folium)

---

## ✨ Fitur Utama

1. **📍 Penentuan Titik Keberangkatan Fleksibel**
   - Deteksi lokasi saat ini via **GPS perangkat**.
   - **Pilih langsung dari peta interaktif** (geser & ketuk pin di peta Bali).
   - Preset lokasi populer (Bandara Ngurah Rai, Kuta, Ubud, Sanur, Canggu, Seminyak, dll).

2. **🗺️ Pemilihan Multi-Destinasi Wisata**
   - Pilih satu atau beberapa destinasi wisata sekaligus (hingga 8 tempat).
   - Filter **9 kategori spesifik**: Pantai, Pura & Candi, Air Terjun, Patung & Monumen, Bukit & Tebing, Danau & Sungai, Taman Rekreasi, Seni & Budaya, dll.
   - Pencarian *live autocomplete* dari **1.445 data destinasi wisata Bali**.

3. **⚡ Kalkulasi Rute Tercepat (Greedy TSP & OSRM Engine)**
   - Menggunakan algoritma **Greedy Nearest-Neighbour (TSP)** untuk mengurutkan destinasi agar rute perjalanan tidak bolak-balik.
   - Integrasi **OSRM (Open Source Routing Machine)** untuk jalur jalan nyata (*polyline*) beserta perbandingan waktu tempuh **Sepeda Motor vs Mobil**.

4. **🎯 Logika Radius Cerdas 15 km**
   - **Jarak > 15 km**: Sistem memetakan **2 radius 15 km** (zona titik awal & zona destinasi).
   - **Jarak ≤ 15 km**: Sistem menggabungkannya ke dalam **1 radius 15 km**.
   - **Multi-destinasi**: Memetakan zona radius 15 km di setiap titik pemberhentian.

5. **🤖 Rekomendasi AI Alternatif Serupa (*Content-Based Similarity*)**
   - Menghitung skor kemiripan (*similarity score* 0–100%) berdasarkan kategori, semantik kata kunci, wilayah kabupaten, dan rating.
   - Menemukan tempat tersembunyi (*hidden gem*) yang relevan di sekitar rute perjalanan.

6. **🗺️ Peta Tajam & Bebas API Key**
   - Menggunakan tile **Esri World Street Map** (persis seperti versi web).
   - Berjalan lancar di Android & iOS tanpa kendala *black screen* dan tanpa memerlukan Google Maps API key / billing kartu kredit.

---

## 🚀 Panduan Menjalankan Aplikasi Mobile (Expo Go)

Ikuti langkah-langkah mudah berikut untuk mencoba aplikasi di HP fisik (Android / iOS):

### 1. Prasyarat
- Pasang [Node.js](https://nodejs.org/) (versi 18 atau lebih baru).
- Unduh aplikasi **Expo Go** di ponsel Anda:
  - [Expo Go untuk Android (Play Store)](https://play.google.com/store/apps/details?id=host.exp.exponent)
  - [Expo Go untuk iOS (App Store)](https://apps.apple.com/app/expo-go/id982107779)
- Pastikan laptop dan HP terhubung ke **jaringan Wi-Fi yang sama**.

### 2. Clone Repositori & Masuk ke Branch Mobile
Buka terminal (Git Bash / PowerShell), lalu jalankan:

```bash
# Clone repositori
git clone https://github.com/anggadwiyana/Lokayana.git
cd Lokayana

# Pindah ke branch aplikasi mobile
git checkout feature/mobile-app
```

### 3. Instalasi Dependensi
Jalankan instalasi dependensi (cukup sekali di awal):

```bash
cd apps/mobile
npm install
```

### 4. Jalankan Expo Dev Server
Dari direktori proyek, jalankan:

```bash
npm start
```
*(Atau jalankan `npm start` langsung dari folder utama)*

### 5. Buka di HP Anda
- **Di Android**: Buka aplikasi **Expo Go**, pilih **Scan QR Code**, lalu arahkan kamera ke QR Code yang muncul di terminal Anda.
- **Di iOS**: Buka aplikasi **Kamera** bawaan iPhone, arahkan ke QR Code, lalu ketuk banner notifikasi untuk membuka di Expo Go.
- **Di Emulator Android**: Tekan tombol <kbd>a</kbd> di terminal.

---

## 🌐 Panduan Menjalankan Versi Web (Streamlit)

Jika ingin menjalankan versi Web di branch `main`:

```bash
git checkout main
pip install -r requirements.txt
streamlit run app.py
```
Buka browser pada alamat `http://localhost:8501`.

---

## 🧠 Algoritma & Konsep AI yang Digunakan

1. **Haversine Formula**: Menghitung jarak geodesik bola bumi antar koordinat lintang & bujur dalam kilometer.
2. **Greedy Nearest Neighbour (TSP)**: Menentukan urutan kunjungan terbaik dari titik awal ke titik terdekat berikutnya secara efisien.
3. **Content-Based Similarity Scoring**:
   - Bobot Kategori (45%)
   - Analisis Semantik Kata Kunci (25%)
   - Kesamaan Wilayah/Kabupaten (15%)
   - Rating & Popularitas (10%)
   - Kedekatan Geografis dalam Radius 15 km (5%)

---

## 👥 Pengembang
* **Angga Dwiyana** ([@anggadwiyana](https://github.com/anggadwiyana))
* Mata Kuliah: **Kecerdasan Buatan / Kecerdasan Tiruan** (Semester 3)