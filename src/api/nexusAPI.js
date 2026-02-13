import { apiCall, secureApiCall } from 'nexus-module';

// Distordia on-chain asset schema for nexgo-taxi (JSON format, <1KB)
// Fields follow Distordia standard: distordia-type identifies the asset category
export const TAXI_ASSET_SCHEMA = [
  {
    name: 'distordia-type',
    type: 'string',
    value: 'nexgo-taxi',
    mutable: false,
    maxlength: 64,
  },
  {
    name: 'vehicle-id',
    type: 'string',
    value: '',
    mutable: true,
    maxlength: 64,
  },
  {
    name: 'vehicle-type',
    type: 'string',
    value: 'sedan',
    mutable: true,
    maxlength: 64,
  },
  {
    name: 'price-per-km',
    type: 'string',
    value: '0',
    mutable: true,
    maxlength: 64,
  },
  {
    name: 'status',
    type: 'string',
    value: 'offline',
    mutable: true,
    maxlength: 64,
  },
  {
    name: 'latitude',
    type: 'string',
    value: '0.000000',
    mutable: true,
    maxlength: 64,
  },
  {
    name: 'longitude',
    type: 'string',
    value: '0.000000',
    mutable: true,
    maxlength: 64,
  },
  {
    name: 'driver',
    type: 'string',
    value: '',
    mutable: true,
    maxlength: 128,
  },
];

// Create a new taxi asset on-chain using Nexus Assets API (JSON format)
// Endpoint: assets/create/asset
// Requires authenticated session (user must be logged in to wallet)
export async function createTaxiAsset({ vehicleId, vehicleType, position, pricePerKm }) {
  const json = TAXI_ASSET_SCHEMA.map((field) => {
    switch (field.name) {
      case 'vehicle-id':
        return { ...field, value: vehicleId };
      case 'vehicle-type':
        return { ...field, value: vehicleType };
      case 'price-per-km':
        return { ...field, value: pricePerKm != null ? pricePerKm.toString() : '0' };
      case 'latitude':
        return { ...field, value: position ? position.lat.toString() : '0' };
      case 'longitude':
        return { ...field, value: position ? position.lng.toString() : '0' };
      case 'status':
        return { ...field, value: 'available' };
      default:
        return field;
    }
  });

  return await secureApiCall('assets/create/asset', {
    name: `nexgo-taxi-${vehicleId}`,
    format: 'JSON',
    json,
  });
}

// Update an existing taxi asset on-chain
// Endpoint: assets/update/asset
// Only mutable fields can be updated
export async function updateTaxiAsset({ vehicleId, vehicleType, status, position, pricePerKm }) {
  const params = {
    name: `nexgo-taxi-${vehicleId}`,
    format: 'basic',
  };

  if (vehicleType) params['vehicle-type'] = vehicleType;
  if (status) params.status = status;
  if (pricePerKm != null) params['price-per-km'] = pricePerKm.toString();
  if (position) {
    params.latitude = position.lat.toString();
    params.longitude = position.lng.toString();
  }

  return await secureApiCall('assets/update/asset', params);
}

// Fetch all nexgo-taxi assets from the blockchain (public, no auth required)
// Endpoint: register/list/assets:asset
// Uses Distordia standard where clause to filter by distordia-type
export async function fetchTaxisFromChain() {
  const result = await apiCall('register/list/assets:asset', {
    where: "results.distordia-type=nexgo-taxi AND results.status!=offline",
    limit: 100,
  });

  if (Array.isArray(result)) {
    return result.map((asset) => ({
      id: asset.address,
      vehicleId: asset['vehicle-id'] || 'Unknown',
      type: asset['vehicle-type'] || 'sedan',
      status: asset.status || 'available',
      lat: parseFloat(asset.latitude) || 0,
      lng: parseFloat(asset.longitude) || 0,
      pricePerKm: parseFloat(asset['price-per-km']) || 0,
      driver: asset.driver || 'Unknown Driver',
      lastUpdate: asset.modified,
      name: asset.name,
    }));
  }

  return [];
}

// Get a specific taxi asset by name
// Endpoint: assets/get/asset
export async function getTaxiAsset(vehicleId) {
  return await apiCall('assets/get/asset', {
    name: `nexgo-taxi-${vehicleId}`,
  });
}

// List the current user's taxi assets
// Endpoint: assets/list/asset
export async function listMyTaxiAssets() {
  try {
    const result = await apiCall('assets/list/asset', {
      where: "results.distordia-type=nexgo-taxi",
    });
    return Array.isArray(result) ? result : [];
  } catch (error) {
    return [];
  }
}

// Get profile status to check if user is logged in
// Endpoint: profiles/status/master
export async function getProfileStatus() {
  return await apiCall('profiles/status/master', {});
}

// Haversine distance calculation (km) - matches web version
export function calculateDistance(pos1, pos2) {
  const R = 6371;
  const dLat = ((pos2.lat - pos1.lat) * Math.PI) / 180;
  const dLng = ((pos2.lng - pos1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((pos1.lat * Math.PI) / 180) *
      Math.cos((pos2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
