import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { COLORS, FONT } from "../styles";
import Toast from "../components/Toast";
import { IconArrowL, IconUpload, IconTrash, IconEdit } from "../components/Icons";

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { request } = useApi();

  const [project, setProject]       = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [uploading, setUploading]   = useState(false);
  const [toast, setToast]           = useState(null);
  const fileInputRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    (async () => {
      try {
        const [p, mf] = await Promise.all([
          request(`/projects/${projectId}`),
          request(`/projects/${projectId}/media_files`),
        ]);
        setProject(p);
        setMediaFiles(mf);
      } catch { showToast("Impossible de charger le projet"); }
    })();
  }, [projectId]);

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    
    try {
      const fd = new FormData();
      // "file" doit correspondre au nom attendu par has_one_attached :file dans Rails
      fd.append("file", file); 
      fd.append("media_type", file.type.startsWith("video/") ? "video" : "image");
      fd.append("media_file[file_path]", file.name);

      const mf = await request(`/projects/${projectId}/media_files`, { 
        method: "POST", 
        body: fd 
      });
      
      setMediaFiles(prev => [mf, ...prev]);
      showToast("Fichier uploadé ✓");
    } catch (err) {
      console.error(err);
      // Fallback local si le serveur échoue
      const isVideo = file.type.startsWith("video/");
      const fake = { 
        id: Date.now(), 
        file_path: file.name, 
        media_type: isVideo ? "video" : "image", 
        url: URL.createObjectURL(file), 
        created_at: new Date().toISOString() 
      };
      setMediaFiles(prev => [fake, ...prev]);
      showToast("Aperçu local (erreur serveur)");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const deleteMedia = async (id, e) => {
    e.stopPropagation();
    try { 
      await request(`/projects/${projectId}/media_files/${id}`, { method: "DELETE" }); 
      setMediaFiles(prev => prev.filter(m => m.id !== id));
      showToast("Fichier supprimé");
    } catch {
      showToast("Erreur lors de la suppression");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: FONT }}>
      <header style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "20px 40px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => navigate("/")}
          style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: FONT }}>
          <IconArrowL /> Projets
        </button>
        <span style={{ color: COLORS.faint }}>/</span>
        <span style={{ color: COLORS.text, fontWeight: 700 }}>{project?.title || "..."}</span>
      </header>

      <main style={{ padding: "40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <h1 style={{ color: COLORS.text, fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -1 }}>{project?.title}</h1>
            <p style={{ color: COLORS.muted, margin: "6px 0 0", fontSize: 14 }}>{project?.description}</p>
          </div>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            style={{ display: "flex", alignItems: "center", gap: 8, background: uploading ? COLORS.faint : COLORS.accent, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer", fontFamily: FONT }}>
            <IconUpload /> {uploading ? "Upload..." : "Ajouter un média"}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={uploadFile} style={{ display: "none" }} />
        </div>

        {mediaFiles.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 80 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📁</div>
            <div style={{ color: COLORS.faint, fontSize: 16 }}>Aucun média — importez une photo ou vidéo</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
            {mediaFiles.map(mf => (
              <div key={mf.id}
                onClick={() => navigate(`/projects/${projectId}/media/${mf.id}`, { state: { mediaFile: mf } })}
                style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden", transition: "all .2s", cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent; e.currentTarget.style.transform = "translateY(-4px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.transform = "none"; }}>

                {/* Thumbnail / Aperçu */}
                <div style={{ height: 160, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                  {mf.url ? (
                    mf.media_type === "video" ? (
                      <video src={mf.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <img src={mf.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )
                  ) : (
                    <div style={{ color: COLORS.faint, fontSize: 40 }}>{mf.media_type === "video" ? "🎬" : "🖼️"}</div>
                  )}
                  
                  <div style={{ position: "absolute", top: 8, right: 8 }}>
                    <span style={{ background: mf.media_type === "video" ? "#7c3aed" : COLORS.accent, color: "#fff", padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>
                      {mf.media_type}
                    </span>
                  </div>
                </div>

                {/* Footer Infos */}
                <div style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {mf.file_path || "Sans titre"}
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.muted }}>{new Date(mf.created_at).toLocaleDateString()}</div>
                  </div>
                  
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/projects/${projectId}/media/${mf.id}`, { state: { mediaFile: mf } }); }}
                      style={{ background: "none", border: "none", color: COLORS.muted, padding: 6, cursor: "pointer" }}>
                      <IconEdit />
                    </button>
                    <button onClick={(e) => deleteMedia(mf.id, e)}
                      style={{ background: "none", border: "none", color: COLORS.danger, padding: 6, cursor: "pointer" }}>
                      <IconTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );
}