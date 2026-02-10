import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  FieldSet,
  Button,
  TextField,
  showErrorDialog,
  showSuccessDialog,
} from 'nexus-module';
import Map from 'components/Map';
import {
  setVehicleId,
  setVehicleType,
  setDriverStatus,
  setBroadcasting,
  setUserPosition,
  createAsset,
  updateAsset,
  broadcastPosition,
  loadDriverAsset,
  fetchTaxis,
} from 'actions/actionCreators';

const UPDATE_INTERVAL = 30000; // 30 seconds, matching web version

export default function Driver() {
  const vehicleId = useSelector((state) => state.settings.vehicleId);
  const vehicleType = useSelector((state) => state.settings.vehicleType);
  const driverStatus = useSelector((state) => state.ui.driverStatus);
  const broadcasting = useSelector((state) => state.ui.broadcasting);
  const userPosition = useSelector((state) => state.ui.userPosition);
  const driverAsset = useSelector((state) => state.taxi.driverAsset);
  const assetPending = useSelector(
    (state) => state.taxi.assetOperationPending
  );
  const userStatus = useSelector((state) => state.nexus.userStatus);
  const dispatch = useDispatch();
  const broadcastRef = useRef(null);

  // Load driver's existing asset on mount
  useEffect(() => {
    dispatch(loadDriverAsset());
  }, [dispatch]);

  // Update GPS position periodically when broadcasting
  useEffect(() => {
    if (!broadcasting) return;

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

  // Broadcast position at intervals
  useEffect(() => {
    if (!broadcasting || !userPosition || !vehicleId) return;

    broadcastRef.current = setInterval(() => {
      dispatch(
        broadcastPosition({
          vehicleId,
          vehicleType,
          status: driverStatus,
          position: userPosition,
        })
      );
    }, UPDATE_INTERVAL);

    return () => {
      if (broadcastRef.current) {
        clearInterval(broadcastRef.current);
      }
    };
  }, [broadcasting, userPosition, vehicleId, vehicleType, driverStatus, dispatch]);

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
      showErrorDialog({ message: 'Waiting for GPS location...' });
      return;
    }

    // Update asset to current status before broadcasting
    try {
      await dispatch(
        updateAsset({
          vehicleId,
          vehicleType,
          status: driverStatus,
          position: userPosition,
        })
      );
    } catch (error) {
      // Asset might not exist yet, create it
      try {
        await dispatch(
          createAsset({
            vehicleId,
            vehicleType,
            position: userPosition,
          })
        );
      } catch (createError) {
        showErrorDialog({
          message: `Failed to create/update asset: ${createError.message}`,
        });
        return;
      }
    }

    dispatch(setBroadcasting(true));
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

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <p>
          Register your vehicle and broadcast your position on-chain. Passengers
          will see you on the map and can request rides.
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
              disabled={assetPending}
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
            <div>Position updates every 30 seconds on-chain.</div>
          </div>
        )}
      </FieldSet>

      <FieldSet legend="Location">
        {userPosition ? (
          <div style={{ fontSize: 13 }}>
            <div>
              Lat: {userPosition.lat.toFixed(6)}, Lng:{' '}
              {userPosition.lng.toFixed(6)}
            </div>
          </div>
        ) : (
          <div style={{ opacity: 0.6 }}>Waiting for GPS...</div>
        )}
        <Map userPosition={userPosition} taxis={[]} />
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
    </>
  );
}
