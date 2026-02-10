import * as TYPE from 'actions/types';

const initialState = 'available';

export default (state = initialState, action) => {
  switch (action.type) {
    case TYPE.SET_DRIVER_STATUS:
      return action.payload;
    default:
      return state;
  }
};
