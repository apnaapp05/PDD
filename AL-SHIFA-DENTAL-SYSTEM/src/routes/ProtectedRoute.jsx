// src/routes/ProtectedRoute.jsx

import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ role, allowedRole, children }) {
  if (role !== allowedRole) {
    return <Navigate to="/" replace />;
  }
  return children;
}
