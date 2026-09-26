import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginPage } from "./features/auth/LoginPage";
import { FeedPage } from "./features/feed/FeedPage";
import { MyProfileRedirect } from "./features/profile/MyProfileRedirect";
import { ProtectedRoute } from "./routes/ProtectedRoute";

// Pages other than the feed load on first visit, so the app opens with less code to fetch and run.
const AlbumsPage = lazy(() => import("./features/albums/AlbumsPage").then((m) => ({ default: m.AlbumsPage })));
const AlbumPage = lazy(() => import("./features/albums/AlbumPage").then((m) => ({ default: m.AlbumPage })));
const ChatPage = lazy(() => import("./features/chat/ChatPage").then((m) => ({ default: m.ChatPage })));
const GamesHub = lazy(() => import("./features/games/GamesHub").then((m) => ({ default: m.GamesHub })));
const MorpionPage = lazy(() => import("./features/games/MorpionPage").then((m) => ({ default: m.MorpionPage })));
const SnakePage = lazy(() => import("./features/games/SnakePage").then((m) => ({ default: m.SnakePage })));
const QuizPage = lazy(() => import("./features/quiz/QuizPage").then((m) => ({ default: m.QuizPage })));
const NousPage = lazy(() => import("./features/nous/NousPage").then((m) => ({ default: m.NousPage })));
const LivePage = lazy(() => import("./features/live/LivePage").then((m) => ({ default: m.LivePage })));
const SudokuPage = lazy(() => import("./features/games/sudoku/SudokuPage").then((m) => ({ default: m.SudokuPage })));
const PostPage = lazy(() => import("./features/feed/PostPage").then((m) => ({ default: m.PostPage })));
const FishingPage = lazy(() => import("./features/pet/games/FishingPage").then((m) => ({ default: m.FishingPage })));
const PetHousePage = lazy(() => import("./features/pet/house/PetHousePage").then((m) => ({ default: m.PetHousePage })));
const ProfilePage = lazy(() => import("./features/profile/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const MyProfilePage = lazy(() => import("./features/profile/MyProfilePage").then((m) => ({ default: m.MyProfilePage })));
const SharedWidgetsPage = lazy(() => import("./features/couple/SharedWidgetsPage").then((m) => ({ default: m.SharedWidgetsPage })));
const OurProfilePage = lazy(() => import("./features/couple/OurProfilePage").then((m) => ({ default: m.OurProfilePage })));
const DatesPage = lazy(() => import("./features/couple/DatesPage").then((m) => ({ default: m.DatesPage })));

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
        <Route path="/jeux/sudoku" element={<SudokuPage />} />
        <Route path="/jeux/quiz" element={<QuizPage />} />
        <Route path="/jeux/nous" element={<NousPage />} />
        <Route path="/jeux/direct" element={<LivePage />} />
        <Route path="/jeux/chat" element={<PetHousePage />} />
        <Route path="/jeux/chat/peche" element={<FishingPage />} />
        {/* My four spaces (see SpaceSwitcher), all under /profile. */}
        <Route path="/profile" element={<MyProfileRedirect />} />
        <Route path="/profile/moi" element={<MyProfilePage />} />
        <Route path="/profile/nous" element={<OurProfilePage />} />
        <Route path="/profile/barre" element={<SharedWidgetsPage />} />
        <Route path="/profile/edit" element={<Navigate to="/profile/moi" replace />} />
        <Route path="/widgets" element={<Navigate to="/profile/barre" replace />} />
        <Route path="/dates" element={<DatesPage />} />
        <Route path="/profile/:userId" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
