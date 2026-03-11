// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import ProjectsPage      from "./pages/ProjectsPage";
import ProjectDetailpage from "./pages/ProjectDetailpage";
import Editorpage        from "./pages/Editorpage";
import Login        from "./pages/Login";

// Route protégée — redirige vers /login si non connecté
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ color: "#fff", textAlign: "center", marginTop: "40vh" }}>Chargement...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route publique */}
        <Route path="/login" element={<Login />} />

        {/* Routes protégées */}
        <Route path="/" element={
          <PrivateRoute><ProjectsPage /></PrivateRoute>
        } />
        <Route path="/projects/:projectId" element={
          <PrivateRoute><ProjectDetailpage /></PrivateRoute>
        } />
        <Route path="/projects/:projectId/media/:mediaId" element={
          <PrivateRoute><Editorpage /></PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}