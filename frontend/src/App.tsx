import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./features/auth/LoginPage";
import { FeedPage } from "./features/feed/FeedPage";
import { HomePage } from "./features/home/HomePage";
import { ProfileEditPage } from "./features/profile/ProfileEditPage";
import { ProfilePage } from "./features/profile/ProfilePage";
import { ProtectedRoute } from "./routes/ProtectedRoute";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/feed"
        element={
          <ProtectedRoute>
            <FeedPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/edit"
        element={
          <ProtectedRoute>
            <ProfileEditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/:userId"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
