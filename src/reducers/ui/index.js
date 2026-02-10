import { combineReducers } from 'redux';

import inputValue from './inputValue';
import activeTab from './activeTab';
import broadcasting from './broadcasting';
import driverStatus from './driverStatus';
import userPosition from './userPosition';

export default combineReducers({
  inputValue,
  activeTab,
  broadcasting,
  driverStatus,
  userPosition,
});
