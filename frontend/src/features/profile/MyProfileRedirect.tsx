import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

/** "/profile" (the Profil tab): my own profile's view. */
export function MyProfileRedirect() {
  const { user } = useAuth();
  return user ? <Navigate to={`/profile/${user.id}`} replace /> : null;
}
