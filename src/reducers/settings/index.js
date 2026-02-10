import { combineReducers } from 'redux';

import showingConnections from './showingConnections';
import vehicleId from './vehicleId';
import vehicleType from './vehicleType';

export default combineReducers({
  showingConnections,
  vehicleId,
  vehicleType,
});
