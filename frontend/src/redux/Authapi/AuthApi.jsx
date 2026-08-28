import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const AuthApi = createApi({
  reducerPath: "AuthApi",

  baseQuery: fetchBaseQuery({
     // baseUrl: "http://192.168.3.161:8080",
    // baseUrl: "http://10.217.251.50:8086/api/auth",
    baseUrl: "http://localhost:8086/api/auth",
  }),

  endpoints: (builder) => ({
      login: builder.mutation({
      query: ({ userData, token }) => ({
        url: "/login",
        method: "POST",
        body: userData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    }),

    register: builder.mutation({
      query: (userData) => ({
        url: "/register",
        method: "POST",
        body: userData,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
} = AuthApi;