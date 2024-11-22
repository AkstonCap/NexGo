import * as TYPE from 'actions/types';

const initialState = {
  rides: [],
};

export default (state = initialState, action) => {
  switch (action.type) {
    case TYPE.REQUEST_RIDE:
      return {
        ...state,
        rides: [...state.rides, action.payload],
      };
    case TYPE.ACCEPT_RIDE:
      // Update ride status accordingly
      return state;
    default:
      return state;
  }
};