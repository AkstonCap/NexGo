import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  FieldSet,
  Button,
  showErrorDialog,
  showSuccessDialog,
} from 'nexus-module';
import AsyncSelect from 'react-select/async';
import Map from 'components/Map';
import {
  fetchTaxis,
  setUserPosition,
  fetchRatings,
  loadMyRatings,
  submitRating,
} from 'actions/actionCreators';
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

// Star rating display component
function StarRating({ score, size = 14 }) {
  const stars = [];
  const rounded = Math.round(score);
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span
        key={i}
        style={{
          color: i <= rounded ? '#f59e0b' : 'rgba(128,128,128,0.3)',
          fontSize: size,
        }}
      >
        {'\u2605'}
      </span>
    );
  }
  return <span>{stars}</span>;
}

// Interactive star picker for rating
function StarPicker({ value, onChange, size = 20 }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span
        key={i}
        onClick={() => onChange(i)}
        style={{
          color: i <= value ? '#f59e0b' : 'rgba(128,128,128,0.3)',
          fontSize: size,
          cursor: 'pointer',
        }}
      >
        {'\u2605'}
      </span>
    );
  }
  return <span>{stars}</span>;
}

export default function Passenger() {
  const [destination, setDestination] = useState(null);
  const [ratingTaxi, setRatingTaxi] = useState(null); // taxi being rated
  const [ratingScore, setRatingScore] = useState(3);
  const [ratingAvoid, setRatingAvoid] = useState(false);
  const taxis = useSelector((state) => state.taxi.taxis);
  const loading = useSelector((state) => state.taxi.loading);
  const ratings = useSelector((state) => state.taxi.ratings);
  const myRatings = useSelector((state) => state.taxi.myRatings);
  const ratingPending = useSelector((state) => state.taxi.ratingPending);
  const userPosition = useSelector((state) => state.ui.userPosition);
  const dispatch = useDispatch();

  // Load ratings on mount
  useEffect(() => {
    dispatch(fetchRatings());
    dispatch(loadMyRatings());
  }, [dispatch]);

  // Auto-refresh taxi list
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(fetchTaxis());
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchTaxis());
    dispatch(fetchRatings());
  };

  const handleOpenRating = (taxi) => {
    const existing = myRatings[taxi.owner];
    setRatingTaxi(taxi);
    setRatingScore(existing ? existing.score : 3);
    setRatingAvoid(existing ? existing.avoid : false);
  };

  const handleSubmitRating = async () => {
    if (!ratingTaxi || !ratingTaxi.owner) return;
    try {
      await dispatch(
        submitRating({
          driverGenesis: ratingTaxi.owner,
          score: ratingScore,
          avoid: ratingAvoid,
        })
      );
      showSuccessDialog({ message: 'Rating submitted on-chain.' });
      setRatingTaxi(null);
    } catch (error) {
      showErrorDialog({
        message: `Failed to submit rating: ${error.message}`,
      });
    }
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
        onPositionSelect={(pos) => dispatch(setUserPosition(pos))}
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

          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {taxisWithDistance.map((taxi) => {
              const driverRating = taxi.owner ? ratings[taxi.owner] : null;
              const myRating = taxi.owner ? myRatings[taxi.owner] : null;
              const isRating = ratingTaxi && ratingTaxi.id === taxi.id;

              return (
                <div
                  key={taxi.id}
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid rgba(128,128,128,0.2)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
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
                      {driverRating && driverRating.count > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <StarRating score={driverRating.average} size={12} />
                          <span style={{ fontSize: 11, opacity: 0.6 }}>
                            ({driverRating.average.toFixed(1)}, {driverRating.count} rating{driverRating.count !== 1 ? 's' : ''})
                          </span>
                          {driverRating.avoidCount > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                padding: '1px 5px',
                                borderRadius: 6,
                                background: 'rgba(239,68,68,0.15)',
                                color: '#ef4444',
                                fontWeight: 600,
                              }}
                            >
                              {driverRating.avoidCount} avoid
                            </span>
                          )}
                        </div>
                      )}
                      {myRating && (
                        <div style={{ fontSize: 11, opacity: 0.5, marginTop: 1 }}>
                          Your rating: {myRating.score}/5{myRating.avoid ? ' (avoided)' : ''}
                        </div>
                      )}
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
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
                      {taxi.owner && (
                        <span
                          onClick={() => handleOpenRating(taxi)}
                          style={{
                            fontSize: 11,
                            color: '#6366f1',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Rate
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Inline rating form */}
                  {isRating && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 10,
                        borderRadius: 8,
                        background: 'rgba(99,102,241,0.08)',
                        border: '1px solid rgba(99,102,241,0.2)',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                        Rate {taxi.vehicleId}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 12 }}>Score:</span>
                        <StarPicker value={ratingScore} onChange={setRatingScore} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={ratingAvoid}
                            onChange={(e) => setRatingAvoid(e.target.checked)}
                          />
                          Mark as "to be avoided"
                        </label>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button
                          onClick={handleSubmitRating}
                          disabled={ratingPending}
                          style={{ fontSize: 12, padding: '4px 12px' }}
                        >
                          {ratingPending ? 'Submitting...' : 'Submit Rating'}
                        </Button>
                        <Button
                          onClick={() => setRatingTaxi(null)}
                          style={{ fontSize: 12, padding: '4px 12px' }}
                        >
                          Cancel
                        </Button>
                      </div>
                      <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>
                        Rating is stored on-chain as a raw asset (nexgo-rating standard).
                        {Object.keys(myRatings).length === 0 && ' First rating creates the asset (2 NXS).'}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </FieldSet>
      </div>
    </>
  );
}
