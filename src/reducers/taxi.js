import * as TYPE from 'actions/types';

const initialState = {
  taxis: [],
  driverAsset: null,
  loading: false,
  error: null,
  assetOperationPending: false,
  // Ratings
  ratings: {},       // { [genesis]: { average, count, avoidCount } }
  myRatings: {},     // { [genesis]: { score, avoid } }
  ratingsLoading: false,
  ratingPending: false,
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
    // Ratings
    case TYPE.FETCH_RATINGS_START:
      return {
        ...state,
        ratingsLoading: true,
      };
    case TYPE.FETCH_RATINGS_SUCCESS:
      return {
        ...state,
        ratings: action.payload,
        ratingsLoading: false,
      };
    case TYPE.FETCH_RATINGS_ERROR:
      return {
        ...state,
        ratingsLoading: false,
      };
    case TYPE.SET_MY_RATINGS:
      return {
        ...state,
        myRatings: action.payload,
      };
    case TYPE.RATING_OPERATION_START:
      return {
        ...state,
        ratingPending: true,
      };
    case TYPE.RATING_OPERATION_SUCCESS:
      return {
        ...state,
        ratingPending: false,
      };
    case TYPE.RATING_OPERATION_ERROR:
      return {
        ...state,
        ratingPending: false,
      };
    default:
      return state;
  }
};
