import * as TYPE from 'actions/types';

const initialState = '';

export default (state = initialState, action) => {
  switch (action.type) {
    case TYPE.SET_VEHICLE_ID:
      return action.payload;
    default:
      return state;
  }
};
