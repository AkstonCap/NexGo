import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FieldSet, Button } from 'nexus-module';
import AsyncSelect from 'react-select/async';
import Map from 'components/Map';
import { fetchTaxis } from 'actions/actionCreators';
import { calculateDistance } from 'api/nexusAPI';

const REFRESH_INTERVAL = 10000; // 10 seconds, matching web version

const loadOptions = (inputValue, callback) => {
  fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${inputValue}`
  )
    .then((response) => response.json())
    .then((data) => {
      const options = data.map((item) => ({
        label: item.display_name,
        value: {
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
        },
      }));
      callback(options);
    })
    .catch((error) => {
      console.error('Error fetching address suggestions:', error);
      callback([]);
    });
};

const vehicleIcons = {
  sedan: '\u{1F697}',
  suv: '\u{1F699}',
  van: '\u{1F690}',
  luxury: '\u{1F3CE}',
};

export default function Passenger() {
  const [destination, setDestination] = useState(null);
  const taxis = useSelector((state) => state.taxi.taxis);
  const loading = useSelector((state) => state.taxi.loading);
  const userPosition = useSelector((state) => state.ui.userPosition);
  const dispatch = useDispatch();

  // Auto-refresh taxi list
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(fetchTaxis());
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchTaxis());
  };

  const taxisWithDistance = taxis.map((taxi) => {
    const distance = userPosition
      ? calculateDistance(userPosition, { lat: taxi.lat, lng: taxi.lng })
      : null;
    return { ...taxi, distance };
  });

  // Sort by distance (closest first)
  taxisWithDistance.sort((a, b) => {
    if (a.distance === null) return 1;
    if (b.distance === null) return -1;
    return a.distance - b.distance;
  });

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <p>
          Find nearby available taxis in real-time. Drivers post their position
          and status on-chain for transparent, trustless ride matching.
        </p>
      </div>

      <FieldSet legend="Destination">
        <AsyncSelect
          cacheOptions
          loadOptions={loadOptions}
          onChange={(opt) => setDestination(opt)}
          placeholder="Enter destination address..."
          styles={{
            control: (base) => ({ ...base, marginBottom: 8 }),
          }}
        />
      </FieldSet>

      <Map
        destination={destination}
        taxis={taxis}
        userPosition={userPosition}
      />

      <div style={{ marginTop: 16 }}>
        <FieldSet
          legend={
            'Available Taxis' +
            (taxis.length ? ` (${taxis.length})` : '')
          }
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <Button
              onClick={handleRefresh}
              disabled={loading}
              style={{ fontSize: 13, padding: '4px 12px' }}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>

          {taxis.length === 0 && !loading && (
            <p style={{ textAlign: 'center', opacity: 0.6, padding: 16 }}>
              No taxis available in your area. They will appear here once
              drivers start broadcasting their positions on-chain.
            </p>
          )}

          {loading && taxis.length === 0 && (
            <p style={{ textAlign: 'center', opacity: 0.6, padding: 16 }}>
              Searching for taxis on the blockchain...
            </p>
          )}

          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {taxisWithDistance.map((taxi) => (
              <div
                key={taxi.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderBottom: '1px solid rgba(128,128,128,0.2)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 24 }}>
                  {vehicleIcons[taxi.type] || '\u{1F695}'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{taxi.vehicleId}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {taxi.type.charAt(0).toUpperCase() + taxi.type.slice(1)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {taxi.distance !== null && (
                    <>
                      <div style={{ fontWeight: 600 }}>
                        {taxi.distance.toFixed(1)} km
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        ~{Math.ceil(taxi.distance * 3)} min
                      </div>
                    </>
                  )}
                </div>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    background:
                      taxi.status === 'available'
                        ? 'rgba(34,197,94,0.15)'
                        : 'rgba(239,68,68,0.15)',
                    color:
                      taxi.status === 'available' ? '#22c55e' : '#ef4444',
                  }}
                >
                  {taxi.status}
                </span>
              </div>
            ))}
          </div>
        </FieldSet>
      </div>
    </>
  );
}
