import * as TYPE from 'actions/types';

const initialState = 'sedan';

export default (state = initialState, action) => {
  switch (action.type) {
    case TYPE.SET_VEHICLE_TYPE:
      return action.payload;
    default:
      return state;
  }
};
