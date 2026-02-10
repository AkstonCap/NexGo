import * as TYPE from 'actions/types';

const initialState = {
  taxis: [],
  driverAsset: null,
  loading: false,
  error: null,
  assetOperationPending: false,
};

export default (state = initialState, action) => {
  switch (action.type) {
    case TYPE.FETCH_TAXIS_START:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case TYPE.FETCH_TAXIS_SUCCESS:
      return {
        ...state,
        taxis: action.payload,
        loading: false,
        error: null,
      };
    case TYPE.FETCH_TAXIS_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case TYPE.SET_DRIVER_ASSET:
      return {
        ...state,
        driverAsset: action.payload,
      };
    case TYPE.ASSET_OPERATION_START:
      return {
        ...state,
        assetOperationPending: true,
        error: null,
      };
    case TYPE.ASSET_OPERATION_SUCCESS:
      return {
        ...state,
        assetOperationPending: false,
      };
    case TYPE.ASSET_OPERATION_ERROR:
      return {
        ...state,
        assetOperationPending: false,
        error: action.payload,
      };
    default:
      return state;
  }
};
