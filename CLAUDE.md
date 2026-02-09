# CLAUDE.md - NexGo Project Guide

## Project Overview

NexGo is a ride-sharing/taxi application module built for the **Nexus Wallet** ecosystem. It allows users to find rides and request transportation, act as drivers, view routes on an interactive map, and pay using NXS (Nexus cryptocurrency). The app runs inside the Nexus Wallet as a module, not as a standalone application.

## Tech Stack

- **UI**: React 18 (functional components, hooks)
- **State Management**: Redux 4 + React-Redux 8 + Redux-Thunk
- **Styling**: Emotion.js (`@emotion/styled`) + CSS files
- **Maps**: Leaflet + React-Leaflet + Leaflet Routing Machine
- **Geocoding**: OpenStreetMap Nominatim API
- **Address Search**: React-Select (async)
- **Icons**: Lucide-React
- **Build**: Webpack 5 + Babel 7
- **Wallet Integration**: `nexus-module` (provides UI components, wallet data, storage middleware)

## Directory Structure

```
src/
  index.js                  # Entry point - mounts React app with Redux Provider
  configureStore.js         # Redux store setup with middleware
  App/
    index.js                # App wrapper connecting Redux state
    Main.js                 # Main UI with tab navigation (FindRide / Drive)
    findRide.js             # Find ride tab - address search + map
    drive.js                # Drive tab - driver view (placeholder)
  components/
    Map.js                  # Leaflet map with geolocation + markers
    RoutingMachine.js       # Route calculation between points
    Map.css                 # Map styling
  actions/
    types.js                # Redux action type constants
    actionCreators.js       # Redux action creators
  reducers/
    index.js                # Root reducer combining all slices
    ride.js                 # Ride data reducer
    settings/               # Persisted user settings (saved to disk)
    ui/                     # UI state (saved to session)
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
state.ui        - UI state, persisted to session (activeTab, inputValue)
state.settings  - User settings, persisted to disk (showingConnections)
state.ride      - Ride data (rides array)
```

### Persistence

Redux middleware from `nexus-module` handles persistence automatically:
- `storageMiddleware` saves `state.settings` to disk on every change
- `stateMiddleware` saves `state.ui` to session on every change
- On initialization (`INITIALIZE` action), stored data is hydrated back into state

### Redux Conventions

- **Action types**: `SCREAMING_SNAKE_CASE` constants defined in `src/actions/types.js`
- **Action creators**: Plain functions returning `{ type, payload }` objects in `src/actions/actionCreators.js`
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
import { updateInput } from 'actions/actionCreators';  // resolves to src/actions/actionCreators
```

## Code Style

- **Prettier**: Single quotes, ES5 trailing commas (configured in `.prettierrc`)
- **Naming**: PascalCase for components/files, camelCase for functions/variables, SCREAMING_SNAKE_CASE for action types
- **Exports**: Default exports for components and reducers
- **JSX Runtime**: Automatic (React import not required in JSX files)
- **Error handling**: Try-catch around fetch calls with console.error logging

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `nexus-module` | Nexus Wallet integration (UI components, wallet data, storage, theming) |
| `leaflet` / `react-leaflet` | Interactive maps with OpenStreetMap tiles |
| `leaflet-routing-machine` | Route calculation and display |
| `react-select` | Async address search dropdown |
| `redux-thunk` | Async Redux actions |

## External APIs

- **OpenStreetMap Nominatim**: Address search/geocoding (`https://nominatim.openstreetmap.org/search`)
- **Browser Geolocation API**: Gets user's current location for map centering

## Current Limitations

- No test suite (no testing framework configured)
- No linter configured (no ESLint)
- No CI/CD pipeline
- Drive tab is a placeholder without functionality
- No backend API or blockchain integration for ride transactions
- No user authentication beyond wallet connection

## Working with This Codebase

- Always run `npm install` before first build if `node_modules` is missing
- The dev server runs on port **24011** with CORS enabled
- The app expects to run inside the Nexus Wallet - standalone browser testing is limited
- When adding new Redux state slices, register them in `src/reducers/index.js` and update persistence middleware in `src/configureStore.js` if the data should be saved
- When adding new tabs, update `Main.js` with a new `HorizontalTab` and corresponding component
- When adding new action types, define the constant in `src/actions/types.js` and create the action creator in `src/actions/actionCreators.js`
