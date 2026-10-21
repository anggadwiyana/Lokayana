import type { Category, Destination, Coordinate } from '../types';
import rawDestinations from '../data/baliDestinations.json';

const allDestinations: Destination[] = rawDestinations as Destination[];

export const CATEGORIES: Category[] = [
  { id: 1, name: 'Pantai', icon: '🏖️', description: 'Pantai pasir putih, selancar, dan panorama sunset' },
  { id: 2, name: 'Pura', icon: '🛕', description: 'Pura sakral bernilai sejarah dan arsitektur khas Bali' },
  { id: 3, name: 'Patung & Monumen', icon: '🗿', description: 'Ikon megah, patung peradaban, dan monumen budaya' },
  { id: 4, name: 'Air Terjun', icon: '💧', description: 'Curug alami tersembunyi dengan udara sejuk pegunungan' },
  { id: 5, name: 'Bukit & Tebing', icon: '⛰️', description: 'Spot tebing karang tinggi dan pemandangan perbukitan' },
  { id: 6, name: 'Hutan & Alam', icon: '🌿', description: 'Hutan lindung, terasering sawah, dan kebun tropis' },
  { id: 7, name: 'Rekreasi & Taman', icon: '🎡', description: 'Taman rekreasi, wahana air, dan ruang publik hijau' },
  { id: 8, name: 'Danau & Sungai', icon: '🏞️', description: 'Danau kawah tenang, sungai asri, dan arung jeram' },
  { id: 9, name: 'Budaya & Museum', icon: '🏛️', description: 'Galeri seni, desa adat, dan warisan budaya leluhur' },
];

export const POPULAR_ORIGIN_PRESETS: Array<{ name: string; lat: number; lng: number; desc: string }> = [
  { name: 'Bandara Ngurah Rai (DPS)', lat: -8.7482, lng: 115.1672, desc: 'Tuban, Kuta' },
  { name: 'Kuta Central', lat: -8.7184, lng: 115.1686, desc: 'Kuta, Badung' },
  { name: 'Seminyak Square', lat: -8.6900, lng: 115.1565, desc: 'Seminyak, Badung' },
  { name: 'Canggu (Batu Bolong)', lat: -8.6478, lng: 115.1385, desc: 'Canggu, Badung' },
  { name: 'Sanur Beach Harbour', lat: -8.6893, lng: 115.2620, desc: 'Sanur, Denpasar' },
  { name: 'Ubud Center (Puri Ubud)', lat: -8.5069, lng: 115.2624, desc: 'Ubud, Gianyar' },
  { name: 'Denpasar Kota (Renon)', lat: -8.6705, lng: 115.2339, desc: 'Denpasar Selatan' },
  { name: 'Nusa Dua ITDC', lat: -8.8067, lng: 115.2309, desc: 'Kuta Selatan, Badung' },
  { name: 'Jimbaran Bay', lat: -8.7735, lng: 115.1681, desc: 'Jimbaran, Badung' },
];

export const POPULAR_DESTINATIONS: Destination[] = [
  // Famous highlights across categories
  allDestinations.find((d) => d.name.toLowerCase().includes('tanah lot')) ?? allDestinations[0],
  allDestinations.find((d) => d.name.toLowerCase().includes('wisnu kencana') || d.name.toLowerCase().includes('gwk')) ?? allDestinations[1],
  allDestinations.find((d) => d.name.toLowerCase().includes('uluwatu')) ?? allDestinations[2],
  allDestinations.find((d) => d.name.toLowerCase().includes('besakih')) ?? allDestinations[3],
  allDestinations.find((d) => d.name.toLowerCase().includes('beratan') || d.name.toLowerCase().includes('bedugul')) ?? allDestinations[4],
  allDestinations.find((d) => d.name.toLowerCase().includes('gitgit')) ?? allDestinations[5],
  allDestinations.find((d) => d.name.toLowerCase().includes('pandawa')) ?? allDestinations[6],
  allDestinations.find((d) => d.name.toLowerCase().includes('monkey forest')) ?? allDestinations[7],
].filter(Boolean) as Destination[];

export function getAllDestinations(): Destination[] {
  return allDestinations;
}

export function searchDestinations(query: string, categoryFilter?: string | null): Destination[] {
  const q = query.trim().toLowerCase();
  return allDestinations.filter((d) => {
    const matchesCategory =
      !categoryFilter || categoryFilter === 'Semua' || d.category === categoryFilter;

    if (!q) return matchesCategory;

    const matchesQuery =
      d.name.toLowerCase().includes(q) ||
      d.district.toLowerCase().includes(q) ||
      d.city.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q);

    return matchesCategory && matchesQuery;
  });
}

export function findDestinationById(id: string): Destination | undefined {
  return allDestinations.find((d) => d.id === id);
}

export function findNearestDestination(coord: Coordinate): Destination {
  let closest = allDestinations[0];
  let minDistance = Infinity;

  for (const d of allDestinations) {
    const dist = Math.hypot(d.lat - coord.lat, d.lng - coord.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = d;
    }
  }

  return closest;
}
