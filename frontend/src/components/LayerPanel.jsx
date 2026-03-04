import { COLORS, FONT } from "../styles";
import { IconLayers, IconTrash } from "./Icons";

export default function LayerPanel({ layers, onDelete, onEditLayer }) {
  return (
    <div style={{ padding: "0 20px", borderTop: `1px solid ${COLORS.border}`, paddingTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <IconLayers />
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: COLORS.faint }}>
          Calques ({layers.length})
        </span>
      </div>

      {layers.length === 0 && (
        <p style={{ fontSize: 12, color: COLORS.faint, fontFamily: FONT }}>Aucun calque</p>
      )}

      {[...layers].reverse().map((l, i) => (
        <div key={l.id} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "7px 10px", background: COLORS.border, borderRadius: 6, marginBottom: 4,
          border: `1px solid transparent`, transition: "border .15s"
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.border2}
          onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>
              {l.layer_type === "emoji"  ? (l.annotations?.[0]?.content || "😂")
               : l.layer_type === "text"  ? "T"
               : l.layer_type === "frame" ? "▣"
               : "✂️"}
            </span>
            <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {l.layer_type === "text"
                ? (l.annotations?.[0]?.content?.substring(0, 16) || "texte")
                : l.layer_type === "frame"
                ? (l.frameLabel || "cadre")
                : l.layer_type}
            </span>
          </div>

          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {/* Bouton édition (texte seulement) */}
            {l.layer_type === "text" && (
              <button onClick={() => onEditLayer?.(l)}
                style={{ background: "rgba(99,102,241,.15)", border: "none", color: "#818cf8", borderRadius: 5, padding: "3px 7px", cursor: "pointer", fontSize: 12 }}
                title="Modifier">
                ✏️
              </button>
            )}
            <button onClick={() => onDelete(l.id)}
              style={{ background: "rgba(239,68,68,.1)", border: "none", color: COLORS.danger, borderRadius: 5, padding: "3px 7px", cursor: "pointer", fontSize: 12 }}
              title="Supprimer">
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}