import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { Loader } from "../components/ui/states";
import { useAuth } from "../features/auth/useAuth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
