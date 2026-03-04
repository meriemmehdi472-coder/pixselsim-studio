import { useLocation, useParams } from "react-router-dom";
import CanvasEditor from "../components/CanvasEditor";

export default function EditorPage() {
  const { state } = useLocation();
  const { mediaId } = useParams();

  // mediaFile passé via navigate state, ou fallback minimal
  const mediaFile = state?.mediaFile || { id: mediaId, file_path: "fichier", media_type: "image" };

  return <CanvasEditor mediaFile={mediaFile} />;
}