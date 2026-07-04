import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Search,
  LocateFixed,
  Loader2,
  MapPinned,
} from 'lucide-react';
import {
  createIcon,
  reverseGeocode,
  searchAddress,
  getCurrentLocation,
  formatDistance,
  DEFAULT_LOCATION,
  type NominatimResult,
} from '../lib/maps';
import { Input } from './ui/Input';

interface Props {
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  onChange: (lat: number, lng: number, address: string) => void;
}

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function LocationPicker({
  initialLat,
  initialLng,
  initialAddress,
  onChange,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [address, setAddress] = useState(initialAddress || '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );

  const debouncedQuery = useDebounce(searchQuery, 500);

  // Update location and get address via reverse geocoding
  const updateLocation = useCallback(
    async (lat: number, lng: number, addr?: string) => {
      setCoords({ lat, lng });
      let finalAddr = addr;
      if (!finalAddr) {
        try {
          const result = await reverseGeocode(lat, lng);
          finalAddr = result?.display_name || '';
        } catch {
          finalAddr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
      }
      setAddress(finalAddr);
      onChange(lat, lng, finalAddr);
    },
    [onChange]
  );

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    const center = coords
      ? [coords.lat, coords.lng]
      : [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng];

    const map = L.map(mapRef.current, {
      center,
      zoom: 15,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker(center, {
      icon: createIcon(),
      draggable: true,
    }).addTo(map);

    marker.on('dragend', async () => {
      const pos = marker.getLatLng();
      marker.setLatLng(pos);
      await updateLocation(pos.lat, pos.lng);
    });

    map.on('click', async (e) => {
      marker.setLatLng(e.latlng);
      await updateLocation(e.latlng.lat, e.latlng.lng);
    });

    mapInstance.current = map;
    markerRef.current = marker;
    setLoading(false);

    // If no initial coords, try to get user location
    if (!coords) {
      getCurrentLocation()
        .then((pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          map.setView([lat, lng], 15);
          marker.setLatLng([lat, lng]);
          updateLocation(lat, lng);
        })
        .catch(() => {
          // Use default Jakarta if geolocation fails
          updateLocation(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng, DEFAULT_LOCATION.address);
        });
    }

    return () => {
      map.remove();
      mapInstance.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search for addresses with debounce
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    const search = async () => {
      setSearching(true);
      try {
        const results = await searchAddress(debouncedQuery);
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    search();
  }, [debouncedQuery]);

  // Select search result
  const selectResult = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (mapInstance.current && markerRef.current) {
      mapInstance.current.setView([lat, lng], 16);
      markerRef.current.setLatLng([lat, lng]);
    }

    updateLocation(lat, lng, result.display_name);
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  // Use browser geolocation
  const useMyLocation = async () => {
    setLocating(true);
    try {
      const pos = await getCurrentLocation();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (mapInstance.current && markerRef.current) {
        mapInstance.current.setView([lat, lng], 16);
        markerRef.current.setLatLng([lat, lng]);
      }

      await updateLocation(lat, lng);
    } catch {
      // Error already handled in getCurrentLocation
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Search input with dropdown */}
      <div className="relative">
        <div className="relative">
          <Input
            ref={searchInputRef}
            label="Cari alamat"
            placeholder="Ketik alamat atau nama tempat..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.length >= 3) {
                setShowDropdown(true);
              }
            }}
            onFocus={() => {
              if (searchResults.length > 0) {
                setShowDropdown(true);
              }
            }}
          />
          <div className="absolute right-3 top-[38px] text-muted">
            {searching ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
          </div>
        </div>

        {/* Search results dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-card shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => selectResult(result)}
                className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0"
              >
                <div className="flex items-start gap-2">
                  <MapPinned size={16} className="text-primary shrink-0 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-foreground line-clamp-1">
                      {result.address.road || result.address.city || result.display_name.split(',')[0]}
                    </p>
                    <p className="text-xs text-muted line-clamp-2">
                      {result.display_name}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map container */}
      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-64 rounded-card border border-border overflow-hidden bg-muted"
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        )}

        {/* My location button */}
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="absolute bottom-3 right-3 flex items-center gap-2 rounded-btn bg-white border border-border px-3 py-2 text-xs font-semibold shadow-card hover:border-primary transition-colors disabled:opacity-50"
        >
          {locating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <LocateFixed size={14} />
          )}
          Lokasi Saya
        </button>
      </div>

      {/* Current address display */}
      {address && (
        <div className="flex items-start gap-2 rounded-btn bg-accent-soft border border-primary/20 px-3 py-2.5">
          <MapPin size={16} className="text-primary shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-foreground/70 leading-relaxed">
            {address}
          </p>
        </div>
      )}
    </div>
  );
}
