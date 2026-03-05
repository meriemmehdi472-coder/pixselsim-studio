// components/FrameEditPanel.jsx
// Panneau de modification du cadre sélectionné dans la sidebar.
import { COLORS, FONT } from "../styles";

const COLORS_PALETTE = [
  "#ffffff","#000000","#f59e0b","#6366f1","#ef4444",
  "#22c55e","#00d4ff","#ff2d78","#39ff14","#c8a96e","#f97316","#a855f7"
];

export default function FrameEditPanel({ frame, onUpdate, onDelete }) {
  if (!frame) return null;

  const scale     = frame.frameScale     ?? 1;
  const offsetX   = frame.frameOffsetX   ?? 0;
  const offsetY   = frame.frameOffsetY   ?? 0;
  const thickness = frame.frameThickness ?? 3;
  const color     = frame.frameColor     ?? "#ffffff";

  const hasBorder = !!frame.framePreset?.border;

  return (
    <div style={{ padding: "10px 16px 14px", borderBottom: "1px solid #1a1a2e", background: "#0a0a14" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={lbl}>✏️ Modifier le cadre</div>
        <button onClick={onDelete}
          style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: "#ef4444", borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontSize: 11, fontFamily: FONT }}>
          🗑
        </button>
      </div>

      {/* ── Taille (scale) ── */}
      <div style={lbl}>Taille : {Math.round(scale * 100)}%</div>
      <input type="range" min="10" max="200" step="1"
        value={Math.round(scale * 100)}
        onChange={e => onUpdate({ frameScale: +e.target.value / 100 })}
        style={{ width: "100%", accentColor: "#6366f1", marginBottom: 12 }}
      />

      {/* ── Position X ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={lbl}>X : {Math.round(offsetX)}px</div>
          <input type="range" min="-200" max="200" step="1"
            value={Math.round(offsetX)}
            onChange={e => onUpdate({ frameOffsetX: +e.target.value })}
            style={{ width: "100%", accentColor: "#6366f1" }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={lbl}>Y : {Math.round(offsetY)}px</div>
          <input type="range" min="-200" max="200" step="1"
            value={Math.round(offsetY)}
            onChange={e => onUpdate({ frameOffsetY: +e.target.value })}
            style={{ width: "100%", accentColor: "#6366f1" }}
          />
        </div>
      </div>

      {/* ── Épaisseur (si le preset a une bordure) ── */}
      {hasBorder && (
        <>
          <div style={lbl}>Épaisseur : {thickness}px</div>
          <input type="range" min="1" max="30" step="1"
            value={thickness}
            onChange={e => onUpdate({ frameThickness: +e.target.value })}
            style={{ width: "100%", accentColor: "#6366f1", marginBottom: 12 }}
          />
        </>
      )}

      {/* ── Couleur ── */}
      {hasBorder && (
        <>
          <div style={lbl}>Couleur</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 4 }}>
            {COLORS_PALETTE.map(c => (
              <button key={c} onClick={() => onUpdate({ frameColor: c })}
                style={{ width: 22, height: 22, borderRadius: "50%", background: c, padding: 0, border: `3px solid ${color === c ? "#fff" : "transparent"}`, cursor: "pointer" }} />
            ))}
            {/* Couleur custom */}
            <label style={{ width: 22, height: 22, borderRadius: "50%", background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)", cursor: "pointer", display: "block", border: `3px solid ${!COLORS_PALETTE.includes(color) ? "#fff" : "transparent"}` }}>
              <input type="color" value={color} onChange={e => onUpdate({ frameColor: e.target.value })}
                style={{ opacity: 0, position: "absolute", width: 0, height: 0 }} />
            </label>
          </div>
        </>
      )}

      {/* ── Réinitialiser ── */}
      <button onClick={() => onUpdate({ frameScale: 1, frameOffsetX: 0, frameOffsetY: 0, frameThickness: 3, frameColor: null })}
        style={{ width: "100%", marginTop: 8, padding: "7px 0", borderRadius: 6, border: "1px solid #2a2a3e", background: "transparent", color: "#475569", cursor: "pointer", fontSize: 11, fontFamily: FONT }}>
        ↺ Réinitialiser
      </button>
    </div>
  );
}

const lbl = { fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: "#334155", marginBottom: 6, display: "block" };