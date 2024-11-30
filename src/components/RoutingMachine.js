import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';

export default function RoutingMachine({ userPosition, destination }) {
  const map = useMap();
  const [distance, setDistance] = useState(null);

  useEffect(() => {
    if (!map) return;

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(userPosition[0], userPosition[1]),
        L.latLng(destination.lat, destination.lon),
      ],
      lineOptions: {
        styles: [{ color: '#6FA1EC', weight: 4 }],
      },
      addWaypoints: false,
      routeWhileDragging: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
    })
      .on('routesfound', function (e) {
        const route = e.routes[0];
        const distanceInKm = (route.summary.totalDistance / 1000).toFixed(2);
        setDistance(distanceInKm);
      })
      .addTo(map);

    return () => {
      map.removeControl(routingControl);
    };
  }, [map, userPosition, destination]);

  return distance ? (
    <div className="travel-distance">
      <p>Distance: {distance} km</p>
    </div>
  ) : null;
}