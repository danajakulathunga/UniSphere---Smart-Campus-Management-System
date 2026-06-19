import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { normalizeRoles, useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, token, loading } = useAuth();

  if (loading || (token && !user)) return <div>Loading...</div>;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const userRoles = normalizeRoles(user?.roles);

  if (allowedRoles && !userRoles.some((role) => allowedRoles.includes(role))) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
