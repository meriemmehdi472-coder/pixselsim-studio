// src/pages/LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const [mode, setMode]       = useState("login"); // "login" | "signup"
  const [form, setForm]       = useState({ email: "", password: "", password_confirmation: "", name: "" });
  const [errors, setErrors]   = useState([]);
  const [loading, setLoading] = useState(false);

  const { login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);

    const result = mode === "login"
      ? await login({ email: form.email, password: form.password })
      : await signup(form);

    setLoading(false);

    if (result.ok) {
      navigate("/");
    } else {
      setErrors(result.errors || [result.error]);
    }
  };

  return (
    <div style={s.page}>
      {/* Fond animé */}
      <div style={s.bgGrid} />
      <div style={s.bgGlow} />

      <div style={s.card}>
        {/* Logo / titre */}
        <div style={s.brand}>
          <span style={s.brandIcon}>✦</span>
          <span style={s.brandName}>Pixselsim</span>
        </div>
        <p style={s.tagline}>
          {mode === "login" ? "Content de te revoir." : "Crée ton compte gratuitement."}
        </p>

        {/* Tabs login / signup */}
        <div style={s.tabs}>
          {["login", "signup"].map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setErrors([]); }}
              style={{ ...s.tab, ...(mode === m ? s.tabActive : {}) }}
            >
              {m === "login" ? "Connexion" : "Inscription"}
            </button>
          ))}
        </div>

        {/* Formulaire */}
        <form onSubmit={submit} style={s.form}>
          {mode === "signup" && (
            <div style={s.field}>
              <label style={s.label}>Nom</label>
              <input
                name="name"
                value={form.name}
                onChange={handle}
                placeholder="Ton prénom"
                style={s.input}
                required
              />
            </div>
          )}

          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handle}
              placeholder="toi@example.com"
              style={s.input}
              required
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Mot de passe</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handle}
              placeholder="••••••••"
              style={s.input}
              required
            />
          </div>

          {mode === "signup" && (
            <div style={s.field}>
              <label style={s.label}>Confirmer le mot de passe</label>
              <input
                name="password_confirmation"
                type="password"
                value={form.password_confirmation}
                onChange={handle}
                placeholder="••••••••"
                style={s.input}
                required
              />
            </div>
          )}

          {/* Erreurs */}
          {errors.length > 0 && (
            <div style={s.errorBox}>
              {errors.map((e, i) => <p key={i} style={s.errorText}>⚠ {e}</p>)}
            </div>
          )}

          <button type="submit" style={s.btnPrimary} disabled={loading}>
            {loading ? "..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        {/* Séparateur */}
        <div style={s.divider}>
          <span style={s.dividerLine} />
          <span style={s.dividerText}>ou</span>
          <span style={s.dividerLine} />
        </div>

        {/* Bouton Google */}
        <button onClick={loginWithGoogle} style={s.btnGoogle}>
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 10 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continuer avec Google
        </button>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight:       "100vh",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    background:      "#0a0a0f",
    fontFamily:      "'DM Sans', 'Segoe UI', sans-serif",
    position:        "relative",
    overflow:        "hidden",
  },
  bgGrid: {
    position:   "fixed",
    inset:      0,
    background: `repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(255,255,255,0.02) 60px, rgba(255,255,255,0.02) 61px),
                 repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(255,255,255,0.02) 60px, rgba(255,255,255,0.02) 61px)`,
    pointerEvents: "none",
  },
  bgGlow: {
    position:     "fixed",
    top:          "-20%",
    left:         "50%",
    transform:    "translateX(-50%)",
    width:        "600px",
    height:       "600px",
    borderRadius: "50%",
    background:   "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  card: {
    position:     "relative",
    width:        "100%",
    maxWidth:     "420px",
    background:   "rgba(255,255,255,0.03)",
    border:       "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px",
    padding:      "40px",
    backdropFilter: "blur(20px)",
    boxShadow:    "0 40px 80px rgba(0,0,0,0.5)",
    margin:       "20px",
  },
  brand: {
    display:        "flex",
    alignItems:     "center",
    gap:            "10px",
    marginBottom:   "8px",
  },
  brandIcon: {
    fontSize:   "22px",
    color:      "#818cf8",
    lineHeight: 1,
  },
  brandName: {
    fontSize:   "22px",
    fontWeight: 700,
    color:      "#fff",
    letterSpacing: "-0.5px",
  },
  tagline: {
    color:        "rgba(255,255,255,0.4)",
    fontSize:     "14px",
    margin:       "0 0 28px",
  },
  tabs: {
    display:      "flex",
    background:   "rgba(255,255,255,0.05)",
    borderRadius: "10px",
    padding:      "4px",
    marginBottom: "24px",
    gap:          "4px",
  },
  tab: {
    flex:         1,
    padding:      "8px",
    border:       "none",
    borderRadius: "7px",
    background:   "transparent",
    color:        "rgba(255,255,255,0.4)",
    fontSize:     "13px",
    fontWeight:   500,
    cursor:       "pointer",
    transition:   "all 0.2s",
  },
  tabActive: {
    background: "rgba(255,255,255,0.1)",
    color:      "#fff",
  },
  form: {
    display:       "flex",
    flexDirection: "column",
    gap:           "16px",
  },
  field: {
    display:       "flex",
    flexDirection: "column",
    gap:           "6px",
  },
  label: {
    fontSize:    "12px",
    fontWeight:  500,
    color:       "rgba(255,255,255,0.5)",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  input: {
    background:   "rgba(255,255,255,0.05)",
    border:       "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    padding:      "12px 14px",
    color:        "#fff",
    fontSize:     "14px",
    outline:      "none",
    transition:   "border-color 0.2s",
  },
  errorBox: {
    background:   "rgba(239,68,68,0.1)",
    border:       "1px solid rgba(239,68,68,0.3)",
    borderRadius: "10px",
    padding:      "12px",
  },
  errorText: {
    color:    "#f87171",
    fontSize: "13px",
    margin:   "2px 0",
  },
  btnPrimary: {
    background:   "linear-gradient(135deg, #6366f1, #8b5cf6)",
    border:       "none",
    borderRadius: "10px",
    padding:      "13px",
    color:        "#fff",
    fontSize:     "14px",
    fontWeight:   600,
    cursor:       "pointer",
    marginTop:    "4px",
    transition:   "opacity 0.2s, transform 0.1s",
  },
  divider: {
    display:     "flex",
    alignItems:  "center",
    gap:         "12px",
    margin:      "20px 0",
  },
  dividerLine: {
    flex:        1,
    height:      "1px",
    background:  "rgba(255,255,255,0.08)",
  },
  dividerText: {
    color:    "rgba(255,255,255,0.3)",
    fontSize: "12px",
  },
  btnGoogle: {
    display:      "flex",
    alignItems:   "center",
    justifyContent: "center",
    width:        "100%",
    background:   "rgba(255,255,255,0.05)",
    border:       "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    padding:      "12px",
    color:        "rgba(255,255,255,0.8)",
    fontSize:     "14px",
    fontWeight:   500,
    cursor:       "pointer",
    transition:   "background 0.2s, border-color 0.2s",
  },
};