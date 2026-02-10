import * as TYPE from './types';
import {
  fetchTaxisFromChain,
  createTaxiAsset,
  updateTaxiAsset,
  listMyTaxiAssets,
  getTaxiAsset,
} from 'api/nexusAPI';

// UI actions
export const switchTab = (tab) => ({
  type: TYPE.SWITCH_TAB,
  payload: tab,
});

export const updateInput = (inputValue) => ({
  type: TYPE.UPDATE_INPUT,
  payload: inputValue,
});

export const setUserPosition = (position) => ({
  type: TYPE.SET_USER_POSITION,
  payload: position,
});

export const setBroadcasting = (isBroadcasting) => ({
  type: TYPE.SET_BROADCASTING,
  payload: isBroadcasting,
});

export const setDriverStatus = (status) => ({
  type: TYPE.SET_DRIVER_STATUS,
  payload: status,
});

// Settings actions (persisted to disk)
export const setVehicleId = (vehicleId) => ({
  type: TYPE.SET_VEHICLE_ID,
  payload: vehicleId,
});

export const setVehicleType = (vehicleType) => ({
  type: TYPE.SET_VEHICLE_TYPE,
  payload: vehicleType,
});

export const showConnections = () => ({
  type: TYPE.SHOW_CONNECTIONS,
});

export const hideConnections = () => ({
  type: TYPE.HIDE_CONNECTIONS,
});

// Async thunks for blockchain operations

// Fetch all active taxis from the blockchain
// Uses register/list/assets:asset (public endpoint, no auth required)
export const fetchTaxis = () => async (dispatch) => {
  dispatch({ type: TYPE.FETCH_TAXIS_START });
  try {
    const taxis = await fetchTaxisFromChain();
    dispatch({ type: TYPE.FETCH_TAXIS_SUCCESS, payload: taxis });
  } catch (error) {
    console.error('Error fetching taxis:', error);
    dispatch({ type: TYPE.FETCH_TAXIS_ERROR, payload: error.message });
  }
};

// Create a new taxi asset on-chain
// Uses assets/create/asset with JSON format per Distordia standard
export const createAsset =
  ({ vehicleId, vehicleType, position }) =>
  async (dispatch) => {
    dispatch({ type: TYPE.ASSET_OPERATION_START });
    try {
      await createTaxiAsset({ vehicleId, vehicleType, position });
      const asset = await getTaxiAsset(vehicleId);
      dispatch({ type: TYPE.SET_DRIVER_ASSET, payload: asset });
      dispatch({ type: TYPE.ASSET_OPERATION_SUCCESS });
      return asset;
    } catch (error) {
      console.error('Error creating taxi asset:', error);
      dispatch({ type: TYPE.ASSET_OPERATION_ERROR, payload: error.message });
      throw error;
    }
  };

// Update the driver's taxi asset on-chain
// Uses assets/update/asset for mutable field changes
export const updateAsset =
  ({ vehicleId, vehicleType, status, position }) =>
  async (dispatch) => {
    dispatch({ type: TYPE.ASSET_OPERATION_START });
    try {
      await updateTaxiAsset({ vehicleId, vehicleType, status, position });
      dispatch({ type: TYPE.ASSET_OPERATION_SUCCESS });
    } catch (error) {
      console.error('Error updating taxi asset:', error);
      dispatch({ type: TYPE.ASSET_OPERATION_ERROR, payload: error.message });
      throw error;
    }
  };

// Broadcast driver position (update asset with current location)
export const broadcastPosition =
  ({ vehicleId, vehicleType, status, position }) =>
  async (dispatch) => {
    try {
      await updateTaxiAsset({ vehicleId, vehicleType, status, position });
    } catch (error) {
      console.error('Broadcast failed:', error);
    }
  };

// Load the current driver's taxi asset if it exists
// Uses assets/list/asset to find assets owned by the logged-in user
export const loadDriverAsset = () => async (dispatch) => {
  try {
    const assets = await listMyTaxiAssets();
    if (assets.length > 0) {
      dispatch({ type: TYPE.SET_DRIVER_ASSET, payload: assets[0] });
    }
  } catch (error) {
    console.error('Error loading driver asset:', error);
  }
};
