// src/redux/SessionApi/SessionApi.jsx

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const SessionApi = createApi({
  reducerPath: "SessionApi",

  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:8086/api",
    // Every request carries the logged-in user's token, if there is one, so
    // the backend knows who's asking and can scope session visibility to
    // only the sessions that user created or joined.
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("token");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),

  tagTypes: ["Session"],

  endpoints: (builder) => ({
    createSession: builder.mutation({
      query: (data) => ({
        url: "/sessions",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Session"],
    }),

    // Actually joins the session on the backend (rather than searching a
    // full session list client-side) — this is what grants the joining
    // user edit access and visibility into that session going forward.
    joinSession: builder.mutation({
      query: (data) => ({
        url: "/sessions/join",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Session"],
    }),

    // Only returns sessions the current user created or joined — the
    // backend enforces this, so an anonymous or unrelated caller gets
    // back an empty list rather than every session in the system.
    getAllSessions: builder.query({
      query: () => "/sessions",
      providesTags: ["Session"],
    }),

    // RBAC: HOST-only — sessions this user created ("My Sessions").
    getMySessions: builder.query({
      query: () => "/sessions/mine",
      providesTags: ["Session"],
    }),

    // RBAC: USER-only — sessions this user joined but didn't create ("Joined Sessions").
    getJoinedSessions: builder.query({
      query: () => "/sessions/joined",
      providesTags: ["Session"],
    }),

    // RBAC: USER-only — leave a session (removes them from the participant list).
    leaveSession: builder.mutation({
      query: (token) => ({
        url: `/sessions/${token}/leave`,
        method: "POST",
      }),
      invalidatesTags: ["Session"],
    }),

    deleteSession: builder.mutation({
      query: (id) => ({
        url: `/sessions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Session"],
    }),
  }),
});

export const {
  useCreateSessionMutation,
  useJoinSessionMutation,
  useGetAllSessionsQuery,
  useLazyGetAllSessionsQuery,
  useGetMySessionsQuery,
  useGetJoinedSessionsQuery,
  useLeaveSessionMutation,
  useDeleteSessionMutation,
} = SessionApi;