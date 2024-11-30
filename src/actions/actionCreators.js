import * as TYPE from './types';

export const showConnections = () => ({
  type: TYPE.SHOW_CONNECTIONS,
});

export const hideConnections = () => ({
  type: TYPE.HIDE_CONNECTIONS,
});

export const updateInput = (inputValue) => ({
  type: TYPE.UPDATE_INPUT,
  payload: inputValue,
});

export const requestRide = (rideDetails) => ({
  type: TYPE.REQUEST_RIDE,
  payload: rideDetails,
});

export const acceptRide = (rideId) => ({
  type: TYPE.ACCEPT_RIDE,
  payload: rideId,
});

export const switchTab = (tab) => ({
  type: TYPE.SWITCH_TAB,
  payload: tab,
});