import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import RoutingMachine from './RoutingMachine';
import './Map.css';

// Fix default icon issue with Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Default center when no position is available (world view)
const DEFAULT_CENTER = [20, 0];
const DEFAULT_ZOOM = 2;
const LOCATED_ZOOM = 14;

// Custom icons for taxi markers matching the web version
function createTaxiIcon(status) {
  const color = status === 'available' ? '#22c55e' : '#ef4444';
  return L.divIcon({
    className: 'taxi-marker',
    html: `<div class="marker-icon" style="background:${color};width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">&#128661;</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

const userIcon = L.divIcon({
  className: 'taxi-marker',
  html: '<div class="marker-icon" style="background:#6366f1;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">&#128205;</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

// Re-centers the map when position changes
function MapUpdater({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, Math.max(map.getZoom(), LOCATED_ZOOM));
    }
  }, [position, map]);
  return null;
}

// Handles click-to-set-position on the map
function ClickHandler({ onPositionSelect }) {
  useMapEvents({
    click(e) {
      if (onPositionSelect) {
        onPositionSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

export default function Map({
  destination,
  taxis = [],
  userPosition,
  onPositionSelect,
}) {
  const position = userPosition
    ? [userPosition.lat, userPosition.lng]
    : null;

  const center = position || DEFAULT_CENTER;
  const zoom = position ? LOCATED_ZOOM : DEFAULT_ZOOM;

  return (
    <div id="map" style={{ height: '500px', width: '100%', position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapUpdater position={position} />
        {onPositionSelect && <ClickHandler onPositionSelect={onPositionSelect} />}
        {position && (
          <Marker position={position} icon={userIcon}>
            <Popup>Your Location</Popup>
          </Marker>
        )}
        {taxis.map((taxi) => (
          <Marker
            key={taxi.id}
            position={[taxi.lat, taxi.lng]}
            icon={createTaxiIcon(taxi.status)}
          >
            <Popup>
              <strong>{taxi.vehicleId}</strong>
              <br />
              Status: {taxi.status}
              <br />
              Type: {taxi.type}
            </Popup>
          </Marker>
        ))}
        {destination && position && (
          <RoutingMachine
            userPosition={position}
            destination={destination.value}
          />
        )}
      </MapContainer>
      {!position && onPositionSelect && (
        <div className="map-click-hint">
          Click on the map to set your location
        </div>
      )}
      <div className="map-legend">
        <span className="legend-item">
          <span
            className="legend-dot"
            style={{ background: '#22c55e' }}
          />
          Available
        </span>
        <span className="legend-item">
          <span
            className="legend-dot"
            style={{ background: '#ef4444' }}
          />
          Occupied
        </span>
        <span className="legend-item">
          <span
            className="legend-dot"
            style={{ background: '#6366f1' }}
          />
          You
        </span>
      </div>
    </div>
  );
}
