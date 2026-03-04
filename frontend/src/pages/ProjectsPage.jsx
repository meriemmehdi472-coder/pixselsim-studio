import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { COLORS, FONT } from "../styles";
import Toast from "../components/Toast";
import { IconPlus, IconTrash, IconClose } from "../components/Icons";

export default function ProjectsPage() {
  const { request } = useApi();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm]         = useState({ title: "", description: "" });
  const [toast, setToast]       = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    (async () => {
      try {
        const data = await request("/projects");
        setProjects(data);
      } catch { showToast("Backend hors ligne — mode démo"); }
      finally { setLoading(false); }
    })();
  }, []);

  const create = async () => {
    if (!form.title.trim()) return;
    try {
      const p = await request("/projects", { method: "POST", body: JSON.stringify({ project: form }) });
      setProjects(prev => [p, ...prev]);
    } catch {
      const fake = { id: Date.now(), ...form, created_at: new Date().toISOString() };
      setProjects(prev => [fake, ...prev]);
    }
    setForm({ title: "", description: "" });
    setCreating(false);
    showToast("Projet créé ✓");
  };

  const destroy = async (id, e) => {
    e.stopPropagation();
    try { await request(`/projects/${id}`, { method: "DELETE" }); } catch {}
    setProjects(prev => prev.filter(p => p.id !== id));
    showToast("Projet supprimé");
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: FONT }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, letterSpacing: -1 }}>
            <span style={{ color: COLORS.accent }}>✦</span> PixelForge
          </div>
          <div style={{ fontSize: 12, color: COLORS.faint, marginTop: 2 }}>Éditeur photo & vidéo</div>
        </div>
        <button onClick={() => setCreating(true)}
          style={{ display: "flex", alignItems: "center", gap: 8, background: COLORS.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
          <IconPlus /> Nouveau projet
        </button>
      </header>

      {/* Modal création */}
      {creating && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 32, width: 420 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ color: COLORS.text, margin: 0, fontSize: 18, fontWeight: 700 }}>Nouveau projet</h2>
              <button onClick={() => setCreating(false)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer" }}><IconClose /></button>
            </div>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Nom du projet *"
              style={{ width: "100%", background: COLORS.border, border: `1px solid ${COLORS.border2}`, borderRadius: 8, color: COLORS.text, padding: "10px 14px", fontSize: 14, marginBottom: 12, boxSizing: "border-box", fontFamily: FONT }} />
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description (optionnel)"
              style={{ width: "100%", background: COLORS.border, border: `1px solid ${COLORS.border2}`, borderRadius: 8, color: COLORS.text, padding: "10px 14px", fontSize: 14, resize: "vertical", minHeight: 80, boxSizing: "border-box", fontFamily: FONT }} />
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setCreating(false)} style={{ background: "transparent", border: `1px solid ${COLORS.border2}`, color: COLORS.muted, borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontSize: 14, fontFamily: FONT }}>Annuler</button>
              <button onClick={create} style={{ background: COLORS.accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>Créer</button>
            </div>
          </div>
        </div>
      )}

      {/* Grille projets */}
      <main style={{ padding: "40px" }}>
        {loading ? (
          <div style={{ color: COLORS.faint, textAlign: "center", marginTop: 80, fontSize: 14 }}>Chargement...</div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 80 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎨</div>
            <div style={{ color: COLORS.faint, fontSize: 16 }}>Aucun projet — créez-en un !</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {projects.map(p => (
              <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)}
                style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 24, cursor: "pointer", transition: "all .2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.transform = "none"; }}>
                <div style={{ width: 40, height: 40, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, fontSize: 20 }}>✦</div>
                <div style={{ fontWeight: 700, color: COLORS.text, fontSize: 16, marginBottom: 6 }}>{p.title}</div>
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16, minHeight: 36 }}>{p.description || "Aucune description"}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: COLORS.faint }}>{new Date(p.created_at).toLocaleDateString("fr-FR")}</span>
                  <button onClick={(e) => destroy(p.id, e)}
                    style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", color: COLORS.danger, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontFamily: FONT }}>
                    Supprimer
                  </button>
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