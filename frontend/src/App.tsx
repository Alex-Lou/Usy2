import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginPage } from "./features/auth/LoginPage";
import { FeedPage } from "./features/feed/FeedPage";
import { AlbumsPage } from "./features/albums/AlbumsPage";
import { AlbumPage } from "./features/albums/AlbumPage";
import { ChatPage } from "./features/chat/ChatPage";
import { GamesHub } from "./features/games/GamesHub";
import { MorpionPage } from "./features/games/MorpionPage";
import { SnakePage } from "./features/games/SnakePage";
import { PostPage } from "./features/feed/PostPage";
import { FishingPage } from "./features/pet/games/FishingPage";
import { PetHousePage } from "./features/pet/house/PetHousePage";
import { ProfilePage } from "./features/profile/ProfilePage";
import { ProfileEditPage } from "./features/profile/ProfileEditPage";
import { SharedWidgetsPage } from "./features/couple/SharedWidgetsPage";
import { DatesPage } from "./features/couple/DatesPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<FeedPage />} />
        <Route path="/posts/:id" element={<PostPage />} />
        <Route path="/albums" element={<AlbumsPage />} />
        <Route path="/albums/:id" element={<AlbumPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/jeux" element={<GamesHub />} />
        <Route path="/jeux/morpion" element={<MorpionPage />} />
        <Route path="/jeux/snake" element={<SnakePage />} />
        <Route path="/jeux/chat" element={<PetHousePage />} />
        <Route path="/jeux/chat/peche" element={<FishingPage />} />
        <Route path="/profile/edit" element={<ProfileEditPage />} />
        <Route path="/widgets" element={<SharedWidgetsPage />} />
        <Route path="/dates" element={<DatesPage />} />
        <Route path="/profile/:userId" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
