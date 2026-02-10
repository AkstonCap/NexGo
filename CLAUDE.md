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

### Nexus API Endpoints Used

| Endpoint | Purpose | Auth Required |
|----------|---------|---------------|
| `assets/create/asset` | Create new taxi asset (JSON format) | Yes |
| `assets/update/asset` | Update taxi position/status | Yes |
| `assets/get/asset` | Get specific taxi asset by name | No |
| `assets/list/asset` | List user's own taxi assets | Yes |
| `register/list/assets:asset` | List all taxi assets globally | No |
| `profiles/status/master` | Check if user is logged in | Yes |

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
- Ride request/payment flow not yet implemented (viewing and broadcasting only)

## Working with This Codebase

- Always run `npm install` before first build if `node_modules` is missing
- The dev server runs on port **24011** with CORS enabled
- The app expects to run inside the Nexus Wallet - standalone browser testing is limited
- When adding new Redux state slices, register them in `src/reducers/index.js` and update persistence middleware in `src/configureStore.js` if the data should be saved
- When adding new tabs, update `Main.js` with a new `HorizontalTab` and corresponding component
- When adding new action types, define the constant in `src/actions/types.js` and create the action creator in `src/actions/actionCreators.js`
- The `api/nexusAPI.js` module contains all blockchain interaction functions and the taxi asset schema definition
