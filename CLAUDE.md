# CLAUDE.md - NexGo Project Guide

## Project Overview

NexGo is a decentralized taxi hiring service module built for the **Nexus Wallet** ecosystem. Drivers register vehicles and broadcast their GPS positions on-chain as Nexus assets. Passengers find nearby available taxis in real-time through a map interface. The app aligns with the [NexGo web version](https://github.com/AkstonCap/distordia_com/tree/main/nexgo) on Distordia, and uses the [Nexus API](https://github.com/AkstonCap/LLL-TAO) for all blockchain interactions.

## Tech Stack

- **UI**: React 18 (functional components, hooks)
- **State Management**: Redux 4 + React-Redux 8 + Redux-Thunk
- **Styling**: Emotion.js (`@emotion/styled`) + CSS files
- **Maps**: Leaflet + React-Leaflet + Leaflet Routing Machine
- **Geocoding**: OpenStreetMap Nominatim API
- **Address Search**: React-Select (async)
- **Icons**: Lucide-React
- **Build**: Webpack 5 + Babel 7
- **Wallet Integration**: `nexus-module` (provides UI components, wallet data, storage middleware, `apiCall`)
- **Blockchain**: Nexus Assets API via `apiCall` from `nexus-module`

## Directory Structure

```
src/
  index.js                  # Entry point - mounts React app with Redux Provider
  configureStore.js         # Redux store setup with middleware
  App/
    index.js                # App wrapper connecting Redux state
    Main.js                 # Main UI with tab navigation (Passenger / Driver)
    Passenger.js            # Passenger tab - taxi list, map, address search
    Driver.js               # Driver tab - vehicle form, broadcasting, asset management
  api/
    nexusAPI.js             # Nexus blockchain API helpers (asset CRUD, taxi queries)
  components/
    Map.js                  # Leaflet map with taxi markers + geolocation
    RoutingMachine.js       # Route calculation between points
    Map.css                 # Map and marker styling
  actions/
    types.js                # Redux action type constants
    actionCreators.js       # Redux action creators + async thunks
  reducers/
    index.js                # Root reducer combining all slices
    taxi.js                 # Taxi data reducer (taxis list, driver asset, loading)
    settings/               # Persisted user settings (saved to disk)
      vehicleId.js          # Driver's vehicle ID
      vehicleType.js        # Driver's vehicle type
      showingConnections.js # Connection visibility flag
    ui/                     # UI state (saved to session)
      activeTab.js          # Current tab (Passenger/Driver)
      inputValue.js         # Search input value
      broadcasting.js       # Broadcasting active flag
      driverStatus.js       # Driver status (available/occupied)
      userPosition.js       # User GPS position
dist/                       # Build output (dist/js/ is gitignored)
  index.html                # Production HTML entry
  dev.html                  # Development HTML entry
  react.svg                 # Module icon
```

## Commands

### Development

```bash
npm run dev       # Start dev server on port 24011 with hot reload
npm run build     # Production build -> dist/js/app.js
npm install       # Install dependencies
```

There are no test, lint, or type-check commands configured.

### Nexus Wallet Module Installation

1. Run `npm run build` to produce `dist/js/app.js`
2. The module manifest is `nxs_package.json` (production) or `nxs_package.dev.json` (development)
3. Install into Nexus Wallet via Settings > Modules

## Architecture & Patterns

### Redux State Shape

```
state.nexus     - Wallet data from nexus-module (coreInfo, userStatus, theme, initialized)
state.ui        - UI state, persisted to session:
  activeTab       - Current tab ('Passenger' or 'Driver')
  inputValue      - Search input value
  broadcasting    - Whether driver is broadcasting position
  driverStatus    - Driver's current status ('available' or 'occupied')
  userPosition    - User's GPS position { lat, lng }
state.settings  - User settings, persisted to disk:
  vehicleId       - Driver's vehicle ID / license plate
  vehicleType     - Vehicle type (sedan, suv, van, luxury)
  showingConnections - Connection visibility flag
state.taxi      - Taxi data (not persisted):
  taxis           - Array of taxi objects from blockchain
  driverAsset     - Current driver's own taxi asset
  loading         - Taxi fetch loading state
  error           - Error message
  assetOperationPending - Asset create/update in progress
  ratings         - Aggregated ratings per driver genesis { [genesis]: { average, count, avoidCount } }
  myRatings       - Current user's own ratings { [genesis]: { score, avoid } }
  ratingsLoading  - Ratings fetch loading state
  ratingPending   - Rating submit in progress
```

### On-Chain Asset Format (Distordia Standard)

Taxi assets follow the Distordia `nexgo-taxi` standard. Assets are created with JSON format, max 1KB:

| Field | Type | Mutable | Description |
|-------|------|---------|-------------|
| `distordia-type` | string | no | Always `nexgo-taxi` |
| `vehicle-id` | string | yes | License plate / vehicle identifier |
| `vehicle-type` | string | yes | sedan, suv, van, luxury |
| `status` | string | yes | available, occupied, offline |
| `latitude` | string | yes | GPS latitude as string |
| `longitude` | string | yes | GPS longitude as string |
| `driver` | string | yes | Driver wallet address |
| `timestamp` | string | yes | ISO 8601 last update time |

Asset naming convention: `nexgo-taxi-{vehicleId}`

### On-Chain Rating Format (Distordia Standard)

Passenger ratings follow the Distordia `nexgo-rating` standard. Assets are created in **raw format** (state register), one per passenger, max 1KB:

```json
{
  "distordia-type": "nexgo-rating",
  "ratings": {
    "<driver-genesis-hash>": { "score": 4, "avoid": false },
    "<driver-genesis-hash>": { "score": 1, "avoid": true }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `distordia-type` | string | Always `nexgo-rating` |
| `ratings` | object | Map of driver genesis hash to rating entry |
| `ratings[genesis].score` | number | Rating 1 (worst) to 5 (best) |
| `ratings[genesis].avoid` | boolean | If true, driver is flagged as "to be avoided" |

- Asset naming convention: `nexgo-ratings` (local to each passenger's sig chain)
- Format: raw (updatable state register, NOT JSON object register)
- Cost: 1 NXS (create) + 1 NXS (name). Updates cost only the tx fee.
- The app queries all raw assets via `register/list/assets:raw`, parses each one, and aggregates ratings per driver genesis to compute averages.

### Contractual Ride Flow (Design - Using Nexus Invoices API)

The full decentralized ride flow uses Assets for state and Invoices for payment:

1. **Passenger creates ride request asset** (`nexgo-ride` standard, raw format):
   ```json
   {
     "distordia-type": "nexgo-ride",
     "pickup-lat": "40.7128", "pickup-lng": "-74.0060",
     "dest-lat": "40.7589", "dest-lng": "-73.9851",
     "passengers": 2,
     "status": "requesting",
     "driver-genesis": ""
   }
   ```
   Asset name: `nexgo-ride-{timestamp}` (local to passenger's sig chain).

2. **Driver accepts ride**: Driver updates their taxi asset status to `occupied` and the passenger updates the ride asset with the driver's genesis and status `accepted`.

3. **Driver creates invoice** via `invoices/create/invoice`:
   - `recipient`: passenger's genesis/username
   - `account`: driver's NXS payment account
   - `items`: `[{ description: "Ride from X to Y", unit_amount: price, units: 1 }]`
   - The invoice is automatically transferred to the passenger with a conditional contract that requires payment to claim.

4. **Passenger pays invoice** via `invoices/pay/invoice`:
   - `from`: passenger's NXS account
   - Payment is atomic: DEBIT (payment) + CLAIM (invoice ownership transfer) happen in one transaction.
   - On success, ride asset status becomes `paid`.

5. **Ride completion**: Driver updates taxi asset back to `available`. Passenger can rate the driver via the rating system.

6. **Cancellation**: If unpaid, the driver can cancel via `invoices/cancel/invoice`. The ride asset can be updated to `cancelled`.

Key Nexus API endpoints for the contractual flow:
- `invoices/create/invoice` - Driver creates invoice for the ride (requires PIN)
- `invoices/pay/invoice` - Passenger pays the ride invoice (requires PIN)
- `invoices/cancel/invoice` - Driver cancels unpaid invoice
- `invoices/get/invoice` - Get invoice details (status, amount, items)
- `invoices/list/outstanding` - List unpaid invoices for current user
- `assets/create/asset` (raw) - Passenger creates ride request
- `assets/update/asset` (raw) - Update ride request status

All operations are on-chain and decentralized. The Invoice API handles conditional contracts internally - the payment is guaranteed by the blockchain (no escrow needed). Invoices support expiration via the `expires` parameter, and can be voided by the sender if expired.

### Nexus API Endpoints Used

| Endpoint | Purpose | Auth Required |
|----------|---------|---------------|
| `assets/create/asset` | Create new taxi asset (JSON) or rating asset (raw) | Yes (PIN) |
| `assets/update/asset` | Update taxi position/status or rating data | Yes (PIN) |
| `assets/get/asset` | Get specific taxi or rating asset by name | No |
| `assets/list/asset` | List user's own taxi assets | Yes |
| `register/list/assets:asset` | List all taxi assets globally | No |
| `register/list/assets:raw` | List all raw assets globally (for ratings) | No |
| `profiles/status/master` | Check if user is logged in | Yes |
| `invoices/create/invoice` | Create ride invoice (future) | Yes (PIN) |
| `invoices/pay/invoice` | Pay ride invoice (future) | Yes (PIN) |
| `invoices/cancel/invoice` | Cancel unpaid invoice (future) | Yes (PIN) |
| `invoices/get/invoice` | Get invoice details (future) | No |

### Persistence

Redux middleware from `nexus-module` handles persistence automatically:
- `storageMiddleware` saves `state.settings` to disk on every change
- `stateMiddleware` saves `state.ui` to session on every change
- On initialization (`INITIALIZE` action), stored data is hydrated back into state

### Redux Conventions

- **Action types**: `SCREAMING_SNAKE_CASE` constants defined in `src/actions/types.js`
- **Action creators**: Plain functions returning `{ type, payload }` objects, plus async thunks for blockchain ops
- **Reducers**: Use switch statements, pure functions, one file per state slice

### Component Conventions

- **Functional components only** - no class components
- **Hooks**: `useState` for local state, `useSelector`/`useDispatch` for Redux
- **Styled components**: Use `styled()` from `@emotion/styled` wrapping `nexus-module` UI components
- **Nexus UI components**: Import `Panel`, `HorizontalTab`, `TextField`, `Button`, `FieldSet`, `Switch`, `Tooltip`, `confirm`, `apiCall`, `showErrorDialog`, `showSuccessDialog` from `nexus-module`

### Import Paths

Babel module-resolver is configured with `src/` as root, enabling absolute imports:
```js
import Map from 'components/Map';        // resolves to src/components/Map
import { fetchTaxis } from 'actions/actionCreators';
import { createTaxiAsset } from 'api/nexusAPI';
```

## Code Style

- **Prettier**: Single quotes, ES5 trailing commas (configured in `.prettierrc`)
- **Naming**: PascalCase for components/files, camelCase for functions/variables, SCREAMING_SNAKE_CASE for action types
- **Exports**: Default exports for components and reducers
- **JSX Runtime**: Automatic (React import not required in JSX files)
- **Error handling**: Try-catch around API/fetch calls with console.error logging

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `nexus-module` | Nexus Wallet integration (UI components, wallet data, storage, theming, `apiCall`) |
| `leaflet` / `react-leaflet` | Interactive maps with OpenStreetMap tiles |
| `leaflet-routing-machine` | Route calculation and display |
| `react-select` | Async address search dropdown |
| `redux-thunk` | Async Redux actions (blockchain operations) |

## External APIs

- **Nexus Blockchain API**: Asset creation, updates, and queries via `apiCall` from `nexus-module`
- **OpenStreetMap Nominatim**: Address search/geocoding (`https://nominatim.openstreetmap.org/search`)
- **Browser Geolocation API**: Gets user's current location for map centering and driver broadcasting

## Current Limitations

- No test suite (no testing framework configured)
- No linter configured (no ESLint)
- No CI/CD pipeline
- No user authentication beyond wallet connection
- Ride request/payment/invoice flow designed but not yet implemented (see Contractual Ride Flow section)
- Rating asset query fetches all raw assets on chain (could be slow with many raw assets; filtering by data content may improve this in future)
- Driver location updates are manual (secureApiCall requires PIN input per update)

## Working with This Codebase

- Always run `npm install` before first build if `node_modules` is missing
- The dev server runs on port **24011** with CORS enabled
- The app expects to run inside the Nexus Wallet - standalone browser testing is limited
- When adding new Redux state slices, register them in `src/reducers/index.js` and update persistence middleware in `src/configureStore.js` if the data should be saved
- When adding new tabs, update `Main.js` with a new `HorizontalTab` and corresponding component
- When adding new action types, define the constant in `src/actions/types.js` and create the action creator in `src/actions/actionCreators.js`
- The `api/nexusAPI.js` module contains all blockchain interaction functions and the taxi asset schema definition
