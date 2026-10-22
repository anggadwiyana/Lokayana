/**
 * Image Helper — Smart Bali Photography Fallback System
 *
 * Mengatasi 1.133 URL Google UserContent (/gps-cs-s/) yang session token-nya
 * sudah kedaluwarsa (HTTP 403) dari dataset bali_tourist_destination.csv.
 * Memberikan fallback foto lanskap Pulau Bali berkualitas HD sesuai kategori.
 */

const CATEGORY_BALI_IMAGES: Record<string, string> = {
  Pantai: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&auto=format&fit=crop&q=80',
  Pura: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&auto=format&fit=crop&q=80',
  'Patung & Monumen': 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=800&auto=format&fit=crop&q=80',
  'Air Terjun': 'https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?w=800&auto=format&fit=crop&q=80',
  'Bukit & Tebing': 'https://images.unsplash.com/photo-1559628233-eb1b1a45564b?w=800&auto=format&fit=crop&q=80',
  'Hutan & Alam': 'https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?w=800&auto=format&fit=crop&q=80',
  'Rekreasi & Taman': 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
  'Danau & Sungai': 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800&auto=format&fit=crop&q=80',
  'Budaya & Museum': 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=800&auto=format&fit=crop&q=80',
};

const DEFAULT_BALI_IMAGE =
  'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&auto=format&fit=crop&q=80';

export function getDestinationImageUrl(imageUrl?: string | null, category?: string): string {
  if (imageUrl && !imageUrl.includes('googleusercontent.com/gps-cs-s/')) {
    return imageUrl;
  }
  return (category && CATEGORY_BALI_IMAGES[category]) || DEFAULT_BALI_IMAGE;
}

export function getCategoryFallbackImage(category?: string): string {
  return (category && CATEGORY_BALI_IMAGES[category]) || DEFAULT_BALI_IMAGE;
}
