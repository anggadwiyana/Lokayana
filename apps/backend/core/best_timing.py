"""
core/best_timing.py — Best Visit Timing Engine untuk Lokayana AI
================================================================
Menentukan waktu terbaik untuk mengunjungi setiap destinasi wisata Bali
berdasarkan kategori, nama, dan karakteristik spesifik destinasi.

Mendukung:
  - Deteksi slot waktu: Subuh (Sunrise), Pagi, Siang, Sore (Sunset), Malam
  - Override spesifik untuk spot ikonik (Sanur untuk Sunrise vs Tanah Lot untuk Sunset)
  - Alasan rekomendasi (kenapa harus jam tersebut) & waktu yang dihindari
  - Nilai numerik `time_order` untuk pengurutan kronologis pada algoritma A* TSP
"""

from __future__ import annotations

from typing import Any

# ---------------------------------------------------------------------------
# Slot Waktu Standar & Jam Representatif
# ---------------------------------------------------------------------------

TIME_SLOT_HOURS: dict[str, float] = {
    "Subuh": 6.0,   # 05:00 – 07:30 (Sunrise)
    "Pagi":  9.0,   # 07:30 – 11:30 (Sejuk, sepi, air terjun/pura/alam)
    "Siang": 12.5,  # 11:30 – 14:30 (Museum, galeri, indoor, kuliner)
    "Sore":  16.5,  # 15:00 – 18:30 (Sunset, golden hour tebing & pura laut)
    "Malam": 19.5,  # 18:30 – 21:30 (Pertunjukan tari, pasar malam, dinner)
}

# ---------------------------------------------------------------------------
# Default Best Timing per Kategori Wisata Bali
# ---------------------------------------------------------------------------

CATEGORY_TIMING: dict[str, dict[str, Any]] = {
    "Pantai": {
        "best_time": "Sore",
        "window": "15:30 – 18:30",
        "icon": "🌅",
        "reason": "Cahaya sunset keemasan, suhu lebih sejuk & pemandangan senja",
        "avoid": "Tengah hari (11:00 – 14:00, pasir sangat panas & terik)",
    },
    "Pura": {
        "best_time": "Pagi",
        "window": "07:30 – 10:30",
        "icon": "🛕",
        "reason": "Suasana sakral, sejuk & hening sebelum ramai rombongan turis",
        "avoid": "Siang hari (terik & antrean berfoto panjang)",
    },
    "Air Terjun": {
        "best_time": "Pagi",
        "window": "08:00 – 11:00",
        "icon": "💧",
        "reason": "Debit air jernih, cahaya sinar matahari masuk celah hutan & trek sejuk",
        "avoid": "Sore hari (risiko hujan pegunungan & jalur trekking licin/gelap)",
    },
    "Bukit & Tebing": {
        "best_time": "Pagi",
        "window": "06:30 – 09:30",
        "icon": "⛰️",
        "reason": "Udara pegunungan jernih, kabut tipis & belum terik di tebing terbuka",
        "avoid": "Siang hari (sangat terik tanpa peneduh di puncak tebing)",
    },
    "Hutan & Alam": {
        "best_time": "Pagi",
        "window": "07:30 – 10:30",
        "icon": "🌿",
        "reason": "Satwa lebih aktif, udara hutan segar & daun basah embun pagi",
        "avoid": "Siang hari (hewan berteduh/pasif) atau sore (mulai lembap & gelap)",
    },
    "Danau & Sungai": {
        "best_time": "Pagi",
        "window": "07:30 – 11:00",
        "icon": "🏞️",
        "reason": "Permukaan danau tenang tanpa ombak angin & pantulan pemandangan jernih",
        "avoid": "Sore (sering turun hujan/kabut tebal di kawasan danau Bali)",
    },
    "Rekreasi & Taman": {
        "best_time": "Pagi",
        "window": "09:00 – 12:00",
        "icon": "🎡",
        "reason": "Wahana baru buka, belum padat antrean & energi masih maksimal",
        "avoid": "Siang terik atau sore akhir pekan (sangat padat antrean)",
    },
    "Budaya & Museum": {
        "best_time": "Siang",
        "window": "11:00 – 14:30",
        "icon": "🏛️",
        "reason": "Ruangan indoor ber-AC/teduh, waktu tepat menghindari panas luar",
        "avoid": "Pagi terlalu awal (banyak yang baru buka pukul 09:00-10:00)",
    },
    "Patung & Monumen": {
        "best_time": "Sore",
        "window": "15:00 – 18:00",
        "icon": "🗿",
        "reason": "Golden hour pencahayaan memantul di patung & angin sore nyaman untuk jalan kaki",
        "avoid": "Siang hari (pelataran monumen terbuka sangat panas terpapar matahari)",
    },
}

DEFAULT_TIMING: dict[str, Any] = {
    "best_time": "Pagi",
    "window": "08:00 – 11:00",
    "icon": "☀️",
    "reason": "Waktu pagi umumnya ideal untuk menikmati aktivitas wisata Bali",
    "avoid": "Tengah hari saat matahari paling terik",
}

# ---------------------------------------------------------------------------
# Database Spesifik Override: Tempat Wisata dengan Karakteristik Waktu Khusus
# ---------------------------------------------------------------------------

DESTINATION_OVERRIDES: dict[str, dict[str, Any]] = {
    # ── PANTAI KHUSUS SUNRISE (Pesisir Timur & Utara Bali) ───────────────────
    "sanur": {
        "best_time": "Subuh",
        "window": "05:30 – 07:30",
        "icon": "🌄",
        "reason": "Spot sunrise paling ikonik di Bali menghadap timur dengan siluet perahu jukung",
        "avoid": "Sore hari (matahari terbenam di belakang daratan, pemandangan datar)",
    },
    "padang galak": {
        "best_time": "Subuh",
        "window": "05:30 – 07:30",
        "icon": "🌄",
        "reason": "Sunrise dramatis dengan deburan ombak dan siluet pulau Nusa Penida",
        "avoid": "Siang atau sore (matahari di belakang daratan)",
    },
    "matahari terbit": {
        "best_time": "Subuh",
        "window": "05:30 – 07:00",
        "icon": "🌄",
        "reason": "Sesuai namanya, lokasi utama melihat matahari terbit pertama di pesisir Sanur",
        "avoid": "Sore",
    },
    "amed": {
        "best_time": "Subuh",
        "window": "05:30 – 08:00",
        "icon": "🌄",
        "reason": "Matahari terbit menakjubkan dengan latar Gunung Agung megah di timur Bali",
        "avoid": "Sore hari (angin laut timur kencang)",
    },
    "candidasa": {
        "best_time": "Subuh",
        "window": "05:45 – 07:30",
        "icon": "🌄",
        "reason": "Sunrise hening di pesisir Karangasem dengan kolam teratai",
        "avoid": "Siang hari",
    },
    "pantai lebih": {
        "best_time": "Subuh",
        "window": "05:30 – 07:30",
        "icon": "🌄",
        "reason": "Sunrise pasir hitam Gianyar sambil menikmati sarapan sate lilit ikan segar",
        "avoid": "Sore hari",
    },
    "jasri": {
        "best_time": "Subuh",
        "window": "05:30 – 07:30",
        "icon": "🌄",
        "reason": "Pantai sepi Karangasem dengan panorama matahari terbit jernih",
        "avoid": "Siang hari",
    },
    "lovina": {
        "best_time": "Subuh",
        "window": "05:30 – 07:30",
        "icon": "🐬",
        "reason": "Tur perahu lumba-lumba liar di laut tenang bersamaan dengan terbitnya matahari",
        "avoid": "Siang & sore (lumba-lumba sudah menyelam ke laut dalam)",
    },

    # ── PANTAI KHUSUS SUNSET IKONIK (Pesisir Barat & Selatan Bali) ───────────
    "tanah lot": {
        "best_time": "Sore",
        "window": "16:00 – 18:30",
        "icon": "🌅",
        "reason": "Siluet pura di atas batu karang saat sunset adalah salah satu ikon terindah dunia",
        "avoid": "Pagi hari (kurang dramatis & air pasang belum pas untuk siluet)",
    },
    "uluwatu": {
        "best_time": "Sore",
        "window": "16:30 – 19:00",
        "icon": "🌅",
        "reason": "Sunset spektakuler dari atas tebing 70 meter dipadu pertunjukan Tari Kecak jam 18:00",
        "avoid": "Pagi atau siang (panas menyengat di tebing dan belum ada tari kecak)",
    },
    "kuta": {
        "best_time": "Sore",
        "window": "16:00 – 18:30",
        "icon": "🌅",
        "reason": "Sunset klasik pantai pasir landai Kuta dengan garis pantai membentang luas",
        "avoid": "Tengah hari (11:00 – 14:00, pasir sangat panas & menyilaukan)",
    },
    "seminyak": {
        "best_time": "Sore",
        "window": "16:30 – 18:30",
        "icon": "🌅",
        "reason": "Atmosfer sunset santai di beanbag tepi pantai sambil mendengarkan musik senja",
        "avoid": "Siang hari",
    },
    "canggu": {
        "best_time": "Sore",
        "window": "16:00 – 18:30",
        "icon": "🌅",
        "reason": "Sunset selancar & nongkrong di beach club pinggir pantai Canggu",
        "avoid": "Tengah hari",
    },
    "batu bolong": {
        "best_time": "Sore",
        "window": "16:00 – 18:30",
        "icon": "🌅",
        "reason": "Sunset memukau dengan siluet pura karang berlubang Batu Bolong",
        "avoid": "Pagi hari",
    },
    "echo beach": {
        "best_time": "Sore",
        "window": "16:30 – 18:30",
        "icon": "🌅",
        "reason": "Pemandangan sunset para peselancar dan restoran tepi karang",
        "avoid": "Pagi hari",
    },
    "jimbaran": {
        "best_time": "Sore",
        "window": "17:00 – 19:30",
        "icon": "🦐",
        "reason": "Sensasi makan malam seafood bakar di atas pasir tepat saat matahari tenggelam",
        "avoid": "Siang hari (sebagian besar restoran seafood tepi pantai baru buka sore)",
    },
    "balangan": {
        "best_time": "Sore",
        "window": "16:00 – 18:30",
        "icon": "🌅",
        "reason": "Tebing Balangan menyajikan sudut pandang sunset terbaik ke samudra lepas",
        "avoid": "Tengah hari",
    },
    "suluban": {
        "best_time": "Sore",
        "window": "15:30 – 18:30",
        "icon": "🌅",
        "reason": "Gua karang dramatis pintu masuk peselancar dengan pemandangan sunset dari tebing",
        "avoid": "Pagi hari",
    },
    "bingin": {
        "best_time": "Sore",
        "window": "15:30 – 18:30",
        "icon": "🌅",
        "reason": "Sunset intim di pantai tebing kapur dengan deretan warung kayu bohemian",
        "avoid": "Siang hari (turun-naik ratusan anak tangga saat panas sangat menguras tenaga)",
    },
    "dreamland": {
        "best_time": "Sore",
        "window": "16:00 – 18:30",
        "icon": "🌅",
        "reason": "Ombak besar dan matahari terbenam tanpa halangan di ufuk barat",
        "avoid": "Siang terik",
    },
    "pandawa": {
        "best_time": "Pagi",
        "window": "08:00 – 11:00",
        "icon": "🌊",
        "reason": "Tebing kapur terbelah lebih sejuk & air laut biru toska jernih untuk kano di pagi hari",
        "avoid": "Sore hari (sunset terhalang tebing karang di sisi barat)",
    },
    "melasti": {
        "best_time": "Sore",
        "window": "15:30 – 18:30",
        "icon": "🌅",
        "reason": "Jalan berliku di tebing kapur spektakuler & sunset view di beach club tepi laut",
        "avoid": "Siang hari (aspal dan tebing putih memantulkan panas ekstrem)",
    },

    # ── GUNUNG & TREKKING SUNRISE ────────────────────────────────────────────
    "batur": {
        "best_time": "Subuh",
        "window": "04:30 – 07:30",
        "icon": "🌋",
        "reason": "Trekking sunrise Gunung Batur di atas lautan awan — salah satu aktivitas terbaik Bali",
        "avoid": "Siang hari (berkabut tebal, tidak ada pemandangan & jalur berpasir panas)",
    },
    "kintamani": {
        "best_time": "Pagi",
        "window": "07:00 – 10:30",
        "icon": "☕",
        "reason": "Menikmati kopi di kafe tebing dengan panorama kaldera Gunung & Danau Batur jernih",
        "avoid": "Siang & sore (hampir selalu turun kabut tebal dan hujan)",
    },
    "agung": {
        "best_time": "Subuh",
        "window": "05:00 – 07:30",
        "icon": "⛰️",
        "reason": "Puncak tertinggi Bali — pemandangan fajar ke seluruh penjuru pulau",
        "avoid": "Siang",
    },
    "campuhan": {
        "best_time": "Pagi",
        "window": "06:00 – 08:30",
        "icon": "🌾",
        "reason": "Campuhan Ridge Walk Ubud sejuk berkabut di antara lembah hijau di pagi hari",
        "avoid": "Siang hari (jalur punggung bukit terbuka total tanpa naungan pohon)",
    },

    # ── PURA BERSEJARAH & SPIRITUAL ──────────────────────────────────────────
    "besakih": {
        "best_time": "Pagi",
        "window": "07:30 – 10:30",
        "icon": "🛕",
        "reason": "Pura Ibu terbesar di lereng Gunung Agung masih jernih terlihat sebelum tertutup kabut",
        "avoid": "Siang & sore (kawasan pegunungan sering mendung & gerimis)",
    },
    "lempuyang": {
        "best_time": "Pagi",
        "window": "06:00 – 09:00",
        "icon": "🛕",
        "reason": "Gerbang Surga (Gate of Heaven) dengan latar Gunung Agung cerah & antrean foto belum berjam-jam",
        "avoid": "Siang hari (antrean foto bisa mencapai 3-4 jam dan gunung tertutup kabut)",
    },
    "tirta empul": {
        "best_time": "Pagi",
        "window": "07:30 – 09:30",
        "icon": "🛕",
        "reason": "Ritual melukat (penyucian diri) paling sakral, hening dan air pancuran masih sangat segar",
        "avoid": "Siang hari (kolam sangat ramai antre wisatawan)",
    },
    "ulun danu": {
        "best_time": "Pagi",
        "window": "07:30 – 10:00",
        "icon": "🛕",
        "reason": "Pura di atas Danau Beratan dengan kabut magis tipis dan air tenang seperti cermin",
        "avoid": "Siang/sore (kawasan Bedugul hampir selalu diguyur hujan gerimis di sore hari)",
    },
    "beratan": {
        "best_time": "Pagi",
        "window": "07:30 – 10:00",
        "icon": "🛕",
        "reason": "Danau Beratan sejuk dan tenang di pagi hari sebelum kabut tebal turun",
        "avoid": "Sore hari",
    },
    "taman ayun": {
        "best_time": "Pagi",
        "window": "08:00 – 10:30",
        "icon": "🛕",
        "reason": "Puri Mengwi dengan kanal air terawat indah saat terpapar sinar matahari pagi lembut",
        "avoid": "Siang hari",
    },
    "goa gajah": {
        "best_time": "Pagi",
        "window": "08:00 – 10:30",
        "icon": "🛕",
        "reason": "Situs purbakala abad ke-11 sejuk dan nyaman dijelajahi di pagi hari",
        "avoid": "Siang hari",
    },

    # ── AIR TERJUN SPESIFIK ──────────────────────────────────────────────────
    "tukad cepung": {
        "best_time": "Pagi",
        "window": "08:30 – 11:00",
        "icon": "✨",
        "reason": "Fenomena 'Sinar Dewa' (cahaya matahari menembus atap gua) HANYA terjadi jam 09:00–11:00!",
        "avoid": "Sore hari (cahaya tidak masuk gua & jalur aliran sungai gelap)",
    },
    "tegenungan": {
        "best_time": "Pagi",
        "window": "07:30 – 09:30",
        "icon": "💧",
        "reason": "Bebas dari keramaian turis & udara lembah Ubud masih sangat segar",
        "avoid": "Siang hari (sangat ramai bus tur)",
    },
    "gitgit": {
        "best_time": "Pagi",
        "window": "08:00 – 11:00",
        "icon": "💧",
        "reason": "Air terjun tertinggi Bali utara dalam kondisi debit paling bersih dan segar",
        "avoid": "Sore hari (jalur tangga licin berkabut)",
    },
    "sekumpul": {
        "best_time": "Pagi",
        "window": "07:30 – 11:00",
        "icon": "💧",
        "reason": "Trekking 7 air terjun membutuhkan stamina penuh di pagi yang sejuk",
        "avoid": "Siang & sore (trekking berat saat panas atau hujan)",
    },
    "nungnung": {
        "best_time": "Pagi",
        "window": "08:00 – 11:00",
        "icon": "💧",
        "reason": "500 anak tangga lebih nyaman dituruni dan didaki saat udara masih sejuk",
        "avoid": "Siang hari",
    },
    "tibumana": {
        "best_time": "Pagi",
        "window": "08:00 – 10:30",
        "icon": "💧",
        "reason": "Kolam alami tenang dan jernih seperti kolam renang pribadi di pagi hari",
        "avoid": "Sore hari",
    },

    # ── SAWAH & AGROWISATA ───────────────────────────────────────────────────
    "tegalalang": {
        "best_time": "Pagi",
        "window": "07:00 – 09:30",
        "icon": "🌾",
        "reason": "Sinar matahari pagi menembus terasering sawah Ubud tanpa bayangan keras & sepi",
        "avoid": "Siang & sore (sangat padat bus turis & arah cahaya backlit)",
    },
    "jatiluwih": {
        "best_time": "Pagi",
        "window": "07:30 – 10:30",
        "icon": "🌾",
        "reason": "Terasering sawah UNESCO terluas dengan pemandangan Gunung Batukaru yang cerah",
        "avoid": "Siang hari",
    },
    "monkey forest": {
        "best_time": "Pagi",
        "window": "08:30 – 10:30",
        "icon": "🐒",
        "reason": "Kera Ubud masih tenang & aktif bermain di bawah pohon rindang sebelum cuaca memanas",
        "avoid": "Siang hari (kera cenderung berteduh dan sensitif saat gerah)",
    },

    # ── MONUMEN & ATRAKSI SORE/MALAM ─────────────────────────────────────────
    "gwk": {
        "best_time": "Sore",
        "window": "15:30 – 18:30",
        "icon": "🗿",
        "reason": "Patung GWK tampak megah saat golden hour dan berlanjut ke pertunjukan tari sore",
        "avoid": "Tengah hari (kawasan plaza batu kapur raksasa sangat panas menyengat)",
    },
    "garuda wisnu kencana": {
        "best_time": "Sore",
        "window": "15:30 – 18:30",
        "icon": "🗿",
        "reason": "Pencahayaan sore hari terbaik untuk foto arsitektur raksasa dan atraksi budaya",
        "avoid": "Tengah hari",
    },
    "bajra sandhi": {
        "best_time": "Sore",
        "window": "15:30 – 18:00",
        "icon": "🏛️",
        "reason": "Lapangan Renon sejuk di sore hari dan monumen tampak megah disinari senja",
        "avoid": "Siang hari",
    },
    "puri ubud": {
        "best_time": "Malam",
        "window": "18:30 – 21:00",
        "icon": "🎭",
        "reason": "Pertunjukan seni tari Legong / Barong tradisional Bali dipentaskan malam hari di panggung istana",
        "avoid": "Siang (istana hanya berupa bangunan kosong tanpa pentas tari)",
    },
    "pasar senggol": {
        "best_time": "Malam",
        "window": "18:30 – 21:30",
        "icon": "🍲",
        "reason": "Pasar kuliner malam autentik khas Bali buka penuh setelah matahari terbenam",
        "avoid": "Siang hari (belum buka)",
    },
}

# ---------------------------------------------------------------------------
# Fungsi Lookup & Parser
# ---------------------------------------------------------------------------


def get_best_timing(destination: dict[str, Any]) -> dict[str, Any]:
    """
    Menentukan waktu terbaik (best timing) untuk sebuah destinasi wisata Bali.

    Prioritas pencarian:
      1. Pencocokan keyword nama pada DESTINATION_OVERRIDES
      2. Kategori destinasi pada CATEGORY_TIMING
      3. DEFAULT_TIMING sebagai fallback

    Args:
        destination (dict[str, Any]): Data destinasi dengan key 'name' dan 'category'.

    Returns:
        dict[str, Any]: Objek best timing berisi:
            - best_time (str): "Subuh" | "Pagi" | "Siang" | "Sore" | "Malam"
            - window (str): Rentang jam rekomendasi (mis. "16:00 – 18:30")
            - icon (str): Emoji waktu
            - reason (str): Alasan mengapa waktu ini terbaik
            - avoid (str): Waktu yang sebaiknya dihindari
            - time_order (float): Nilai jam kronologis untuk pengurutan A* TSP
    """
    if isinstance(destination, str):
        destination = {"name": destination}

    name = str(destination.get("name", "")).lower()
    category = str(destination.get("category", ""))

    timing_info: dict[str, Any] | None = None

    # 1. Cek override spesifik berdasarkan nama tempat
    for keyword, override in DESTINATION_OVERRIDES.items():
        if keyword in name:
            timing_info = dict(override)
            break

    # 2. Cek kategori jika tidak ada override nama
    if timing_info is None:
        timing_info = dict(CATEGORY_TIMING.get(category, DEFAULT_TIMING))

    # 3. Sertakan time_order untuk evaluasi algoritma A*
    best_time_slot = timing_info.get("best_time", "Pagi")
    timing_info["time_order"] = TIME_SLOT_HOURS.get(best_time_slot, 9.0)

    return timing_info

