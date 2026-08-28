import React from "react";
import { Navigate } from "react-router-dom";

// Same login flow as everyone else — this just refuses to render admin
// pages for anyone whose logged-in role isn't ADMIN. The real gate is
// server-side (the backend never issues an ADMIN role from self-registration
// or Google sign-in), this is just so a non-admin can't land on the page.
const AdminRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  const role = localStorage.getItem("role");

  if (isAuthenticated !== "true") {
    return <Navigate to="/" replace />;
  }
  if (role !== "ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

export default AdminRoute;
