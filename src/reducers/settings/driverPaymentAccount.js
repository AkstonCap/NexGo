import * as TYPE from 'actions/types';

const initialState = '';

export default (state = initialState, action) => {
  switch (action.type) {
    case TYPE.SET_DRIVER_PAYMENT_ACCOUNT:
      return action.payload;
    default:
      return state;
  }
};
