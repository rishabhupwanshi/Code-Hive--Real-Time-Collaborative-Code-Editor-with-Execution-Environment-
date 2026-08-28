import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import AuthPage from "../components/Registration";
import Dashboard from "../components/Dashboard";
import Editor from "../components/Editor";
import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";
import AdminDashboard from "../components/AdminDashboard";
import Profile from "../components/Profile";

const AppRoutes = () => {
  const isAuthenticated =
    localStorage.getItem("isAuthenticated");

  return (
    <Routes>
      {/* Login Page */}
      <Route
        path="/"
        element={
          isAuthenticated === "true"
            ? <Navigate to="/dashboard" replace />
            : <AuthPage />
        }
      />

      {/* Protected Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected Editor */}
      <Route
        path="/editor/:language/:token"
        element={
          <ProtectedRoute>
            <Editor />
          </ProtectedRoute>
        }
      />
       <Route path="/profile" element={<Profile />} />

      {/* Admin-only Dashboard */}
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
    </Routes>
  );
};

export default AppRoutes;