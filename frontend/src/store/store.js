import { configureStore } from "@reduxjs/toolkit";
import { AuthApi } from "../redux/Authapi/AuthApi";
import { SessionApi } from "../redux/SessionApi";
import { FileApi } from "../redux/FileApi";

export const store = configureStore({
  reducer: {
    [AuthApi.reducerPath]: AuthApi.reducer,
    [SessionApi.reducerPath]: SessionApi.reducer,
    [FileApi.reducerPath]: FileApi.reducer,
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      AuthApi.middleware,
      SessionApi.middleware,
      FileApi.middleware
    ),
});