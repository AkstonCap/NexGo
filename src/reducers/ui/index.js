import { combineReducers } from 'redux';

import inputValue from './inputValue';
import activeTab from './activeTab';

export default combineReducers({
  inputValue,
  activeTab,
});
