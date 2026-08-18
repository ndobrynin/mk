import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { getAccessToken } from "../lib/auth-storage";

interface ProtectedRouteProps {
  children: ReactElement;
}

export function ProtectedRoute({ children }: ProtectedRouteProps): ReactElement {
  const accessToken = getAccessToken();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
