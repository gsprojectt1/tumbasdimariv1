import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default marker icon issue with bundlers - use CDN URLs
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom marker icon (blue)
export function createIcon(className?: string) {
  return L.divIcon({
    className: className || 'custom-marker',
    html: `<div style="width: 32px; height: 32px; position: relative;">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#2563eb" stroke="#1e40af" stroke-width="1"/>
        <circle cx="12" cy="9" r="3" fill="white"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

// Destination marker icon (green)
export function createDestinationIcon() {
  return L.divIcon({
    className: 'destination-marker',
    html: `<div style="width: 32px; height: 32px; position: relative;">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#16a34a" stroke="#15803d" stroke-width="1"/>
        <circle cx="12" cy="9" r="3" fill="white"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

// Courier marker icon (orange)
export function createCourierIcon() {
  return L.divIcon({
    className: 'courier-marker',
    html: `<div style="width: 32px; height: 32px; position: relative;">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#ea580c" stroke="#c2410c" stroke-width="1"/>
        <circle cx="12" cy="9" r="3" fill="white"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

// Nominatim search - free geocoding, no API key
export async function searchAddress(query: string): Promise<NominatimResult[]> {
  if (!query || query.length < 3) return [];

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('q', query);
  url.searchParams.set('countrycodes', 'id');
  url.searchParams.set('limit', '5');
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url.toString(), {
    headers: {
      'Accept-Language': 'id',
    },
  });

  if (!response.ok) {
    throw new Error('Gagal mencari alamat');
  }

  return response.json();
}

// Nominatim reverse geocoding - free, no API key
export async function reverseGeocode(lat: number, lon: number): Promise<NominatimReverseResult | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'json');
  url.searchParams.set('lat', lat.toString());
  url.searchParams.set('lon', lon.toString());
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url.toString(), {
    headers: {
      'Accept-Language': 'id',
    },
  });

  if (!response.ok) {
    throw new Error('Gagal mendapatkan alamat');
  }

  return response.json();
}

// OSRM routing - free, no API key
export async function getRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<OSRMRouteResult | null> {
  try {
    // Format: longitude,latitude for OSRM
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Gagal mengambil rute');
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes?.length) {
      return null;
    }

    const route = data.routes[0];
    const coords: [number, number][] = route.geometry.coordinates.map(
      (c: number[]) => [c[1], c[0]] as [number, number] // Leaflet uses [lat, lng], GeoJSON uses [lng, lat]
    );

    return {
      geometry: coords,
      distance: route.distance, // meters
      duration: route.duration, // seconds
    };
  } catch {
    return null;
  }
}

// Get current browser location
export function getCurrentLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Browser tidak mendukung geolocation'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            reject(new Error('Izin lokasi ditolak'));
            break;
          case err.POSITION_UNAVAILABLE:
            reject(new Error('Lokasi tidak tersedia'));
            break;
          case err.TIMEOUT:
            reject(new Error('Waktu permintaan lokasi habis'));
            break;
          default:
            reject(new Error('Gagal mendapatkan lokasi'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

// Format meters to readable string
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

// Format seconds to readable duration
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} detik`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} menit`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} jam ${remainingMinutes} menit`;
}

// Types
export interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  icon: string;
  address: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

export interface NominatimReverseResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

export interface OSRMRouteResult {
  geometry: [number, number][];
  distance: number; // meters
  duration: number; // seconds
}

// Jakarta default coordinates
export const DEFAULT_LOCATION = {
  lat: -6.2088,
  lng: 106.8456,
  address: 'Jakarta, Indonesia',
};
