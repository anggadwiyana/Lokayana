export type SearchCenterLabel = 'ORIGIN' | 'DESTINATION' | 'MERGED';

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  count?: number;
  description?: string;
}

export interface SearchArea {
  label: SearchCenterLabel;
  latitude: number;
  longitude: number;
  radiusKm: number;
  title: string;
  description: string;
}

export interface BestTiming {
  best_time: string; // 'Subuh' | 'Pagi' | 'Siang' | 'Sore' | 'Malam'
  window: string;    // mis. '16:00 – 18:30'
  icon: string;      // mis. '🌅'
  reason: string;    // Alasan waktu terbaik
  avoid: string;     // Waktu yang sebaiknya dihindari
  time_order: number;
}

export interface Destination {
  id: string;
  name: string;
  category: string;
  broadCategory: string;
  district: string;
  city: string;
  rating: number;
  reviewCount: number;
  lat: number;
  lng: number;
  mapLink: string;
  imageUrl: string | null;
  best_timing?: BestTiming;
}

export interface AlternativeDestination extends Destination {
  similarityScore: number; // 0 - 100%
  similarityReason: string;
  distanceFromHubKm: number;
  distanceKm?: number; // Kompatibilitas
  categoryName?: string; // Kompatibilitas
  coverPhotoUrl?: string | null; // Kompatibilitas
  nearestCenter: SearchCenterLabel;
  estimatedTravelMinutes?: number;
  ratings?: {
    beauty: number | null;
    access: number | null;
    facilities: number | null;
  };
  rewardPoints: number;
  firstReviewBonusPoints: number;
  best_timing?: BestTiming;
}

export type HiddenGem = AlternativeDestination;

export interface RouteInfo {
  straightDistanceKm: number;
  roadDistanceKm: number;
  carDurationMinutes: number;
  motorDurationMinutes: number;
  fastestMode: 'MOTOR' | 'CAR';
  polylineCoords: Coordinate[];
  summaryNote: string;
}

export interface RecommendationResponse {
  origin: Coordinate & { name: string };
  destination: Coordinate & { name: string; destinationObj?: Destination | null };
  orderedDestinations?: Destination[];
  stops?: Destination[];
  straightDistanceKm: number;
  isDualRadius: boolean;
  searchAreas: SearchArea[];
  route: RouteInfo;
  alternatives: AlternativeDestination[];
}

export interface Badge {
  code: string;
  name: string;
  description: string;
  icon: string;
  minReviews: number;
}

export type AppScreen =
  | { name: 'Home' }
  | {
      name: 'GemList';
      params: RecommendationResponse;
    }
  | { name: 'Review'; params: { gem: AlternativeDestination } }
  | { name: 'Profile' }
  | { name: 'Login' };
