import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { GameTablePage } from "./pages/GameTablePage";
import { HomePage } from "./pages/HomePage";
import { LocalPlayersPage } from "./pages/LocalPlayersPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { RoomLobbyPage } from "./pages/RoomLobbyPage";
import { RoomsPage } from "./pages/RoomsPage";

function App(): ReactElement {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/local" element={<LocalPlayersPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/rooms"
        element={
          <ProtectedRoute>
            <RoomsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rooms/:roomId"
        element={
          <ProtectedRoute>
            <RoomLobbyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rooms/:roomId/table"
        element={
          <ProtectedRoute>
            <GameTablePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/rooms" replace />} />
    </Routes>
  );
}

export default App;
