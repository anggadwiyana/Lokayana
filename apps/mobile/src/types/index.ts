export type SearchCenterLabel = 'ORIGIN' | 'DESTINATION';

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
}

export interface SearchArea {
  label: SearchCenterLabel;
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export interface HiddenGem {
  id: string;
  name: string;
  categoryName: string;
  coverPhotoUrl: string | null;
  latitude: number;
  longitude: number;
  /** Jarak ke pusat area pencarian terdekat (km). */
  distanceKm: number;
  nearestCenter: SearchCenterLabel;
  /** Total ulasan (di aplikasi + sumber eksternal). */
  reviewCount: number;
  ratings: {
    beauty: number | null;
    access: number | null;
    facilities: number | null;
  };
  rewardPoints: number;
  firstReviewBonusPoints: number;
}

export interface HiddenGemsResponse {
  /** Jarak garis lurus titik awal -> tujuan (km). */
  originToDestinationKm: number;
  searchAreas: SearchArea[];
  gems: HiddenGem[];
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
      params: {
        response: HiddenGemsResponse;
        origin: Coordinate;
        originName: string;
        destination: Coordinate;
        destinationName: string;
      };
    }
  | { name: 'Review'; params: { gem: HiddenGem } }
  | { name: 'Profile' };
