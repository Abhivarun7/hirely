import { useState, useEffect, useRef, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import type { MapMouseEvent } from '@vis.gl/react-google-maps';
import { MapPin, Search, X, Check, Building2 } from 'lucide-react';
import { Button } from './Button';
import { API_BASE_URL } from '../../api/client';

export interface PickedLocation {
  label: string;
  city: string;
  state?: string;
  country: string;
  address?: string;
  latitude: number;
  longitude: number;
  google_place_id?: string;
  branch_id?: string;
}

export interface BranchOption {
  id: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  onSelect: (location: PickedLocation) => void;
  onClose: () => void;
  branches?: BranchOption[];
}

let _cachedApiKey: string | null = null;

async function fetchMapsApiKey(): Promise<string> {
  if (_cachedApiKey) return _cachedApiKey;
  const res = await fetch(`${API_BASE_URL}/public/config`);
  const json = await res.json();
  _cachedApiKey = json.data?.googleMapsApiKey ?? '';
  return _cachedApiKey as string;
}

function MarkerWithPan({ position }: { position: google.maps.LatLngLiteral }) {
  const map = useMap();
  useEffect(() => {
    if (map) map.panTo(position);
  }, [map, position.lat, position.lng]);
  return <AdvancedMarker position={position} />;
}

function BranchMarker({
  branch,
  selected,
  onClick,
}: {
  branch: BranchOption;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <AdvancedMarker
      position={{ lat: branch.latitude, lng: branch.longitude }}
      onClick={onClick}
    >
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold shadow-lg cursor-pointer border-2 transition-all ${
          selected
            ? 'bg-orange-500 text-white border-orange-600 scale-110'
            : 'bg-white text-orange-600 border-orange-400 hover:bg-orange-50'
        }`}
      >
        <Building2 className="w-3 h-3 flex-shrink-0" />
        <span className="max-w-[100px] truncate">{branch.name || branch.city}</span>
      </div>
    </AdvancedMarker>
  );
}

function PlacesSearch({
  onSelect,
}: {
  onSelect: (place: google.maps.places.PlaceResult) => void;
}) {
  const placesLib = useMapsLibrary('places');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;
    const ac = new placesLib.Autocomplete(inputRef.current, {
      fields: ['address_components', 'geometry', 'name', 'place_id', 'formatted_address'],
    });
    const listener = ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (place.geometry?.location) onSelect(place);
    });
    return () => listener.remove();
  }, [placesLib, onSelect]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search for a city or address..."
        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
      />
    </div>
  );
}

function extractParts(components: google.maps.GeocoderAddressComponent[]) {
  const get = (type: string) =>
    components.find((c) => c.types.includes(type))?.long_name ?? '';
  return {
    city: get('locality') || get('administrative_area_level_2') || get('postal_town') || '',
    state: get('administrative_area_level_1') || undefined,
    country: get('country') || '',
  };
}

// Lives inside APIProvider so it can use useMapsLibrary for reverse geocoding
function PickerInner({
  branches,
  onSelected,
}: {
  branches: BranchOption[];
  onSelected: (loc: PickedLocation | null) => void;
}) {
  const geocodingLib = useMapsLibrary('geocoding');
  const [marker, setMarker] = useState<google.maps.LatLngLiteral | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const selectBranch = useCallback(
    (branch: BranchOption) => {
      setSelectedBranchId(branch.id);
      setMarker(null);
      onSelected({
        label: branch.name || branch.city,
        city: branch.city,
        state: branch.state,
        country: branch.country,
        address: branch.address,
        latitude: branch.latitude,
        longitude: branch.longitude,
        branch_id: branch.id,
      });
    },
    [onSelected]
  );

  const handlePlaceSelect = useCallback(
    (place: google.maps.places.PlaceResult) => {
      const lat = place.geometry!.location!.lat();
      const lng = place.geometry!.location!.lng();
      const parts = extractParts(place.address_components ?? []);
      setSelectedBranchId(null);
      setMarker({ lat, lng });
      onSelected({
        label: place.name || place.formatted_address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        address: place.formatted_address,
        google_place_id: place.place_id,
        latitude: lat,
        longitude: lng,
        city: parts.city,
        state: parts.state,
        country: parts.country,
      });
    },
    [onSelected]
  );

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      const latLng = e.detail.latLng;
      if (!latLng) return;
      const { lat, lng } = latLng;
      setSelectedBranchId(null);
      setMarker({ lat, lng });

      if (!geocodingLib) {
        onSelected({
          label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          latitude: lat,
          longitude: lng,
          city: '',
          country: '',
        });
        return;
      }

      setGeocoding(true);
      const geocoder = new geocodingLib.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        setGeocoding(false);
        if (status === 'OK' && results?.[0]) {
          const parts = extractParts(results[0].address_components ?? []);
          onSelected({
            label: results[0].formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            address: results[0].formatted_address,
            google_place_id: results[0].place_id,
            latitude: lat,
            longitude: lng,
            city: parts.city,
            state: parts.state,
            country: parts.country,
          });
        } else {
          onSelected({
            label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            latitude: lat,
            longitude: lng,
            city: '',
            country: '',
          });
        }
      });
    },
    [geocodingLib, onSelected]
  );

  return (
    <>
      {/* Search */}
      <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
        <PlacesSearch onSelect={handlePlaceSelect} />
      </div>

      {/* Branch chips */}
      {branches.length > 0 && (
        <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            Company Branches
          </p>
          <div className="flex flex-wrap gap-2">
            {branches.map((branch) => (
              <button
                key={branch.id}
                type="button"
                onClick={() => selectBranch(branch)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  selectedBranchId === branch.id
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-orange-400 hover:text-orange-600'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                {branch.name || branch.city}
                <span className="text-xs opacity-60">{branch.city}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Map */}
      <div className="flex-shrink-0 relative" style={{ height: branches.length > 0 ? 300 : 360 }}>
        <Map
          defaultCenter={{ lat: 20, lng: 77 }}
          defaultZoom={branches.length > 0 ? 5 : 2}
          mapId="hirely-location-picker"
          style={{ width: '100%', height: '100%' }}
          onClick={handleMapClick}
          gestureHandling="greedy"
        >
          {branches.map((branch) => (
            <BranchMarker
              key={branch.id}
              branch={branch}
              selected={selectedBranchId === branch.id}
              onClick={() => selectBranch(branch)}
            />
          ))}
          {marker && !selectedBranchId && <MarkerWithPan position={marker} />}
        </Map>

        {/* Reverse geocoding spinner overlay */}
        {geocoding && (
          <div className="absolute inset-0 bg-white/40 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow text-xs text-gray-600 font-medium">
              <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              Looking up address…
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export function LocationPicker({ onSelect, onClose, branches = [] }: LocationPickerProps) {
  const [selected, setSelected] = useState<PickedLocation | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(_cachedApiKey);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  useEffect(() => {
    if (apiKey !== null) return;
    fetchMapsApiKey()
      .then((key) => {
        if (!key) {
          setApiKeyError('Maps service is not configured. Please contact support.');
          setApiKey('');
        } else {
          setApiKey(key);
        }
      })
      .catch(() => {
        setApiKeyError('Could not load the maps service. Check your connection and try again.');
        setApiKey('');
      });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-500" />
            Pick a Location
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {apiKey === null ? (
          <div className="flex items-center justify-center" style={{ height: 460 }}>
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : apiKey === '' ? (
          <div
            className="flex flex-col items-center justify-center text-center px-6"
            style={{ height: 460 }}
          >
            <MapPin className="w-10 h-10 text-orange-300 mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">Map unavailable</p>
            <p className="text-xs text-gray-500 max-w-sm">
              {apiKeyError ?? 'The map could not be loaded right now.'}
            </p>
          </div>
        ) : (
          <APIProvider apiKey={apiKey}>
            <PickerInner branches={branches} onSelected={setSelected} />
          </APIProvider>
        )}

        {/* Selected preview */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex-shrink-0 min-h-[56px] flex items-center gap-3">
          {selected ? (
            <>
              {selected.branch_id ? (
                <Building2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
              ) : (
                <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{selected.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[selected.city, selected.state, selected.country].filter(Boolean).join(', ')}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">
              {branches.length > 0
                ? 'Select a branch above or search / click the map for a custom location'
                : 'Search for a place or click on the map to select a location'}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => selected && onSelect(selected)}
            disabled={!selected}
          >
            <Check className="w-4 h-4 mr-1.5" />
            Confirm Location
          </Button>
        </div>
      </div>
    </div>
  );
}
