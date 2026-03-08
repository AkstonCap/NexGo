import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  FieldSet,
  Button,
  TextField,
  showErrorDialog,
  showSuccessDialog,
} from 'nexus-module';
import AsyncSelect from 'react-select/async';
import Map from 'components/Map';
import {
  setVehicleId,
  setVehicleType,
  setDriverPaymentAccount,
  setDriverStatus,
  setBroadcasting,
  setUserPosition,
  createAsset,
  updateAsset,
  loadDriverAsset,
} from 'actions/actionCreators';
import {
  calculateDistance,
  cancelRideInvoice,
  createRideInvoice,
  extractRideAddressFromInvoice,
  fetchRideRequestsForTaxiOwner,
  getProfileStatus,
  listOutstandingInvoices,
} from 'api/nexusAPI';

function formatDate(value) {
  if (!value) return 'Unknown';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

const loadLocationOptions = (inputValue, callback) => {
  fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${inputValue}`
  )
    .then((response) => response.json())
    .then((data) => {
      const options = data.map((item) => ({
        label: item.display_name,
        value: {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        },
      }));
      callback(options);
    })
    .catch((error) => {
      console.error('Error fetching address suggestions:', error);
      callback([]);
    });
};

export default function Driver() {
  const vehicleId = useSelector((state) => state.settings.vehicleId);
  const vehicleType = useSelector((state) => state.settings.vehicleType);
  const driverPaymentAccount = useSelector(
    (state) => state.settings.driverPaymentAccount
  );
  const driverStatus = useSelector((state) => state.ui.driverStatus);
  const broadcasting = useSelector((state) => state.ui.broadcasting);
  const userPosition = useSelector((state) => state.ui.userPosition);
  const driverAsset = useSelector((state) => state.taxi.driverAsset);
  const assetPending = useSelector(
    (state) => state.taxi.assetOperationPending
  );
  const dispatch = useDispatch();
  const [driverGenesis, setDriverGenesis] = useState('');
  const [rideRequests, setRideRequests] = useState([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState([]);
  const [ridesLoading, setRidesLoading] = useState(false);
  const [invoiceDrafts, setInvoiceDrafts] = useState({});
  const [requestActionPendingId, setRequestActionPendingId] = useState(null);
  const [invoiceActionPendingId, setInvoiceActionPendingId] = useState(null);

  const loadSettlementData = async (ownerGenesis = driverGenesis) => {
    if (!ownerGenesis) {
      setRideRequests([]);
      setOutstandingInvoices([]);
      return;
    }

    setRidesLoading(true);
    try {
      const [rides, invoices] = await Promise.all([
        fetchRideRequestsForTaxiOwner(ownerGenesis),
        listOutstandingInvoices(),
      ]);

      setRideRequests(rides);
      setOutstandingInvoices(invoices);
      setInvoiceDrafts((prev) => {
        const next = { ...prev };
        rides.forEach((ride) => {
          if (!next[ride.address]) {
            next[ride.address] = {
              amount: '',
              description: '',
            };
          }
        });
        return next;
      });
    } catch (error) {
      console.error('Error loading settlement data:', error);
    } finally {
      setRidesLoading(false);
    }
  };

  // Load driver's existing asset on mount
  useEffect(() => {
    dispatch(loadDriverAsset());
  }, [dispatch]);

  useEffect(() => {
    let disposed = false;

    async function loadProfile() {
      try {
        const profile = await getProfileStatus();
        if (disposed) return;

        const nextGenesis = driverAsset?.driver || profile?.genesis || '';
        setDriverGenesis(nextGenesis);
        if (nextGenesis) {
          loadSettlementData(nextGenesis);
        }
      } catch (error) {
        console.error('Error loading driver profile status:', error);
      }
    }

    loadProfile();

    return () => {
      disposed = true;
    };
  }, [driverAsset]);

  useEffect(() => {
    if (!driverGenesis) return undefined;

    const interval = setInterval(() => {
      loadSettlementData(driverGenesis);
    }, 10000);

    return () => clearInterval(interval);
  }, [driverGenesis]);

  // Track GPS position locally when broadcasting (no on-chain updates)
  useEffect(() => {
    if (!broadcasting) return;

    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        dispatch(
          setUserPosition({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
        );
      },
      (err) => console.error('GPS error:', err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [broadcasting, dispatch]);

  const handleCreateAsset = async () => {
    if (!vehicleId) {
      showErrorDialog({ message: 'Please enter your Vehicle ID.' });
      return;
    }
    try {
      await dispatch(
        createAsset({
          vehicleId,
          vehicleType,
          position: userPosition,
        })
      );
      showSuccessDialog({
        message: `Taxi asset "nexgo-taxi-${vehicleId}" created on-chain.`,
      });
    } catch (error) {
      showErrorDialog({
        message: `Failed to create asset: ${error.message}`,
      });
    }
  };

  const handleStartBroadcasting = async () => {
    if (!vehicleId) {
      showErrorDialog({ message: 'Please enter your Vehicle ID.' });
      return;
    }
    if (!userPosition) {
      showErrorDialog({
        message:
          'Location not set. Search for an address or click on the map to set your position.',
      });
      return;
    }
    if (!driverAsset) {
      showErrorDialog({
        message:
          'No taxi asset found. Please create your taxi asset first before broadcasting.',
      });
      return;
    }

    // Update asset to current status and position on-chain
    try {
      await dispatch(
        updateAsset({
          vehicleId,
          vehicleType,
          status: driverStatus,
          position: userPosition,
        })
      );
      dispatch(setBroadcasting(true));
      showSuccessDialog({
        message: 'Broadcasting started. Your position is now visible on-chain.',
      });
    } catch (error) {
      showErrorDialog({
        message: `Failed to update asset on-chain: ${error.message}. Broadcasting not started.`,
      });
    }
  };

  const handleStopBroadcasting = async () => {
    dispatch(setBroadcasting(false));

    // Set status to offline on-chain
    try {
      await dispatch(
        updateAsset({
          vehicleId,
          vehicleType,
          status: 'offline',
          position: userPosition,
        })
      );
    } catch (error) {
      console.error('Failed to set offline status:', error);
    }
  };

  // Manual location update button handler (replaces automatic interval)
  const handleUpdateLocation = async () => {
    if (!vehicleId || !userPosition) return;
    try {
      await dispatch(
        updateAsset({
          vehicleId,
          vehicleType,
          status: driverStatus,
          position: userPosition,
        })
      );
      showSuccessDialog({ message: 'Location updated on-chain.' });
    } catch (error) {
      showErrorDialog({
        message: `Failed to update location: ${error.message}`,
      });
    }
  };

  const handleUpdateAsset = async () => {
    if (!vehicleId) {
      showErrorDialog({ message: 'Please enter your Vehicle ID.' });
      return;
    }
    try {
      await dispatch(
        updateAsset({
          vehicleId,
          vehicleType,
          status: driverStatus,
          position: userPosition,
        })
      );
      showSuccessDialog({ message: 'Taxi asset updated on-chain.' });
    } catch (error) {
      showErrorDialog({
        message: `Failed to update asset: ${error.message}`,
      });
    }
  };

  const handleDraftChange = (rideAddress, field, value) => {
    setInvoiceDrafts((prev) => ({
      ...prev,
      [rideAddress]: {
        ...(prev[rideAddress] || {}),
        [field]: value,
      },
    }));
  };

  const handleCreateInvoice = async (ride) => {
    const draft = invoiceDrafts[ride.address] || {};
    const parsedAmount = parseFloat(draft.amount);

    if (!driverPaymentAccount) {
      showErrorDialog({
        message: 'Enter the driver settlement account before creating invoices.',
      });
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showErrorDialog({
        message: 'Enter a valid invoice amount greater than zero.',
      });
      return;
    }

    setRequestActionPendingId(ride.address);
    try {
      await createRideInvoice({
        rideRequest: ride,
        paymentAccount: driverPaymentAccount,
        amount: parsedAmount,
        description: draft.description,
      });

      await dispatch(
        updateAsset({
          vehicleId,
          vehicleType,
          status: 'occupied',
          position: userPosition,
        })
      );

      showSuccessDialog({
        message: 'Invoice created. The passenger can now pay the ride on-chain.',
      });
      loadSettlementData(driverGenesis);
    } catch (error) {
      showErrorDialog({
        message: `Failed to create invoice: ${error.message}`,
      });
    } finally {
      setRequestActionPendingId(null);
    }
  };

  const handleCancelInvoice = async (invoice) => {
    setInvoiceActionPendingId(invoice.address);
    try {
      await cancelRideInvoice(invoice.address);
      showSuccessDialog({ message: 'Invoice cancelled on-chain.' });
      loadSettlementData(driverGenesis);
    } catch (error) {
      showErrorDialog({
        message: `Failed to cancel invoice: ${error.message}`,
      });
    } finally {
      setInvoiceActionPendingId(null);
    }
  };

  const handlePositionSelect = (pos) => {
    dispatch(setUserPosition(pos));
  };

  const handleLocationSearch = (opt) => {
    if (opt && opt.value) {
      dispatch(setUserPosition(opt.value));
    }
  };

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
          Register your vehicle and broadcast your position on-chain. Passengers
          will see you on the map and can hire you with an on-chain ride
          request. Autonomous fleets can also register compatible taxi assets
          directly through the Nexus API.
        </p>
      </div>

      <FieldSet legend="Vehicle Information">
        <div style={{ marginBottom: 12 }}>
          <label
            style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}
          >
            Vehicle ID / License Plate
          </label>
          <TextField
            value={vehicleId}
            onChange={(e) => dispatch(setVehicleId(e.target.value))}
            placeholder="e.g., ABC-1234"
            disabled={broadcasting}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label
            style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}
          >
            Vehicle Type
          </label>
          <select
            value={vehicleType}
            onChange={(e) => dispatch(setVehicleType(e.target.value))}
            disabled={broadcasting}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid rgba(128,128,128,0.3)',
              background: 'inherit',
              color: 'inherit',
              fontSize: 14,
            }}
          >
            <option value="sedan">Sedan (4 passengers)</option>
            <option value="suv">SUV (6 passengers)</option>
            <option value="van">Van (8 passengers)</option>
            <option value="luxury">Luxury</option>
          </select>
        </div>
      </FieldSet>

      <FieldSet legend="Status">
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Button
            onClick={() => dispatch(setDriverStatus('available'))}
            style={{
              flex: 1,
              background:
                driverStatus === 'available'
                  ? 'rgba(34,197,94,0.15)'
                  : undefined,
              color: driverStatus === 'available' ? '#22c55e' : undefined,
              border:
                driverStatus === 'available'
                  ? '2px solid #22c55e'
                  : '2px solid transparent',
            }}
          >
            Available
          </Button>
          <Button
            onClick={() => dispatch(setDriverStatus('occupied'))}
            style={{
              flex: 1,
              background:
                driverStatus === 'occupied'
                  ? 'rgba(239,68,68,0.15)'
                  : undefined,
              color: driverStatus === 'occupied' ? '#ef4444' : undefined,
              border:
                driverStatus === 'occupied'
                  ? '2px solid #ef4444'
                  : '2px solid transparent',
            }}
          >
            Occupied
          </Button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {!broadcasting ? (
            <Button
              onClick={handleStartBroadcasting}
              disabled={assetPending || !driverAsset}
              style={{ flex: 1 }}
            >
              Start Broadcasting
            </Button>
          ) : (
            <Button
              onClick={handleStopBroadcasting}
              style={{
                flex: 1,
                background: 'rgba(239,68,68,0.15)',
                color: '#ef4444',
              }}
            >
              Stop Broadcasting
            </Button>
          )}
        </div>

        {!driverAsset && !broadcasting && (
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              opacity: 0.6,
            }}
          >
            Create your taxi asset first to enable broadcasting.
          </div>
        )}

        {broadcasting && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 8,
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.3)',
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              Broadcasting Active
            </div>
            <div style={{ marginBottom: 8 }}>
              Your taxi is visible on-chain. Location tracking stays local until
              you manually push the current coordinates to the blockchain.
            </div>
            <Button
              onClick={handleUpdateLocation}
              disabled={assetPending || !userPosition}
              style={{ width: '100%' }}
            >
              {assetPending ? 'Updating...' : 'Update Location On-Chain'}
            </Button>
          </div>
        )}
      </FieldSet>

      <FieldSet legend="Location">
        <div style={{ marginBottom: 8 }}>
          <AsyncSelect
            cacheOptions
            loadOptions={loadLocationOptions}
            onChange={handleLocationSearch}
            placeholder="Search for your location..."
            styles={{
              control: (base) => ({ ...base, marginBottom: 4 }),
            }}
          />
          <div style={{ fontSize: 11, opacity: 0.5 }}>
            Or click directly on the map below to set your position.
          </div>
        </div>
        {userPosition ? (
          <div style={{ fontSize: 13, marginBottom: 8 }}>
            <div>
              Lat: {userPosition.lat.toFixed(6)}, Lng:{' '}
              {userPosition.lng.toFixed(6)}
            </div>
          </div>
        ) : (
          <div style={{ opacity: 0.6, marginBottom: 8 }}>
            Location not set. Use the search above or click on the map.
          </div>
        )}
        <Map
          userPosition={userPosition}
          taxis={[]}
          onPositionSelect={handlePositionSelect}
        />
      </FieldSet>

      <FieldSet legend="On-Chain Asset Management">
        {driverAsset ? (
          <div>
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.3)',
                marginBottom: 12,
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                Your Taxi Asset
              </div>
              <div>Name: nexgo-taxi-{driverAsset['vehicle-id'] || vehicleId}</div>
              <div>Type: {driverAsset['distordia-type'] || 'nexgo-taxi'}</div>
              <div>Vehicle: {driverAsset['vehicle-id']}</div>
              <div>Vehicle Type: {driverAsset['vehicle-type']}</div>
              <div>Status: {driverAsset.status}</div>
              {driverAsset.address && (
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                  Address: {driverAsset.address}
                </div>
              )}
            </div>
            <Button
              onClick={handleUpdateAsset}
              disabled={assetPending || !vehicleId}
              style={{ width: '100%' }}
            >
              {assetPending ? 'Updating...' : 'Update Asset On-Chain'}
            </Button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13, marginBottom: 12, opacity: 0.7 }}>
              No taxi asset found for your profile. Create one to register your
              vehicle on the Nexus blockchain. Cost: 1 NXS + 1 NXS for name.
            </p>
            <Button
              onClick={handleCreateAsset}
              disabled={assetPending || !vehicleId}
              style={{ width: '100%' }}
            >
              {assetPending ? 'Creating...' : 'Create Taxi Asset'}
            </Button>
          </div>
        )}
      </FieldSet>

      <FieldSet legend="Ride Requests & Settlement">
        <div style={{ marginBottom: 12 }}>
          <label
            style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}
          >
            Driver Settlement Account
          </label>
          <TextField
            value={driverPaymentAccount}
            onChange={(e) => dispatch(setDriverPaymentAccount(e.target.value))}
            placeholder="username:driver-nxs-account"
          />
          <div style={{ fontSize: 11, opacity: 0.55, marginTop: 4 }}>
            Used as the `account` parameter for `invoices/create/invoice`.
          </div>
        </div>

        {!driverAsset && (
          <div style={{ fontSize: 13, opacity: 0.6 }}>
            Create or load your taxi asset to receive ride requests.
          </div>
        )}

        {driverAsset && ridesLoading && rideRequests.length === 0 && (
          <div style={{ fontSize: 13, opacity: 0.6 }}>
            Loading incoming ride requests...
          </div>
        )}

        {driverAsset && !ridesLoading && rideRequests.length === 0 && (
          <div style={{ fontSize: 13, opacity: 0.6 }}>
            No ride requests are currently targeting this taxi.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rideRequests.map((ride) => {
            const invoice = invoicesByRideAddress[ride.address] || null;
            const tripDistance = calculateDistance(
              { lat: ride.pickupLat, lng: ride.pickupLng },
              { lat: ride.destinationLat, lng: ride.destinationLng }
            );
            const draft = invoiceDrafts[ride.address] || {};

            return (
              <div
                key={ride.address}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid rgba(128,128,128,0.2)',
                  background: 'rgba(16,185,129,0.04)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {ride.vehicleId || 'Ride request'}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.65 }}>
                      {ride.serviceType === 'autonomous'
                        ? 'Autonomous request'
                        : 'Human-driven request'}{' '}
                      • {tripDistance.toFixed(1)} km direct trip
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>
                      Requested: {formatDate(ride.createdAt)}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      background: invoice
                        ? 'rgba(245,158,11,0.15)'
                        : 'rgba(99,102,241,0.15)',
                      color: invoice ? '#f59e0b' : '#6366f1',
                    }}
                  >
                    {invoice ? 'invoice issued' : ride.status}
                  </div>
                </div>

                <div style={{ fontSize: 12, marginTop: 8 }}>
                  Pickup: {ride.pickupLabel || `${ride.pickupLat.toFixed(5)}, ${ride.pickupLng.toFixed(5)}`}
                </div>
                <div style={{ fontSize: 12, marginTop: 2 }}>
                  Destination: {ride.destinationLabel || `${ride.destinationLat.toFixed(5)}, ${ride.destinationLng.toFixed(5)}`}
                </div>
                <div style={{ fontSize: 11, opacity: 0.55, marginTop: 4 }}>
                  Passenger genesis: {ride.owner}
                </div>

                {invoice ? (
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
                      Account: {invoice.account}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                      Invoice address: {invoice.address}
                    </div>
                    <Button
                      onClick={() => handleCancelInvoice(invoice)}
                      disabled={invoiceActionPendingId === invoice.address}
                      style={{ marginTop: 8, fontSize: 12, padding: '4px 12px' }}
                    >
                      {invoiceActionPendingId === invoice.address
                        ? 'Cancelling...'
                        : 'Cancel Invoice'}
                    </Button>
                  </div>
                ) : (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                        Invoice amount (NXS)
                      </label>
                      <input
                        value={draft.amount || ''}
                        onChange={(e) =>
                          handleDraftChange(ride.address, 'amount', e.target.value)
                        }
                        placeholder="e.g. 12.5"
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
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                        Invoice description
                      </label>
                      <input
                        value={draft.description || ''}
                        onChange={(e) =>
                          handleDraftChange(
                            ride.address,
                            'description',
                            e.target.value
                          )
                        }
                        placeholder="Pickup to destination ride"
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
                    </div>
                    <Button
                      onClick={() => handleCreateInvoice(ride)}
                      disabled={requestActionPendingId === ride.address}
                      style={{ fontSize: 12, padding: '4px 12px' }}
                    >
                      {requestActionPendingId === ride.address
                        ? 'Creating Invoice...'
                        : 'Accept & Create Invoice'}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </FieldSet>
    </>
  );
}
