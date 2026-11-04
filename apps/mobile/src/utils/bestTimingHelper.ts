/**
 * bestTimingHelper.ts — Engine Best Timing Kunjungan Wisata Bali (Frontend)
 * =========================================================================
 * Selaras dengan `apps/backend/core/best_timing.py`.
 *
 * Menentukan waktu kunjungan terbaik untuk setiap destinasi wisata Bali:
 *   - Subuh (Sunrise): Sanur, Amed, Batur, Lovina, dll.
 *   - Pagi: Pura Besakih, Lempuyang, Tukad Cepung, Sekumpul, Tegalalang, dll.
 *   - Siang: Museum, Galeri Seni, Tempat Kuliner & Belanja.
 *   - Sore (Sunset): Tanah Lot, Uluwatu, Kuta, Seminyak, Canggu, Jimbaran, GWK, dll.
 *   - Malam: Pertunjukan tari Puri Ubud, Pasar Senggol Gianyar.
 */

import type { BestTiming, Destination } from '../types';

export const TIME_SLOT_HOURS: Record<string, number> = {
  Subuh: 6.0,  // 05:00 – 07:30
  Pagi: 9.0,   // 07:30 – 11:30
  Siang: 12.5, // 11:30 – 14:30
  Sore: 16.5,  // 15:00 – 18:30
  Malam: 19.5, // 18:30 – 21:30
};

export const CATEGORY_TIMING: Record<string, Omit<BestTiming, 'time_order'>> = {
  Pantai: {
    best_time: 'Sore',
    window: '15:30 – 18:30',
    icon: '🌅',
    reason: 'Cahaya sunset keemasan & suhu sejuk untuk menikmati senja tepi laut',
    avoid: 'Tengah hari (11:00 – 14:00, pasir sangat panas & terik menyengat)',
  },
  Pura: {
    best_time: 'Pagi',
    window: '07:30 – 10:30',
    icon: '🛕',
    reason: 'Suasana sakral, sejuk & hening sebelum ramai rombongan turis',
    avoid: 'Siang hari (terik & antrean berfoto panjang)',
  },
  'Air Terjun': {
    best_time: 'Pagi',
    window: '08:00 – 11:00',
    icon: '💧',
    reason: 'Debit air jernih & cahaya sinar matahari alami menembus celah hutan',
    avoid: 'Sore hari (risiko hujan pegunungan & jalur trekking licin)',
  },
  'Bukit & Tebing': {
    best_time: 'Pagi',
    window: '06:30 – 09:30',
    icon: '⛰️',
    reason: 'Udara pegunungan segar, horizon jernih & belum terik di tebing terbuka',
    avoid: 'Siang hari (sangat panas tanpa peneduh di puncak tebing)',
  },
  'Hutan & Alam': {
    best_time: 'Pagi',
    window: '07:30 – 10:30',
    icon: '🌿',
    reason: 'Satwa lebih aktif, udara hutan segar & daun basah embun pagi',
    avoid: 'Siang hari (hewan berteduh) atau sore (mulai lembap & gelap)',
  },
  'Danau & Sungai': {
    best_time: 'Pagi',
    window: '07:30 – 11:00',
    icon: '🏞️',
    reason: 'Permukaan danau tenang tanpa ombak angin & pantulan jernih',
    avoid: 'Sore (sering turun hujan/kabut tebal di kawasan danau Bali)',
  },
  'Rekreasi & Taman': {
    best_time: 'Pagi',
    window: '09:00 – 12:00',
    icon: '🎡',
    reason: 'Wahana baru buka, belum padat antrean & energi masih maksimal',
    avoid: 'Siang terik atau sore akhir pekan (sangat padat antrean)',
  },
  'Budaya & Museum': {
    best_time: 'Siang',
    window: '11:00 – 14:30',
    icon: '🏛️',
    reason: 'Ruangan indoor teduh/ber-AC, waktu tepat menghindari panas luar',
    avoid: 'Pagi terlalu awal (banyak museum baru buka pukul 09:00/10:00)',
  },
  'Patung & Monumen': {
    best_time: 'Sore',
    window: '15:00 – 18:00',
    icon: '🗿',
    reason: 'Golden hour memantul di patung & angin sore nyaman untuk jalan kaki',
    avoid: 'Siang hari (pelataran terbuka sangat panas terpapar matahari)',
  },
};

export const DEFAULT_TIMING: Omit<BestTiming, 'time_order'> = {
  best_time: 'Pagi',
  window: '08:00 – 11:00',
  icon: '☀️',
  reason: 'Waktu pagi umumnya ideal untuk menikmati aktivitas wisata Bali',
  avoid: 'Tengah hari saat matahari paling terik',
};

export const DESTINATION_OVERRIDES: Record<string, Omit<BestTiming, 'time_order'>> = {
  // ── PANTAI SUNRISE (Pesisir Timur & Utara) ──
  sanur: {
    best_time: 'Subuh',
    window: '05:30 – 07:30',
    icon: '🌄',
    reason: 'Spot sunrise paling ikonik di Bali menghadap timur dengan siluet perahu jukung',
    avoid: 'Sore hari (matahari terbenam di belakang daratan)',
  },
  'padang galak': {
    best_time: 'Subuh',
    window: '05:30 – 07:30',
    icon: '🌄',
    reason: 'Sunrise dramatis dengan deburan ombak dan siluet pulau Nusa Penida',
    avoid: 'Siang atau sore',
  },
  'matahari terbit': {
    best_time: 'Subuh',
    window: '05:30 – 07:00',
    icon: '🌄',
    reason: 'Lokasi utama melihat matahari terbit pertama di pesisir Sanur',
    avoid: 'Sore',
  },
  amed: {
    best_time: 'Subuh',
    window: '05:30 – 08:00',
    icon: '🌄',
    reason: 'Sunrise menakjubkan dengan latar Gunung Agung megah di timur Bali',
    avoid: 'Sore hari (angin laut timur kencang)',
  },
  candidasa: {
    best_time: 'Subuh',
    window: '05:45 – 07:30',
    icon: '🌄',
    reason: 'Sunrise hening di pesisir Karangasem dengan kolam teratai',
    avoid: 'Siang hari',
  },
  'pantai lebih': {
    best_time: 'Subuh',
    window: '05:30 – 07:30',
    icon: '🌄',
    reason: 'Sunrise pasir hitam Gianyar sambil menikmati sarapan sate lilit ikan segar',
    avoid: 'Sore hari',
  },
  jasri: {
    best_time: 'Subuh',
    window: '05:30 – 07:30',
    icon: '🌄',
    reason: 'Pantai sepi Karangasem dengan panorama matahari terbit jernih',
    avoid: 'Siang hari',
  },
  lovina: {
    best_time: 'Subuh',
    window: '05:30 – 07:30',
    icon: '🐬',
    reason: 'Tur perahu lumba-lumba liar di laut tenang bersamaan dengan terbitnya matahari',
    avoid: 'Siang & sore (lumba-lumba sudah menyelam ke laut dalam)',
  },

  // ── PANTAI SUNSET IKONIK ──
  'tanah lot': {
    best_time: 'Sore',
    window: '16:00 – 18:30',
    icon: '🌅',
    reason: 'Siluet pura di atas batu karang saat sunset adalah salah satu ikon terindah dunia',
    avoid: 'Pagi hari (kurang dramatis & siluet belum terbentuk)',
  },
  uluwatu: {
    best_time: 'Sore',
    window: '16:30 – 19:00',
    icon: '🌅',
    reason: 'Sunset tebing karang 70 meter dipadu pertunjukan Tari Kecak jam 18:00',
    avoid: 'Pagi atau siang (panas menyengat di tebing dan belum ada tari kecak)',
  },
  kuta: {
    best_time: 'Sore',
    window: '16:00 – 18:30',
    icon: '🌅',
    reason: 'Sunset klasik pantai pasir landai Kuta dengan garis pantai membentang luas',
    avoid: 'Tengah hari (11:00 – 14:00, pasir sangat panas)',
  },
  seminyak: {
    best_time: 'Sore',
    window: '16:30 – 18:30',
    icon: '🌅',
    reason: 'Atmosfer sunset santai di beanbag tepi pantai sambil menikmati musik senja',
    avoid: 'Siang hari',
  },
  canggu: {
    best_time: 'Sore',
    window: '16:00 – 18:30',
    icon: '🌅',
    reason: 'Sunset selancar & nongkrong di beach club pinggir pantai Canggu',
    avoid: 'Tengah hari',
  },
  'batu bolong': {
    best_time: 'Sore',
    window: '16:00 – 18:30',
    icon: '🌅',
    reason: 'Sunset memukau dengan siluet pura karang berlubang Batu Bolong',
    avoid: 'Pagi hari',
  },
  'echo beach': {
    best_time: 'Sore',
    window: '16:30 – 18:30',
    icon: '🌅',
    reason: 'Pemandangan sunset para peselancar dan kafe tepi karang',
    avoid: 'Pagi hari',
  },
  jimbaran: {
    best_time: 'Sore',
    window: '17:00 – 19:30',
    icon: '🦐',
    reason: 'Sensasi makan malam seafood bakar di atas pasir tepat saat matahari tenggelam',
    avoid: 'Siang hari (restoran seafood pantai baru buka menjelang sore)',
  },
  balangan: {
    best_time: 'Sore',
    window: '16:00 – 18:30',
    icon: '🌅',
    reason: 'Tebing Balangan menyajikan sudut pandang sunset terbaik ke samudra lepas',
    avoid: 'Tengah hari',
  },
  suluban: {
    best_time: 'Sore',
    window: '15:30 – 18:30',
    icon: '🌅',
    reason: 'Gua karang dramatis pintu masuk surfer dengan pemandangan sunset dari tebing',
    avoid: 'Pagi hari',
  },
  bingin: {
    best_time: 'Sore',
    window: '15:30 – 18:30',
    icon: '🌅',
    reason: 'Sunset intim di pantai tebing kapur dengan deretan warung kayu bohemian',
    avoid: 'Siang hari (turun-naik anak tangga sangat menguras tenaga saat panas)',
  },
  dreamland: {
    best_time: 'Sore',
    window: '16:00 – 18:30',
    icon: '🌅',
    reason: 'Ombak besar dan matahari terbenam tanpa halangan di ufuk barat',
    avoid: 'Siang terik',
  },
  pandawa: {
    best_time: 'Pagi',
    window: '08:00 – 11:00',
    icon: '🌊',
    reason: 'Tebing kapur terbelah lebih sejuk & air laut biru toska jernih untuk kano di pagi hari',
    avoid: 'Sore hari (sunset terhalang tebing karang di sisi barat)',
  },
  melasti: {
    best_time: 'Sore',
    window: '15:30 – 18:30',
    icon: '🌅',
    reason: 'Jalan tebing kapur spektakuler & sunset view di beach club tepi laut',
    avoid: 'Siang hari (aspal dan tebing memantulkan panas ekstrem)',
  },

  // ── GUNUNG & TREKKING SUNRISE ──
  batur: {
    best_time: 'Subuh',
    window: '04:30 – 07:30',
    icon: '🌋',
    reason: 'Trekking sunrise Gunung Batur di atas lautan awan — ikonik di Bali',
    avoid: 'Siang hari (berkabut tebal, tidak ada pemandangan)',
  },
  kintamani: {
    best_time: 'Pagi',
    window: '07:00 – 10:30',
    icon: '☕',
    reason: 'Menikmati kopi di kafe tebing dengan panorama kaldera Batur jernih',
    avoid: 'Siang & sore (hampir selalu turun kabut tebal dan hujan)',
  },
  campuhan: {
    best_time: 'Pagi',
    window: '06:00 – 08:30',
    icon: '🌾',
    reason: 'Campuhan Ridge Walk Ubud sejuk berkabut di antara lembah hijau di pagi hari',
    avoid: 'Siang hari (jalur punggung bukit terbuka total tanpa naungan pohon)',
  },

  // ── PURA BERSEJARAH ──
  besakih: {
    best_time: 'Pagi',
    window: '07:30 – 10:30',
    icon: '🛕',
    reason: 'Pura Ibu terbesar di lereng Gunung Agung masih jernih sebelum tertutup kabut',
    avoid: 'Siang & sore (kawasan pegunungan sering mendung & gerimis)',
  },
  lempuyang: {
    best_time: 'Pagi',
    window: '06:00 – 09:00',
    icon: '🛕',
    reason: 'Gerbang Surga dengan latar Gunung Agung cerah & antrean foto belum berjam-jam',
    avoid: 'Siang hari (antrean foto bisa 3-4 jam dan gunung tertutup kabut)',
  },
  'tirta empul': {
    best_time: 'Pagi',
    window: '07:30 – 09:30',
    icon: '🛕',
    reason: 'Ritual melukat paling sakral, hening dan air pancuran masih sangat segar',
    avoid: 'Siang hari (kolam sangat ramai antrean wisatawan)',
  },
  'ulun danu': {
    best_time: 'Pagi',
    window: '07:30 – 10:00',
    icon: '🛕',
    reason: 'Pura di atas Danau Beratan dengan kabut magis tipis dan air tenang',
    avoid: 'Siang/sore (Bedugul hampir selalu diguyur gerimis di sore hari)',
  },

  // ── AIR TERJUN ──
  'tukad cepung': {
    best_time: 'Pagi',
    window: '08:30 – 11:00',
    icon: '✨',
    reason: 'Fenomena Sinar Dewa (cahaya matahari menembus atap gua) HANYA terjadi jam 09:00–11:00!',
    avoid: 'Sore hari (cahaya tidak masuk gua & aliran sungai gelap)',
  },
  tegenungan: {
    best_time: 'Pagi',
    window: '07:30 – 09:30',
    icon: '💧',
    reason: 'Bebas dari keramaian turis & udara lembah Ubud masih sangat segar',
    avoid: 'Siang hari (sangat ramai bus tur)',
  },
  gitgit: {
    best_time: 'Pagi',
    window: '08:00 – 11:00',
    icon: '💧',
    reason: 'Air terjun tertinggi Bali utara dalam kondisi debit paling bersih dan segar',
    avoid: 'Sore hari (jalur tangga licin berkabut)',
  },

  // ── ATRAKSI LAIN ──
  gwk: {
    best_time: 'Sore',
    window: '15:30 – 18:30',
    icon: '🗿',
    reason: 'Patung GWK tampak megah saat golden hour dan berlanjut ke pertunjukan tari sore',
    avoid: 'Tengah hari (pelataran plaza batu kapur raksasa sangat terik menyengat)',
  },
  'garuda wisnu kencana': {
    best_time: 'Sore',
    window: '15:30 – 18:30',
    icon: '🗿',
    reason: 'Pencahayaan sore hari terbaik untuk foto arsitektur raksasa dan atraksi budaya',
    avoid: 'Tengah hari',
  },
  'monkey forest': {
    best_time: 'Pagi',
    window: '08:30 – 10:30',
    icon: '🐒',
    reason: 'Kera Ubud masih tenang & aktif bermain di bawah pohon rindang sebelum panas',
    avoid: 'Siang hari (kera cenderung berteduh dan sensitif saat gerah)',
  },
  tegalalang: {
    best_time: 'Pagi',
    window: '07:00 – 09:30',
    icon: '🌾',
    reason: 'Sinar matahari pagi menembus terasering sawah Ubud tanpa bayangan keras & sepi',
    avoid: 'Siang & sore (sangat padat bus turis & arah cahaya backlit)',
  },
  'puri ubud': {
    best_time: 'Malam',
    window: '18:30 – 21:00',
    icon: '🎭',
    reason: 'Pertunjukan tari Legong/Barong tradisional Bali dipentaskan malam hari di istana',
    avoid: 'Siang (hanya bangunan kosong tanpa pentas tari)',
  },
};

// ── KONSTANTA BATAS JAM PER SLOT ───────────────────────────────────────────
// Slot dianggap "ideal" jika jam saat ini berada dalam rentang ini.
// Slot dianggap "sudah lewat" jika jam saat ini sudah melewati upper bound + 1 jam grace.
const TIME_SLOT_BOUNDS: Record<string, { lower: number; upper: number }> = {
  Subuh: { lower: 4.5,  upper: 7.5  },  // 04:30 – 07:30
  Pagi:  { lower: 7.5,  upper: 11.5 },  // 07:30 – 11:30
  Siang: { lower: 11.5, upper: 15.0 },  // 11:30 – 15:00
  Sore:  { lower: 15.0, upper: 18.5 },  // 15:00 – 18:30
  Malam: { lower: 18.5, upper: 22.0 },  // 18:30 – 22:00
};

/**
 * Mengembalikan slot waktu saat ini berdasarkan jam perangkat.
 * @returns 'Subuh' | 'Pagi' | 'Siang' | 'Sore' | 'Malam'
 */
export function getCurrentTimeSlot(): string {
  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  if (hour < 7.5)  return 'Subuh';
  if (hour < 11.5) return 'Pagi';
  if (hour < 15.0) return 'Siang';
  if (hour < 18.5) return 'Sore';
  return 'Malam';
}

/**
 * Mengembalikan label jam saat ini dalam format "HH:mm".
 */
export function getCurrentTimeLabel(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Mengecek apakah waktu terbaik suatu destinasi sudah LEWAT dari jam saat ini.
 * Threshold grace period: 1 jam setelah upper bound slot.
 *
 * @param bestTime - Slot waktu terbaik: 'Subuh' | 'Pagi' | 'Siang' | 'Sore' | 'Malam'
 * @returns true jika waktu terbaik sudah terlewat
 */
export function isTimingPassed(bestTime: string): boolean {
  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  const bounds = TIME_SLOT_BOUNDS[bestTime];
  if (!bounds) return false;
  // Dianggap lewat jika sudah melewati upper bound + 1 jam grace period
  return hour > bounds.upper + 1.0;
}

/**
 * Mengecek apakah SEKARANG adalah waktu ideal untuk mengunjungi destinasi ini.
 * Ideal = jam saat ini berada di dalam rentang slot terbaik.
 *
 * @param bestTime - Slot waktu terbaik: 'Subuh' | 'Pagi' | 'Siang' | 'Sore' | 'Malam'
 * @returns true jika sekarang waktu yang tepat
 */
export function isTimingIdeal(bestTime: string): boolean {
  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  const bounds = TIME_SLOT_BOUNDS[bestTime];
  if (!bounds) return false;
  return hour >= bounds.lower && hour <= bounds.upper;
}

/**
 * Mengecek apakah slot terbaik belum tiba (future timing).
 *
 * @param bestTime - Slot waktu terbaik
 * @returns true jika waktu terbaik belum datang hari ini
 */
export function isTimingUpcoming(bestTime: string): boolean {
  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  const bounds = TIME_SLOT_BOUNDS[bestTime];
  if (!bounds) return false;
  return hour < bounds.lower;
}

/**
 * Menghasilkan status label waktu kunjungan berdasarkan jam saat ini.
 *
 * @param bestTime - Slot waktu terbaik destinasi
 * @returns objek berisi { label, color, icon }
 */
export function getTimingStatus(bestTime: string): {
  label: string;
  color: string;
  icon: string;
  isPassed: boolean;
  isIdeal: boolean;
} {
  if (isTimingIdeal(bestTime)) {
    return {
      label: 'Waktu Terbaik Sekarang!',
      color: '#16A34A',   // hijau
      icon: '✅',
      isPassed: false,
      isIdeal: true,
    };
  }
  if (isTimingPassed(bestTime)) {
    return {
      label: 'Waktu Terbaik Sudah Lewat',
      color: '#DC2626',   // merah
      icon: '⚠️',
      isPassed: true,
      isIdeal: false,
    };
  }
  // Upcoming
  return {
    label: `Belum Saatnya (Best: ${bestTime})`,
    color: '#D97706',   // oranye/amber
    icon: '⏳',
    isPassed: false,
    isIdeal: false,
  };
}

/**
 * Menghasilkan informasi Best Timing untuk destinasi wisata.
 */
export function getDestinationBestTiming(destination: { name: string; category?: string }): BestTiming {
  const name = destination.name.toLowerCase();
  const category = destination.category || '';

  let timing: Omit<BestTiming, 'time_order'> | null = null;

  // 1. Cek override spesifik nama
  for (const [kw, override] of Object.entries(DESTINATION_OVERRIDES)) {
    if (name.includes(kw)) {
      timing = override;
      break;
    }
  }

  // 2. Cek kategori
  if (!timing && category && CATEGORY_TIMING[category]) {
    timing = CATEGORY_TIMING[category];
  }

  // 3. Fallback
  if (!timing) {
    timing = DEFAULT_TIMING;
  }

  const time_order = TIME_SLOT_HOURS[timing.best_time] ?? 9.0;

  return {
    ...timing,
    time_order,
  };
}

/**
 * Mengambil jam mulai dari window best timing (mis. "06:00 – 09:00" -> 6).
 * Fallback ke time_order slot jika format window tidak dikenali.
 */
function getTimingStartHour(timing: BestTiming): number {
  const match = timing.window.match(/(\d{1,2})[:.](\d{2})/);
  if (match) {
    return Number(match[1]) + Number(match[2]) / 60;
  }
  return timing.time_order;
}

/**
 * Mengurutkan destinasi secara kronologis berdasarkan jam terbaik kunjungan.
 *
 * Urutan waktu selalu naik (mis. jam 06:00 sebelum 07:00). Untuk destinasi
 * dengan jam terbaik yang sama, dipilih yang paling dekat dari posisi terakhir
 * agar rute tetap efisien.
 */
export function calculateTimeAwareOrder<T extends Destination>(
  origin: { lat: number; lng: number },
  destinations: T[],
  haversineFn: (c1: { lat: number; lng: number }, c2: { lat: number; lng: number }) => number
): T[] {
  if (destinations.length <= 1) return [...destinations];

  // Annotate timing
  const annotated = destinations.map((d) => ({
    ...d,
    best_timing: d.best_timing || getDestinationBestTiming(d),
  }));

  const remaining = [...annotated];
  const ordered: T[] = [];
  let current: { lat: number; lng: number } = origin;

  while (remaining.length > 0) {
    // Selalu proses jam terbaik paling awal terlebih dahulu.
    const earliest = Math.min(
      ...remaining.map((d) => getTimingStartHour(d.best_timing))
    );
    const sameSlot = remaining.filter(
      (d) => getTimingStartHour(d.best_timing) === earliest
    );

    // Dalam slot waktu yang sama, pilih yang paling dekat.
    let bestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < sameSlot.length; i++) {
      const dist = haversineFn(current, sameSlot[i]);
      if (dist < minDist) {
        minDist = dist;
        bestIdx = i;
      }
    }

    const nextPlace = sameSlot[bestIdx];
    remaining.splice(remaining.indexOf(nextPlace), 1);
    ordered.push(nextPlace as T);
    current = nextPlace;
  }

  return ordered;
}

