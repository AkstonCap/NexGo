import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

export default function Map({ destination, taxis = [], userPosition }) {
  const [position, setPosition] = useState(null);

  useEffect(() => {
    if (userPosition) {
      setPosition([userPosition.lat, userPosition.lng]);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.error(err);
        }
      );
    }
  }, [userPosition]);

  return (
    <div id="map" style={{ height: '500px', width: '100%', position: 'relative' }}>
      {position && (
        <MapContainer
          center={position}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={position} icon={userIcon}>
            <Popup>Your Location</Popup>
          </Marker>
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
          {destination && (
            <RoutingMachine
              userPosition={position}
              destination={destination.value}
            />
          )}
        </MapContainer>
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
