# Lokayana AI 🌴
> **Sistem Navigasi Cerdas & Rekomendasi Destinasi Wisata Bali Berbasis Kecerdasan Tiruan (AI)**  
> *Proyek Mata Kuliah Kecerdasan Buatan / Kecerdasan Tiruan — Semester 3*

---

## 📌 Sekilas Proyek

**Lokayana AI** adalah aplikasi perencanaan rute wisata cerdas untuk pulau Bali. Pengguna dapat menentukan lokasi awal (GPS / Peta), memilih satu atau beberapa destinasi wisata sekaligus, dan sistem secara otomatis:
1. Menghitung urutan rute tercepat menggunakan algoritma **Greedy TSP (Travelling Salesperson Problem)**.
2. Memetakan rute jalan nyata via **OSRM (Open Source Routing Machine)** dengan perbandingan waktu tempuh **Sepeda Motor vs Mobil**.
3. Menerapkan **Logika Radius Cerdas 15 km** (mode 1 radius vs 2 radius).
4. Memberikan rekomendasi destinasi serupa (*hidden gems*) menggunakan **AI Similarity Scoring**.

---

## 📱 Panduan Lengkap: Dari Awal Sampai Berhasil Konek di HP

Ikuti langkah demi langkah di bawah ini secara berurutan. Panduan ini dirancang agar **siapa pun bisa langsung mencoba dan berhasil connect ke HP**:

---

### Langkah 1: Persiapan Awal (Prasyarat)

1. **Di Laptop / Komputer:**
   - Pastikan sudah terpasang **Node.js** (versi 18, 20, atau 22 LTS).  
     👉 [Download Node.js](https://nodejs.org/) (pilih versi *LTS* lalu install seperti biasa).
   - Pastikan sudah terpasang **Git**.  
     👉 [Download Git](https://git-scm.com/).

2. **Di HP (Android atau iPhone):**
   - Buka Google Play Store atau Apple App Store, cari dan pasang aplikasi **Expo Go**:
     - [Expo Go untuk Android (Play Store)](https://play.google.com/store/apps/details?id=host.exp.exponent)
     - [Expo Go untuk iOS (App Store)](https://apps.apple.com/app/expo-go/id982107779)

---

### Langkah 2: Download Kode dari GitHub

Buka terminal di laptop Anda (**Git Bash**, **PowerShell**, atau **Command Prompt**), lalu jalankan perintah berikut:

```bash
# Clone langsung ke branch aplikasi mobile:
git clone -b feature/mobile-app https://github.com/anggadwiyana/Lokayana.git

# Masuk ke folder proyek:
cd Lokayana
```

> **Catatan Penting:** Kode aplikasi mobile berada di branch **`feature/mobile-app`**. Perintah `-b feature/mobile-app` di atas otomatis mengarahkan ke branch yang benar.

---

### Langkah 3: Install Dependensi

Masuk ke folder `apps/mobile` dan install dependensi yang dibutuhkan:

```bash
cd apps/mobile
npm install
```

*(Jika menggunakan Node.js versi sangat baru dan muncul pesan peer dependency, gunakan: `npm install --legacy-peer-deps`)*

---

### Langkah 4: Menjalankan Server Aplikasi

Pastikan Anda masih berada di folder `apps/mobile`, lalu jalankan:

```bash
npm start
```

Tunggu beberapa detik sampai terminal menampilkan **QR Code besar** bertuliskan *Metro Bundler*.

---

### Langkah 5: Menghubungkan ke HP (Connect)

Ada beberapa cara untuk menghubungkan HP ke aplikasi di laptop:

#### 🟢 Cara 1: Scan QR Code (Paling Umum & Cepat)
1. Pastikan **Laptop dan HP terhubung ke jaringan Wi-Fi yang sama** (misal: Wi-Fi rumah atau kosan).
2. **Jika menggunakan Android**:
   - Buka aplikasi **Expo Go**.
   - Ketuk menu **"Scan QR code"**.
   - Arahkan kamera ke QR Code yang ada di layar terminal laptop Anda.
3. **Jika menggunakan iPhone (iOS)**:
   - Buka aplikasi **Kamera** bawaan iPhone.
   - Arahkan ke QR Code di terminal laptop.
   - Ketuk notifikasi kuning bertuliskan **"Open in Expo Go"**.
4. Tunggu proses loading *JavaScript bundle* (sekitar 5–15 detik saat pertama kali dibuka). Aplikasi **Lokayana AI** akan langsung terbuka di HP Anda! 🎉

---

#### 🟡 Cara 2: Jika Wi-Fi Kampus/Kosan Tidak Bisa Konek (Mode Hotspot)
Seringkali Wi-Fi kampus atau kosan memiliki fitur keamanan (*AP Isolation*) yang memblokir komunikasi antar perangkat. Solusi termudahnya:
1. Nyalakan **Hotspot Pribadi (*Personal Hotspot*)** di HP Anda.
2. Hubungkan laptop Anda ke Hotspot HP tersebut.
3. Tekan <kbd>Ctrl</kbd> + <kbd>C</kbd> di terminal laptop untuk menghentikan server lama, lalu jalankan `npm start` kembali.
4. Scan ulang QR Code di aplikasi Expo Go.

---

#### 🔵 Cara 3: Mode Tunnel (Bisa Konek Beda Wi-Fi / Pakai Kuota Data HP)
Jika tidak berada di satu Wi-Fi dan ingin tetap connect dari mana saja (bahkan pakai kuota data seluler):
1. Di terminal laptop, jalankan perintah:
   ```bash
   npx expo start --tunnel
   ```
2. Scan QR Code yang dihasilkan. Mode tunnel ini menggunakan jaringan internet global sehingga HP pasti bisa tersambung ke laptop tanpa terhalang firewall/Wi-Fi lokal.

---

#### 🟣 Cara 4: Menggunakan Emulator Android Studio
Jika tidak memakai HP fisik dan ingin mencoba di emulator komputer:
1. Buka dan jalankan emulator di **Android Studio**.
2. Di terminal tempat `npm start` berjalan, tekan huruf <kbd>a</kbd> di keyboard. Aplikasi otomatis terpasang dan terbuka di emulator.

---

## 🧪 Panduan Menguji Fitur-Fitur AI di Aplikasi

Setelah aplikasi terbuka di HP, Anda bisa mencoba fitur-fiturnya:

1. **Uji Titik Awal (GPS & Peta Interaktif):**
   - Ketuk tombol **"Lokasi Saat Ini"** untuk mendeteksi koordinat Anda via GPS.
   - Atau ketuk tombol **"Pilih dari Peta"** untuk menggeser pin koordinat awal secara manual di peta Bali.
   - Anda juga bisa memilih preset spot populer seperti *Bandara Ngurah Rai*, *Kuta*, *Ubud*, atau *Sanur*.

2. **Uji Pemilihan Multi-Destinasi Wisata:**
   - Ketik nama tempat wisata di kolom pencarian (misal: *Tanah Lot*, *GWK*, *Kuta*, *Uluwatu*).
   - Ketuk tombol **`+ Tambah`** untuk memasukkan tempat tersebut ke daftar rute perjalanan Anda.
   - Anda bisa menambahkan 2, 3, hingga 8 tempat wisata sekaligus!

3. **Uji Optimasi Rute (Greedy TSP & OSRM):**
   - Ketuk tombol kuning besar: **"Rencanakan Rute Optimal (X Destinasi)"**.
   - Sistem AI akan otomatis mengurutkan destinasi agar tidak bolak-balik (titik terdekat dikunjungi lebih dulu).
   - Peta akan menampilkan jalur jalan nyata OSRM, pin bernomor urut `[1]`, `[2]`, `[3]`, dan estimasi waktu tempuh **Sepeda Motor vs Mobil**.

4. **Uji Logika Dual-Radius 15 km:**
   - Jika jarak total > 15 km: Peta otomatis memunculkan lingkaran **2 zona radius 15 km** (dekat titik awal dan dekat destinasi).
   - Jika jarak total ≤ 15 km: Peta memunculkan **1 radius 15 km gabungan**.

5. **Uji Rekomendasi AI Alternatif (*Hidden Gems*):**
   - Di bawah kartu rute, sistem menampilkan daftar tempat wisata alternatif serupa yang berada dalam koridor radius 15 km.
   - Ketuk kartu destinasi untuk melihat foto, rating, dan alasan kemiripan AI.
   - Terdapat tombol **"Jadikan Destinasi Tujuan"** untuk menukar destinasi dengan sekali sentuh.

---

## 🛠️ Tanya Jawab / Troubleshooting (FAQ)

* **Tanya: Di terminal muncul tulisan `Waiting on http://localhost:8081` tapi HP tidak connect / loading 0%?**  
  *Jawab:* Biasanya firewall Windows atau Wi-Fi Anda memblokir koneksi lokal. Solusi paling ampuh: jalankan `npx expo start --tunnel` di terminal, lalu scan kembali QR Code-nya.

* **Tanya: Apakah perlu Google Maps API Key atau bayar kartu kredit?**  
  *Jawab:* **Tidak perlu sama sekali!** Aplikasi ini sudah menggunakan peta **Esri World Street Map** dan OSRM API publik gratis, jadi 100% langsung jalan tanpa setup API key.

* **Tanya: Bagaimana cara me-reload aplikasi setelah ada perubahan kode?**  
  *Jawab:* Cukup tekan tombol <kbd>r</kbd> pada keyboard di terminal tempat `npm start` sedang berjalan.

---

## 👥 Pengembang & Lisensi
* **Angga Dwiyana** ([@anggadwiyana](https://github.com/anggadwiyana))
* Mata Kuliah: **Kecerdasan Buatan / Kecerdasan Tiruan** (Semester 3)
* Lisensi: MIT