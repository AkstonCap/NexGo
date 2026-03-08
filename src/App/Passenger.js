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
  setPassengerPaymentAccount,
  setUserPosition,
  fetchRatings,
  loadMyRatings,
  submitRating,
} from 'actions/actionCreators';
import {
  calculateDistance,
  createRideRequestAsset,
  extractRideAddressFromInvoice,
  listMyRideRequests,
  listOutstandingInvoices,
  payRideInvoice,
  updateRideRequestAsset,
} from 'api/nexusAPI';

const REFRESH_INTERVAL = 10000; // 10 seconds, matching web version

function formatDate(value) {
  if (!value) return 'Unknown';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function statusPill(status) {
  const normalized = (status || '').toLowerCase();

  if (normalized === 'paid') {
    return {
      background: 'rgba(34,197,94,0.15)',
      color: '#22c55e',
    };
  }

  if (normalized === 'cancelled') {
    return {
      background: 'rgba(239,68,68,0.15)',
      color: '#ef4444',
    };
  }

  if (normalized === 'outstanding' || normalized === 'invoiced') {
    return {
      background: 'rgba(245,158,11,0.15)',
      color: '#f59e0b',
    };
  }

  return {
    background: 'rgba(99,102,241,0.15)',
    color: '#6366f1',
  };
}

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
  const [hirePendingTaxiId, setHirePendingTaxiId] = useState(null);
  const [rideRequests, setRideRequests] = useState([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState([]);
  const [rideLoading, setRideLoading] = useState(false);
  const [rideActionPendingId, setRideActionPendingId] = useState(null);
  const [invoicePendingId, setInvoicePendingId] = useState(null);
  const taxis = useSelector((state) => state.taxi.taxis);
  const loading = useSelector((state) => state.taxi.loading);
  const ratings = useSelector((state) => state.taxi.ratings);
  const myRatings = useSelector((state) => state.taxi.myRatings);
  const ratingPending = useSelector((state) => state.taxi.ratingPending);
  const passengerPaymentAccount = useSelector(
    (state) => state.settings.passengerPaymentAccount
  );
  const userPosition = useSelector((state) => state.ui.userPosition);
  const dispatch = useDispatch();

  const loadRideData = async () => {
    setRideLoading(true);
    try {
      const [rides, invoices] = await Promise.all([
        listMyRideRequests(),
        listOutstandingInvoices(),
      ]);
      setRideRequests(rides);
      setOutstandingInvoices(invoices);
    } catch (error) {
      console.error('Error loading ride data:', error);
    } finally {
      setRideLoading(false);
    }
  };

  // Load ratings on mount
  useEffect(() => {
    dispatch(fetchRatings());
    dispatch(loadMyRatings());
    loadRideData();
  }, [dispatch]);

  // Auto-refresh taxi list
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(fetchTaxis());
      loadRideData();
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchTaxis());
    dispatch(fetchRatings());
    loadRideData();
  };

  const handleOpenRating = (taxi) => {
    const existing = myRatings[taxi.owner];
    setRatingTaxi(taxi);
    setRatingScore(existing ? existing.score : 3);
    setRatingAvoid(existing ? existing.avoid : false);
  };

  const handleHireTaxi = async (taxi) => {
    if (!userPosition) {
      showErrorDialog({
        message: 'Set your pickup position before creating a ride request.',
      });
      return;
    }

    if (!destination?.value) {
      showErrorDialog({
        message: 'Choose a destination before hiring a taxi.',
      });
      return;
    }

    setHirePendingTaxiId(taxi.id);
    try {
      await createRideRequestAsset({
        taxi,
        pickup: userPosition,
        destination: {
          lat: destination.value.lat,
          lng: destination.value.lon,
          label: destination.label,
        },
      });

      showSuccessDialog({
        message:
          taxi.serviceType === 'autonomous'
            ? 'Autonomous taxi hire request created on-chain.'
            : 'Ride request created on-chain for the selected taxi.',
      });
      loadRideData();
    } catch (error) {
      showErrorDialog({
        message: `Failed to create ride request: ${error.message}`,
      });
    } finally {
      setHirePendingTaxiId(null);
    }
  };

  const handleCancelRideRequest = async (ride) => {
    setRideActionPendingId(ride.address);
    try {
      await updateRideRequestAsset({
        address: ride.address,
        currentData: ride.raw,
        updates: {
          status: 'cancelled',
          'cancelled-at': new Date().toISOString(),
          'invoice-status': ride.invoiceStatus || '',
        },
      });
      showSuccessDialog({ message: 'Ride request cancelled on-chain.' });
      loadRideData();
    } catch (error) {
      showErrorDialog({
        message: `Failed to cancel ride request: ${error.message}`,
      });
    } finally {
      setRideActionPendingId(null);
    }
  };

  const handlePayInvoice = async (invoice, ride) => {
    if (!passengerPaymentAccount) {
      showErrorDialog({
        message: 'Enter the passenger payment account before paying invoices.',
      });
      return;
    }

    setInvoicePendingId(invoice.address);
    try {
      await payRideInvoice({
        invoiceAddress: invoice.address,
        fromAccount: passengerPaymentAccount,
      });

      if (ride) {
        await updateRideRequestAsset({
          address: ride.address,
          currentData: ride.raw,
          updates: {
            status: 'paid',
            'invoice-address': invoice.address,
            'invoice-status': 'PAID',
            'paid-at': new Date().toISOString(),
          },
        });
      }

      showSuccessDialog({ message: 'Invoice paid and ride marked as paid.' });
      loadRideData();
    } catch (error) {
      showErrorDialog({
        message: `Failed to pay invoice: ${error.message}`,
      });
    } finally {
      setInvoicePendingId(null);
    }
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

  const invoicesByRideAddress = outstandingInvoices.reduce((acc, invoice) => {
    const rideAddress = extractRideAddressFromInvoice(invoice);
    if (rideAddress && !acc[rideAddress]) {
      acc[rideAddress] = invoice;
    }
    return acc;
  }, {});

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <p>
          Find nearby available taxis in real-time. Drivers post their position
          and status on-chain for transparent, trustless ride matching. Human
          drivers and autonomous taxis can both be hired through on-chain ride
          requests.
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
                      <div style={{ fontSize: 11, opacity: 0.55, marginTop: 1 }}>
                        {taxi.serviceType === 'autonomous'
                          ? 'Autonomous service'
                          : 'Human-operated service'}
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
                      <Button
                        onClick={() => handleHireTaxi(taxi)}
                        disabled={
                          taxi.status !== 'available' ||
                          hirePendingTaxiId === taxi.id
                        }
                        style={{ fontSize: 11, padding: '3px 10px' }}
                      >
                        {hirePendingTaxiId === taxi.id
                          ? 'Hiring...'
                          : taxi.serviceType === 'autonomous'
                            ? 'Hire Auto'
                            : 'Hire'}
                      </Button>
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

      <div style={{ marginTop: 16 }}>
        <FieldSet legend="My Ride Requests & Payments">
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
              Passenger Payment Account
            </label>
            <input
              value={passengerPaymentAccount}
              onChange={(e) =>
                dispatch(setPassengerPaymentAccount(e.target.value))
              }
              placeholder="username:my-nxs-account"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 4,
                border: '1px solid rgba(128,128,128,0.3)',
                background: 'inherit',
                color: 'inherit',
                fontSize: 14,
              }}
            />
            <div style={{ fontSize: 11, opacity: 0.55, marginTop: 4 }}>
              Used for `invoices/pay/invoice` when settling an accepted ride.
            </div>
          </div>

          {rideLoading && rideRequests.length === 0 && (
            <div style={{ fontSize: 13, opacity: 0.6 }}>Loading ride requests...</div>
          )}

          {!rideLoading && rideRequests.length === 0 && (
            <div style={{ fontSize: 13, opacity: 0.6 }}>
              No ride requests yet. Hire a taxi above to create one on-chain.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rideRequests.map((ride) => {
              const invoice = invoicesByRideAddress[ride.address] || null;
              const effectiveStatus =
                ride.status === 'paid'
                  ? 'paid'
                  : ride.status === 'cancelled'
                    ? 'cancelled'
                    : invoice
                      ? 'outstanding'
                      : ride.status;
              const pill = statusPill(effectiveStatus);
              const tripDistance = calculateDistance(
                { lat: ride.pickupLat, lng: ride.pickupLng },
                { lat: ride.destinationLat, lng: ride.destinationLng }
              );

              return (
                <div
                  key={ride.address}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid rgba(128,128,128,0.2)',
                    background: 'rgba(99,102,241,0.04)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {ride.vehicleId || 'Requested taxi'}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.65 }}>
                        {ride.serviceType === 'autonomous'
                          ? 'Autonomous provider'
                          : 'Human driver'}{' '}
                        • {tripDistance.toFixed(1)} km direct trip
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        background: pill.background,
                        color: pill.color,
                      }}
                    >
                      {effectiveStatus}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
                    Created: {formatDate(ride.createdAt)}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    Pickup: {ride.pickupLabel || `${ride.pickupLat.toFixed(5)}, ${ride.pickupLng.toFixed(5)}`}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    Destination: {ride.destinationLabel || `${ride.destinationLat.toFixed(5)}, ${ride.destinationLng.toFixed(5)}`}
                  </div>

                  {invoice && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: 10,
                        borderRadius: 8,
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.2)',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        Outstanding Invoice
                      </div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        Amount: {invoice.amount} NXS
                      </div>
                      <div style={{ fontSize: 12, marginTop: 2 }}>
                        Payment account: {invoice.account}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                        Invoice address: {invoice.address}
                      </div>
                      <Button
                        onClick={() => handlePayInvoice(invoice, ride)}
                        disabled={invoicePendingId === invoice.address}
                        style={{ marginTop: 8, fontSize: 12, padding: '4px 12px' }}
                      >
                        {invoicePendingId === invoice.address ? 'Paying...' : 'Pay Invoice'}
                      </Button>
                    </div>
                  )}

                  {!invoice && ride.status !== 'paid' && ride.status !== 'cancelled' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <Button
                        onClick={() => handleCancelRideRequest(ride)}
                        disabled={rideActionPendingId === ride.address}
                        style={{ fontSize: 12, padding: '4px 12px' }}
                      >
                        {rideActionPendingId === ride.address
                          ? 'Cancelling...'
                          : 'Cancel Request'}
                      </Button>
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
