// src/components/ProtectedRoute.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { User } from "firebase/auth";

interface ProtectedRouteProps {
  currentUser: User | null;
  authLoading: boolean;
  children: React.ReactElement;
}

function ProtectedRoute({
  currentUser,
  authLoading,
  children,
}: ProtectedRouteProps) {
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Checking Authentication...
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
