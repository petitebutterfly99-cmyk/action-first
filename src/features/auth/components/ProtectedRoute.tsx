import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";

/** Wraps any authenticated route. Redirects to /login while unauthenticated. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xs text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/** For /login etc. — bounce already-logged-in users into the app. */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}
