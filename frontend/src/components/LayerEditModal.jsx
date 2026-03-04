import { useState, useEffect } from "react";
import { COLORS, FONT } from "../styles";

const FONT_SIZES = [12, 14, 16, 18, 24, 32, 48, 64];
const TEXT_COLORS = ["#ffffff","#000000","#f59e0b","#ef4444","#6366f1","#22c55e","#00d4ff","#ff2d78","#a855f7","#f97316","#ec4899","#14b8a6"];

export default function LayerEditModal({ layer, onSave, onDelete, onClose }) {
  const [text, setText]   = useState(layer?.annotations?.[0]?.content || "");
  const [color, setColor] = useState(layer?.textColor || "#ffffff");
  const [size, setSize]   = useState(layer?.fontSize  || 16);

  useEffect(() => {
    setText(layer?.annotations?.[0]?.content || "");
    setColor(layer?.textColor || "#ffffff");
    setSize(layer?.fontSize   || 16);
  }, [layer]);

  if (!layer) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center"
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: COLORS.surface, border: `1px solid ${COLORS.border}`,
        borderRadius: 16, padding: 28, width: 420, fontFamily: FONT,
        boxShadow: "0 24px 80px rgba(0,0,0,.6)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ color: COLORS.text, margin: 0, fontSize: 16, fontWeight: 700 }}>Modifier le texte</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {/* Aperçu live */}
        <div style={{ background: "#1a1a2e", borderRadius: 8, padding: "16px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 60 }}>
          <span style={{ color, fontSize: size, fontWeight: 600, fontFamily: FONT, wordBreak: "break-word", textAlign: "center" }}>
            {text || "Aperçu..."}
          </span>
        </div>

        {/* Champ texte */}
        <label style={labelStyle}>Texte</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          autoFocus
          style={{
            width: "100%", background: COLORS.border, border: `1px solid ${COLORS.border2}`,
            borderRadius: 8, color: COLORS.text, padding: "10px 12px", fontSize: 14,
            resize: "vertical", minHeight: 70, boxSizing: "border-box",
            fontFamily: FONT, marginBottom: 20
          }}
        />

        {/* Couleur */}
        <label style={labelStyle}>Couleur</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
          {TEXT_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              style={{
                width: 26, height: 26, borderRadius: "50%", background: c, padding: 0,
                border: `3px solid ${color === c ? "#fff" : "transparent"}`,
                cursor: "pointer", boxShadow: color === c ? `0 0 0 1px ${c}` : "none",
                transition: "all .1s"
              }} />
          ))}
          {/* Couleur custom */}
          <label style={{ width: 26, height: 26, borderRadius: "50%", background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, border: `3px solid ${!TEXT_COLORS.includes(color) ? "#fff" : "transparent"}` }}>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ opacity: 0, position: "absolute", width: 0, height: 0 }} />
          </label>
        </div>

        {/* Taille */}
        <label style={labelStyle}>Taille : {size}px</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
          {FONT_SIZES.map(s => (
            <button key={s} onClick={() => setSize(s)}
              style={{
                padding: "4px 10px", borderRadius: 6, border: `1px solid ${size === s ? COLORS.accent : COLORS.border2}`,
                background: size === s ? "rgba(99,102,241,.2)" : "transparent",
                color: size === s ? "#818cf8" : COLORS.muted,
                cursor: "pointer", fontSize: 12, fontFamily: FONT
              }}>{s}</button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => onDelete(layer.id)}
            style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid rgba(239,68,68,.3)", background: "rgba(239,68,68,.1)", color: "#ef4444", cursor: "pointer", fontSize: 13, fontFamily: FONT }}>
            🗑 Supprimer
          </button>
          <button onClick={onClose}
            style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: `1px solid ${COLORS.border2}`, background: "transparent", color: COLORS.muted, cursor: "pointer", fontSize: 13, fontFamily: FONT }}>
            Annuler
          </button>
          <button onClick={() => { onSave(layer.id, text, color, size); onClose(); }}
            style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: FONT }}>
            ✓ Appliquer
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#334155", marginBottom: 8 };