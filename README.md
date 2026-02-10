# NexGo

**Decentralized taxi hiring service built on the Nexus blockchain.**

NexGo is a Nexus Wallet module that lets drivers register their vehicles on-chain and broadcast their GPS positions in real-time. Passengers can discover nearby available taxis, see them on a live map, and search for destinations — all without a centralized server.

---

## How it works

NexGo has two modes, accessible via tabs inside the module:

### 🚕 Passenger mode

- **Find taxis** — The passenger view automatically queries the Nexus blockchain for all active taxi assets and displays them on an interactive map.
- **Search destinations** — Type an address into the search bar (powered by OpenStreetMap/Nominatim) to set your destination and see routing on the map.
- **Distance sorting** — Available taxis are listed by distance from your current GPS position, with estimated travel times.
- The taxi list refreshes every 10 seconds.

### 🚗 Driver mode

- **Register your vehicle** — Enter your Vehicle ID / license plate and select your vehicle type (sedan, SUV, van, or luxury).
- **Create a Taxi Asset** — Click "Create Taxi Asset" to write your vehicle to the Nexus blockchain as an on-chain asset. This costs 2 NXS (1 for the asset register + 1 for the name). You will be prompted for your PIN.
- **Broadcast your position** — Click "Start Broadcasting" to begin posting your GPS coordinates and status on-chain every 30 seconds. Passengers anywhere on the network can then discover you.
- **Set your status** — Toggle between **Available** and **Occupied** to let passengers know whether you can accept rides.
- **Update your asset** — Manually push your current status and location to the blockchain at any time via "Update Asset On-Chain".
- **Stop broadcasting** — Click "Stop Broadcasting" to set your on-chain status to offline and stop position updates.

### On-chain data

Each taxi is stored as a Nexus `asset` register using the JSON format with the following fields:

| Field | Type | Mutable | Description |
|-------|------|---------|-------------|
| `distordia-type` | string | No | Always `nexgo-taxi` — used to identify and filter taxi assets |
| `vehicle-id` | string | Yes | Driver's vehicle ID or license plate |
| `vehicle-type` | string | Yes | `sedan`, `suv`, `van`, or `luxury` |
| `status` | string | Yes | `available`, `occupied`, or `offline` |
| `latitude` | string | Yes | Current GPS latitude |
| `longitude` | string | Yes | Current GPS longitude |
| `driver` | string | Yes | Driver identifier |
| `timestamp` | string | Yes | ISO 8601 timestamp of last update |

Assets are queried network-wide using `register/list/assets:asset` with a WHERE clause filtering on `distordia-type=nexgo-taxi`.

---

## Prerequisites

- [Nexus Wallet](https://github.com/Nexusoft/NexusInterface/releases/latest) v3.1.5 or later
- A Nexus user account (profile) — you must be logged in to the wallet
- At least 2 NXS in your account to create a taxi asset
- GPS / location services enabled in your browser

---

## Installation

### From a release

1. Download the latest NexGo `.zip` from the releases page.
2. Open Nexus Wallet → **Settings** → **Modules**.
3. Drag and drop the `.zip` file into the "Add module" section and click **Install module**.
4. The wallet will refresh and a **NexGo** item will appear in the bottom navigation bar.

### From source (development)

```bash
# Clone the repository
git clone https://github.com/AkstonCap/NexGo.git
cd NexGo

# Install dependencies
npm install

# Start the dev server (with hot reload)
npm run dev

# Or build for production
npm run build
```

When developing, use `nxs_package.dev.json` to point the wallet at your local dev server. See the [Nexus Module Development docs](Nexus%20API%20docs/Modules/README.md) for details.

---

## Usage walkthrough

### As a driver

1. Open NexGo in the wallet and switch to the **Driver** tab.
2. Enter your **Vehicle ID** (e.g. your license plate) and choose a **Vehicle Type**.
3. Click **Create Taxi Asset** — you will be prompted for your wallet PIN. This registers your vehicle on the blockchain.
4. Set your status to **Available**.
5. Click **Start Broadcasting** — your GPS position will be updated on-chain every 30 seconds.
6. When you're done for the day, click **Stop Broadcasting**. Your on-chain status will be set to offline.

### As a passenger

1. Open NexGo in the wallet and stay on the **Passenger** tab.
2. Allow location access so NexGo can show taxis near you.
3. Available taxis appear on the map and in a sorted list below it.
4. Use the search bar to enter a destination and see a route on the map.
5. Click **Refresh** to manually update the taxi list, or wait for the 10-second auto-refresh.

---

## Nexus API endpoints used

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `assets/create/asset` | PIN (secureApiCall) | Register a new taxi asset on-chain |
| `assets/update/asset` | PIN (secureApiCall) | Update taxi position, status, or vehicle info |
| `assets/get/asset` | Session | Retrieve a specific taxi asset by name |
| `assets/list/asset` | Session | List the logged-in driver's taxi assets |
| `register/list/assets:asset` | Public | Query all taxi assets network-wide (passenger view) |
| `profiles/status/master` | Session | Check if the user is logged in |

---

## Project structure

```
src/
├── index.js                  # Redux store setup and entry point
├── configureStore.js         # Store configuration with redux-thunk
├── api/
│   └── nexusAPI.js           # All Nexus blockchain API calls and asset schema
├── actions/
│   ├── actionCreators.js     # Redux action creators and async thunks
│   └── types.js              # Action type constants
├── reducers/                 # Redux state management
│   ├── index.js
│   ├── taxi.js               # Taxi list, driver asset, loading states
│   ├── settings/             # Persisted settings (vehicleId, vehicleType)
│   └── ui/                   # UI state (activeTab, broadcasting, position)
├── components/
│   ├── Map.js                # Leaflet map component
│   ├── Map.css               # Map styles
│   └── RoutingMachine.js     # Leaflet routing integration
└── App/
    ├── index.js              # App wrapper with ModuleWrapper
    ├── Main.js               # Tab navigation (Passenger / Driver)
    ├── Passenger.js           # Passenger view — find taxis, set destination
    └── Driver.js              # Driver view — register vehicle, broadcast
```

---

## License

MIT
