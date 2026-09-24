import type { Category } from '../types';

// Ganti dengan IP address WiFi laptop kamu (cek dengan ipconfig)
export const API_BASE_URL = 'http://10.226.222.70:3000';

export const CATEGORIES: Category[] = [
  { id: 1, name: 'Pantai', icon: '🏖️' },
  { id: 2, name: 'Pura', icon: '🛕' },
  { id: 3, name: 'Air Terjun', icon: '💧' },
  { id: 4, name: 'Bukit & Tebing', icon: '⛰️' },
  { id: 5, name: 'Hutan & Alam', icon: '🌿' },
  { id: 6, name: 'Danau & Sungai', icon: '🏞️' },
];

export const PRESET_DESTINATIONS: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'Kuta Beach', lat: -8.7184, lng: 115.1686 },
  { name: 'Ubud Center', lat: -8.5069, lng: 115.2624 },
  { name: 'Tanah Lot', lat: -8.6215, lng: 115.0866 },
  { name: 'Seminyak', lat: -8.6900, lng: 115.1565 },
  { name: 'Canggu', lat: -8.6478, lng: 115.1385 },
  { name: 'Sanur', lat: -8.6893, lng: 115.2620 },
  { name: 'Nusa Dua', lat: -8.8067, lng: 115.2309 },
  { name: 'Amed', lat: -8.3378, lng: 115.6581 },
  { name: 'Lovina', lat: -8.1569, lng: 115.0252 },
];

export const ALL_BADGES = [
  { code: 'GEM_SCOUT', name: 'Penjelajah Permata', description: 'Mengulas 1 hidden gem', icon: '🔍', minReviews: 1 },
  { code: 'GEM_HUNTER', name: 'Pemburu Permata', description: 'Mengulas 5 hidden gem', icon: '🏹', minReviews: 5 },
  { code: 'GEM_GUARDIAN', name: 'Penjaga Permata', description: 'Mengulas 15 hidden gem', icon: '💎', minReviews: 15 },
];
