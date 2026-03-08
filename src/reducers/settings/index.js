import { combineReducers } from 'redux';

import driverPaymentAccount from './driverPaymentAccount';
import passengerPaymentAccount from './passengerPaymentAccount';
import showingConnections from './showingConnections';
import vehicleId from './vehicleId';
import vehicleType from './vehicleType';

export default combineReducers({
  driverPaymentAccount,
  passengerPaymentAccount,
  showingConnections,
  vehicleId,
  vehicleType,
});
