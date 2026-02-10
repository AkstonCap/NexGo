import * as TYPE from 'actions/types';

const initialState = false;

export default (state = initialState, action) => {
  switch (action.type) {
    case TYPE.SET_BROADCASTING:
      return action.payload;
    default:
      return state;
  }
};
