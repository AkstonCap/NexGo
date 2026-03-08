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
    name: 'service-type',
    type: 'string',
    value: 'human',
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
  {
    name: 'timestamp',
    type: 'string',
    value: '',
    mutable: true,
    maxlength: 64,
  },
];

async function resolveProfileGenesis() {
  try {
    const profile = await getProfileStatus();
    return profile?.genesis || '';
  } catch (error) {
    return '';
  }
}

// Create a new taxi asset on-chain using Nexus Assets API (JSON format)
// Endpoint: assets/create/asset
// Requires authenticated session (user must be logged in to wallet)
export async function createTaxiAsset({
  vehicleId,
  vehicleType,
  position,
  pricePerKm,
  serviceType = 'human',
  driver,
}) {
  const driverIdentity = driver || (await resolveProfileGenesis());
  const timestamp = new Date().toISOString();

  const json = TAXI_ASSET_SCHEMA.map((field) => {
    switch (field.name) {
      case 'service-type':
        return { ...field, value: serviceType };
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
      case 'driver':
        return { ...field, value: driverIdentity };
      case 'timestamp':
        return { ...field, value: timestamp };
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
export async function updateTaxiAsset({
  vehicleId,
  vehicleType,
  status,
  position,
  pricePerKm,
  driver,
}) {
  const driverIdentity = driver || (await resolveProfileGenesis());
  const params = {
    name: `nexgo-taxi-${vehicleId}`,
    format: 'basic',
    timestamp: new Date().toISOString(),
  };

  if (vehicleType) params['vehicle-type'] = vehicleType;
  if (status) params.status = status;
  if (driverIdentity) params.driver = driverIdentity;
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
      owner: asset.owner || '',
      vehicleId: asset['vehicle-id'] || 'Unknown',
      type: asset['vehicle-type'] || 'sedan',
      serviceType: asset['service-type'] || 'human',
      status: asset.status || 'available',
      lat: parseFloat(asset.latitude) || 0,
      lng: parseFloat(asset.longitude) || 0,
      pricePerKm: parseFloat(asset['price-per-km']) || 0,
      driver: asset.driver || 'Unknown Driver',
      lastUpdate: asset.timestamp || asset.modified,
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

function safeParseRawData(data) {
  try {
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

function normalizeRideAsset(asset) {
  const parsed = safeParseRawData(asset?.data);

  if (!parsed || parsed['distordia-type'] !== 'nexgo-ride') {
    return null;
  }

  return {
    address: asset.address,
    name: asset.name,
    owner: asset.owner || parsed['passenger-genesis'] || '',
    status: parsed.status || 'requesting',
    taxiOwner: parsed['taxi-owner'] || '',
    taxiName: parsed['taxi-name'] || '',
    vehicleId: parsed['vehicle-id'] || '',
    serviceType: parsed['service-type'] || 'human',
    pickupLat: parseFloat(parsed['pickup-lat']) || 0,
    pickupLng: parseFloat(parsed['pickup-lng']) || 0,
    pickupLabel: parsed['pickup-label'] || '',
    destinationLat: parseFloat(parsed['dest-lat']) || 0,
    destinationLng: parseFloat(parsed['dest-lng']) || 0,
    destinationLabel: parsed['dest-label'] || '',
    invoiceAddress: parsed['invoice-address'] || '',
    invoiceStatus: parsed['invoice-status'] || '',
    createdAt: parsed['created-at'] || '',
    acceptedAt: parsed['accepted-at'] || '',
    paidAt: parsed['paid-at'] || '',
    cancelledAt: parsed['cancelled-at'] || '',
    raw: parsed,
  };
}

function normalizeInvoice(invoice) {
  if (!invoice) return null;

  return {
    address: invoice.address,
    owner: invoice.owner || '',
    recipient: invoice.recipient || '',
    account: invoice.account || '',
    amount: typeof invoice.amount === 'number' ? invoice.amount : parseFloat(invoice.amount) || 0,
    status: invoice.status || 'OUTSTANDING',
    items: Array.isArray(invoice.items) ? invoice.items : [],
    created: invoice.created,
    modified: invoice.modified,
    name: invoice.name || '',
  };
}

export function extractRideAddressFromInvoice(invoice) {
  const descriptions = (invoice?.items || [])
    .map((item) => item?.description || '')
    .filter(Boolean);

  for (const description of descriptions) {
    const match = description.match(/ride=([A-Za-z0-9]+)/i);
    if (match) return match[1];
  }

  return '';
}

// ──────────────────────────────────────────────────────────────────────────────
// Rating System - Distordia Standard: nexgo-rating
// ──────────────────────────────────────────────────────────────────────────────
//
// On-chain rating asset standard (raw format):
//
// Format: raw (state register, updatable)
// Name: nexgo-ratings (local to each passenger's sig chain)
// Cost: 1 NXS (create) + 1 NXS (name)
//
// Data format (JSON string, max 1KB):
// {
//   "distordia-type": "nexgo-rating",
//   "ratings": {
//     "<driver-genesis-hash>": { "score": 1-5, "avoid": true|false },
//     ...
//   }
// }
//
// Fields:
//   distordia-type  string  Always "nexgo-rating" - identifies this standard
//   ratings         object  Map of driver genesis hash to rating entry
//     score         number  Rating score from 1 (worst) to 5 (best)
//     avoid         boolean If true, marks this driver as "to be avoided"
//
// Querying: register/list/assets:raw fetches all raw assets globally.
// The app parses each asset's data field and filters for
// distordia-type === "nexgo-rating" to aggregate ratings per driver.
// ──────────────────────────────────────────────────────────────────────────────

// Create passenger's rating asset (raw format, one per user)
// Endpoint: assets/create/raw
export async function createRatingAsset(initialRatings) {
  const data = JSON.stringify({
    'distordia-type': 'nexgo-rating',
    ratings: initialRatings || {},
  });

  return await secureApiCall('assets/create/asset', {
    name: 'nexgo-ratings',
    format: 'raw',
    data,
  });
}

// Update passenger's rating asset with new ratings data
// Endpoint: assets/update/raw
export async function updateRatingAsset(ratingsData) {
  const data = JSON.stringify({
    'distordia-type': 'nexgo-rating',
    ratings: ratingsData,
  });

  return await secureApiCall('assets/update/asset', {
    name: 'nexgo-ratings',
    format: 'raw',
    data,
  });
}

// Get current user's own rating asset
// Endpoint: assets/get/raw
export async function getMyRatingAsset() {
  try {
    const result = await apiCall('assets/get/asset', {
      name: 'nexgo-ratings',
    });
    if (result && result.data) {
      const parsed = JSON.parse(result.data);
      return { address: result.address, ...parsed };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Fetch all rating assets from chain to compute average ratings
// Endpoint: register/list/assets:raw
// Parses each raw asset's data and filters for nexgo-rating standard
export async function fetchAllRatingsFromChain() {
  try {
    const result = await apiCall('register/list/assets:raw', {
      limit: 500,
    });

    if (!Array.isArray(result)) return {};

    // Aggregate: { genesis: { totalScore, count, avoidCount } }
    const aggregated = {};

    for (const asset of result) {
      try {
        if (!asset.data) continue;
        const parsed = JSON.parse(asset.data);
        if (parsed['distordia-type'] !== 'nexgo-rating') continue;
        if (!parsed.ratings) continue;

        for (const [genesis, entry] of Object.entries(parsed.ratings)) {
          if (!aggregated[genesis]) {
            aggregated[genesis] = { totalScore: 0, count: 0, avoidCount: 0 };
          }
          if (typeof entry.score === 'number' && entry.score >= 1 && entry.score <= 5) {
            aggregated[genesis].totalScore += entry.score;
            aggregated[genesis].count += 1;
          }
          if (entry.avoid) {
            aggregated[genesis].avoidCount += 1;
          }
        }
      } catch (parseErr) {
        // Skip non-JSON or malformed raw assets
        continue;
      }
    }

    // Compute averages
    const ratings = {};
    for (const [genesis, data] of Object.entries(aggregated)) {
      ratings[genesis] = {
        average: data.count > 0 ? data.totalScore / data.count : 0,
        count: data.count,
        avoidCount: data.avoidCount,
      };
    }

    return ratings;
  } catch (error) {
    console.error('Error fetching ratings:', error);
    return {};
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Ride Requests - Distordia Standard: nexgo-ride
// ──────────────────────────────────────────────────────────────────────────────
//
// A passenger creates a raw asset that any driver or autonomous taxi agent can
// observe through the Nexus API and act on without centralized infrastructure.
//
// Data format (JSON string):
// {
//   "distordia-type": "nexgo-ride",
//   "version": 1,
//   "status": "requesting",
//   "taxi-owner": "<provider genesis>",
//   "taxi-name": "nexgo-taxi-...",
//   "vehicle-id": "ABC-123",
//   "service-type": "human|autonomous",
//   "pickup-lat": "...",
//   "pickup-lng": "...",
//   "dest-lat": "...",
//   "dest-lng": "...",
//   "created-at": "2026-03-06T12:00:00.000Z"
// }
// ──────────────────────────────────────────────────────────────────────────────

export async function createRideRequestAsset({ taxi, pickup, destination }) {
  if (!taxi?.owner) {
    throw new Error('Taxi owner is required for a ride request.');
  }

  if (!pickup || !destination) {
    throw new Error('Pickup and destination are required for a ride request.');
  }

  const createdAt = new Date().toISOString();
  const profile = await getProfileStatus();
  const data = JSON.stringify({
    'distordia-type': 'nexgo-ride',
    version: 1,
    status: 'requesting',
    'passenger-genesis': profile?.genesis || '',
    'taxi-owner': taxi.owner,
    'taxi-name': taxi.name || '',
    'vehicle-id': taxi.vehicleId || '',
    'service-type': taxi.serviceType || 'human',
    'pickup-lat': pickup.lat.toString(),
    'pickup-lng': pickup.lng.toString(),
    'pickup-label': pickup.label || '',
    'dest-lat': destination.lat.toString(),
    'dest-lng': destination.lng.toString(),
    'dest-label': destination.label || '',
    'created-at': createdAt,
  });

  return await secureApiCall('assets/create/asset', {
    name: `nexgo-ride-${Date.now()}`,
    format: 'raw',
    data,
  });
}

export async function listMyRideRequests() {
  try {
    const result = await apiCall('assets/list/raw', {});
    if (!Array.isArray(result)) return [];

    return result
      .map(normalizeRideAsset)
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } catch (error) {
    console.error('Error listing my ride requests:', error);
    return [];
  }
}

export async function fetchRideRequestsForTaxiOwner(ownerGenesis) {
  try {
    const result = await apiCall('register/list/assets:raw', {
      limit: 500,
    });

    if (!Array.isArray(result)) return [];

    return result
      .map(normalizeRideAsset)
      .filter(Boolean)
      .filter((ride) => ride.taxiOwner === ownerGenesis)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } catch (error) {
    console.error('Error fetching ride requests:', error);
    return [];
  }
}

export async function updateRideRequestAsset({ address, currentData, updates }) {
  const nextData = {
    ...currentData,
    ...updates,
  };

  return await secureApiCall('assets/update/asset', {
    address,
    format: 'raw',
    data: JSON.stringify(nextData),
  });
}

export async function listOutstandingInvoices() {
  try {
    const result = await apiCall('invoices/list/outstanding', {
      limit: 100,
    });

    if (!Array.isArray(result)) return [];

    return result.map(normalizeInvoice).filter(Boolean);
  } catch (error) {
    console.error('Error listing outstanding invoices:', error);
    return [];
  }
}

export async function createRideInvoice({
  rideRequest,
  paymentAccount,
  amount,
  description,
}) {
  const rideReference = rideRequest.address;
  const rideDescription = `NexGo ride ride=${rideReference}`;
  const finalDescription = description
    ? `${rideDescription} | ${description}`
    : rideDescription;

  return await secureApiCall('invoices/create/invoice', {
    name: `nexgo-invoice-${Date.now()}`,
    account: paymentAccount,
    recipient: rideRequest.owner,
    items: [
      {
        description: finalDescription,
        amount: amount.toString(),
        units: 1,
      },
    ],
  });
}

export async function payRideInvoice({ invoiceAddress, fromAccount }) {
  return await secureApiCall('invoices/pay/invoice', {
    address: invoiceAddress,
    from: fromAccount,
  });
}

export async function cancelRideInvoice(invoiceAddress) {
  return await secureApiCall('invoices/cancel/invoice', {
    address: invoiceAddress,
  });
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
