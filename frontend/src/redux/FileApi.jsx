// src/redux/FileApi.jsx
//
// FEATURE 1 — Advanced File Explorer: RTK Query slice talking to
// FileNodeController (/api/files/**) on the backend.

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const FileApi = createApi({
  reducerPath: "FileApi",

  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:8086/api",
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("token");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),

  tagTypes: ["FileTree"],

  endpoints: (builder) => ({
    // Fetches (and lazily seeds, server-side) the whole tree for a session.
    getFileTree: builder.query({
      query: (sessionToken) => `/files?sessionToken=${encodeURIComponent(sessionToken)}`,
      providesTags: ["FileTree"],
    }),

    createFileNode: builder.mutation({
      query: (body) => ({ url: "/files", method: "POST", body }),
      invalidatesTags: ["FileTree"],
    }),

    renameFileNode: builder.mutation({
      query: ({ id, name }) => ({ url: `/files/${id}/rename`, method: "PUT", body: { name } }),
      invalidatesTags: ["FileTree"],
    }),

    updateFileContent: builder.mutation({
      query: ({ id, content }) => ({ url: `/files/${id}/content`, method: "PUT", body: { content } }),
      // Content edits happen on every keystroke debounce — don't blow away
      // the tree/expansion state for those, only for structural changes.
    }),

    moveFileNode: builder.mutation({
      query: ({ id, newParentId, newSortOrder }) => ({
        url: `/files/${id}/move`,
        method: "PUT",
        body: { newParentId, newSortOrder },
      }),
      invalidatesTags: ["FileTree"],
    }),

    duplicateFileNode: builder.mutation({
      query: (id) => ({ url: `/files/${id}/duplicate`, method: "POST" }),
      invalidatesTags: ["FileTree"],
    }),

    deleteFileNode: builder.mutation({
      query: (id) => ({ url: `/files/${id}`, method: "DELETE" }),
      invalidatesTags: ["FileTree"],
    }),
  }),
});

export const {
  useGetFileTreeQuery,
  useCreateFileNodeMutation,
  useRenameFileNodeMutation,
  useUpdateFileContentMutation,
  useMoveFileNodeMutation,
  useDuplicateFileNodeMutation,
  useDeleteFileNodeMutation,
} = FileApi;
