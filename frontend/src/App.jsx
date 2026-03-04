import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProjectsPage      from "./pages/ProjectsPage";
import ProjectDetailpage from "./pages/ProjectDetailpage";
import Editorpage        from "./pages/Editorpage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                                   element={<ProjectsPage />} />
        <Route path="/projects/:projectId"                element={<ProjectDetailpage />} />
        <Route path="/projects/:projectId/media/:mediaId" element={<Editorpage />} />
      </Routes>
    </BrowserRouter>
  );
}