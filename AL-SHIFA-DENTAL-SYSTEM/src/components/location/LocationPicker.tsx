"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Loader2 } from "lucide-react";

// Fix for default Leaflet marker icons not showing in Next.js
const iconUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png";
const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png";
const shadowUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png";

const customIcon = new L.Icon({
  iconUrl: iconUrl,
  iconRetinaUrl: iconRetinaUrl,
  shadowUrl: shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface LocationData {
  address: string;
  pincode: string;
  lat: number;
  lng: number;
}

interface Props {
  initialData?: LocationData; // Made optional for safety
  onChange: (data: LocationData) => void;
}

// Helper: Draggable Marker Component
function DraggableMarker({ position, onDragEnd, loading }: { position: [number, number], onDragEnd: (pos: L.LatLng) => void, loading: boolean }) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          onDragEnd(marker.getLatLng());
        }
      },
    }),
    [onDragEnd]
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={customIcon}
    >
      <Popup minWidth={90}>
        {loading ? (
          <div className="flex items-center gap-2 text-blue-600 font-medium">
            <Loader2 className="h-3 w-3 animate-spin" /> Fetching Address...
          </div>
        ) : (
          <span className="text-center">You are here</span>
        )}
      </Popup>
    </Marker>
  );
}

// Helper: Handle Map Clicks
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

export default function LocationPicker({ initialData, onChange }: Props) {
  // SAFETY FIX: Ensure we have an object to read from
  const safeData = initialData || { lat: 0, lng: 0, address: "", pincode: "" };

  // Default to Hyderabad (or center of map) if 0,0 provided
  const defaultPos: [number, number] = safeData.lat && safeData.lat !== 0 
    ? [safeData.lat, safeData.lng] 
    : [17.3850, 78.4867];

  const [position, setPosition] = useState<[number, number]>(defaultPos);
  const [loadingAddress, setLoadingAddress] = useState(false);

  // Sync with initial data if it changes externally
  useEffect(() => {
     if (safeData.lat && safeData.lat !== 0) {
        setPosition([safeData.lat, safeData.lng]);
     }
  }, [safeData.lat, safeData.lng]);

  const handleMove = async (latlng: L.LatLng) => {
    setPosition([latlng.lat, latlng.lng]);
    setLoadingAddress(true);

    try {
      // 1. Reverse Geocode using OpenStreetMap Nominatim API
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`,
        {
           headers: {
             "User-Agent": "AlShifaDentalSystem/1.0"
           }
        }
      );
      const data = await res.json();

      if (data && data.address) {
        const addr = data.address;
        
        // 2. Construct a clean address string
        const parts = [
          addr.road || addr.building || addr.house_number,
          addr.suburb || addr.neighbourhood,
          addr.city || addr.town || addr.county,
          addr.state
        ].filter(Boolean);
        
        const fullAddress = parts.join(", ");
        const pincode = addr.postcode || "";

        onChange({
          lat: latlng.lat,
          lng: latlng.lng,
          address: fullAddress || data.display_name, 
          pincode: pincode
        });
      } else {
         onChange({
          lat: latlng.lat,
          lng: latlng.lng,
          address: safeData.address, 
          pincode: safeData.pincode
        });
      }
    } catch (err) {
      console.error("Geocoding failed", err);
    } finally {
      setLoadingAddress(false);
    }
  };

  return (
    <div className="h-[350px] w-full rounded-lg overflow-hidden border border-slate-300 z-0 relative shadow-inner">
      <MapContainer 
        center={position} 
        zoom={15} 
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <DraggableMarker 
          position={position} 
          onDragEnd={handleMove} 
          loading={loadingAddress}
        />
        
        <MapClickHandler onLocationSelect={handleMove} />
      </MapContainer>
      
      {loadingAddress && (
        <div className="absolute top-3 right-3 bg-white/95 px-4 py-2 rounded-full text-xs font-semibold shadow-md z-[1000] flex items-center gap-2 text-blue-700 border border-blue-100">
           <Loader2 className="h-3.5 w-3.5 animate-spin" />
           Updating Location...
        </div>
      )}
    </div>
  );
}