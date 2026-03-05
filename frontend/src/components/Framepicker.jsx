// components/Framepicker.jsx
// Identique à l'original mais onAdd transmet aussi frameColor et frameThickness
// pour que l'export back-end (ImageMagick / ffmpeg) puisse utiliser ces valeurs.

import { useState } from "react";
import { COLORS, FONT } from "../styles";

export const FRAME_PRESETS = [
  { id: "rect",     label: "Rectangle",  category: "forme",     clipType: "radius", clipValue: "0px",   border: { style: "3px solid #fff" } },
  { id: "rounded",  label: "Arrondi",    category: "forme",     clipType: "radius", clipValue: "20px",  border: { style: "3px solid #fff" } },
  { id: "circle",   label: "Cercle",     category: "forme",     clipType: "radius", clipValue: "50%",   border: { style: "3px solid #fff" } },
  { id: "squircle", label: "Squircle",   category: "forme",     clipType: "radius", clipValue: "30%",   border: { style: "3px solid #fff" } },
  { id: "diamond",  label: "Losange",    category: "forme",     clipType: "clip",   clipValue: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)", border: null },
  { id: "triangle", label: "Triangle",   category: "forme",     clipType: "clip",   clipValue: "polygon(50% 0%, 100% 100%, 0% 100%)", border: null },
  { id: "pentagon", label: "Pentagone",  category: "forme",     clipType: "clip",   clipValue: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)", border: null },
  { id: "hexagon",  label: "Hexagone",   category: "forme",     clipType: "clip",   clipValue: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)", border: null },
  { id: "star",     label: "Étoile",     category: "forme",     clipType: "clip",   clipValue: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)", border: null },
  { id: "heart",    label: "Cœur",       category: "forme",     clipType: "clip",   clipValue: "path('M12,21.593c-5.63-5.539-11-10.297-11-14.402c0-3.791,3.068-5.191,5.281-5.191c1.312,0,4.151,1.018,5.719,4.338c1.567-3.32,4.407-4.338,5.719-4.338c2.212,0,5.281,1.4,5.281,5.191C23,11.297,17.629,16.054,12,21.593z')", border: null },
  { id: "polaroid", label: "Polaroid",   category: "décoratif", clipType: "radius", clipValue: "4px",   border: { style: "12px solid #fff", bottom: "40px solid #fff", shadow: "0 4px 20px rgba(0,0,0,.4)" } },
  { id: "vintage",  label: "Vintage",    category: "décoratif", clipType: "radius", clipValue: "2px",   border: { style: "6px double #c8a96e", inset: "0 0 0 2px #c8a96e" } },
  { id: "neon_b",   label: "Néon Bleu",  category: "décoratif", clipType: "radius", clipValue: "8px",   border: { style: "2px solid #00d4ff", glow: "0 0 16px #00d4ff, 0 0 40px #00d4ff" } },
  { id: "neon_p",   label: "Néon Rose",  category: "décoratif", clipType: "radius", clipValue: "8px",   border: { style: "2px solid #ff2d78", glow: "0 0 16px #ff2d78, 0 0 40px #ff2d78" } },
  { id: "neon_g",   label: "Néon Vert",  category: "décoratif", clipType: "radius", clipValue: "8px",   border: { style: "2px solid #39ff14", glow: "0 0 16px #39ff14, 0 0 40px #39ff14" } },
  { id: "gold",     label: "Or",         category: "décoratif", clipType: "radius", clipValue: "4px",   border: { style: "4px solid #f59e0b", glow: "0 0 16px rgba(245,158,11,.5)" } },
  { id: "film",     label: "Film",       category: "décoratif", clipType: "radius", clipValue: "2px",   border: { style: "8px solid #111", inset: "0 0 0 2px #fff" } },
];

const CATEGORIES   = ["tous", "forme", "décoratif"];
const COLOR_PICKER = ["#ffffff","#000000","#f59e0b","#6366f1","#ef4444","#22c55e","#00d4ff","#ff2d78","#39ff14","#c8a96e","#f97316","#a855f7"];

export function buildFrameStyle(preset, customColor, thickness) {
  const color = customColor || null;
  const brd   = preset.border;
  const wrapperStyle = {};
  const mediaStyle = {};

  if (preset.clipType === "radius") {
    mediaStyle.borderRadius = preset.clipValue;
  } else if (preset.clipType === "clip") {
    mediaStyle.clipPath = preset.clipValue;
  }

  if (brd) {
    const borderColor = color || (brd.style?.match(/#[0-9a-fA-F]+|rgb[^)]+\)/))?.[0] || "#fff";
    const bWidth      = thickness ? `${thickness}px` : (brd.style?.match(/^\d+px/))?.[0] || "3px";
    const bStyleType  = brd.style?.includes("double") ? "double" : "solid";
    wrapperStyle.border = `${bWidth} ${bStyleType} ${borderColor}`;

    if (brd.bottom)  wrapperStyle.borderBottom = brd.bottom.replace(/#[0-9a-fA-F]+/, borderColor);
    if (brd.shadow)  wrapperStyle.boxShadow    = brd.shadow;
    if (brd.glow)    wrapperStyle.boxShadow    = brd.glow;
    if (brd.inset)   wrapperStyle.boxShadow    = `inset ${brd.inset}`;
    if (preset.clipType === "radius") wrapperStyle.borderRadius = preset.clipValue;
  }

  return { wrapperStyle, mediaStyle };
}

function PresetThumb({ preset, active, onClick }) {
  const { wrapperStyle, mediaStyle } = buildFrameStyle(preset, null, null);
  return (
    <button onClick={onClick} title={preset.label}
      style={{ width: 56, height: 56, background: "#1a1a2e", border: `2px solid ${active ? COLORS.accent : COLORS.border}`, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 4, transition: "all .15s", position: "relative", overflow: "visible" }}>
      <div style={{ width: 36, height: 36, overflow: "hidden", ...wrapperStyle, padding: 0 }}>
        <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#6366f1,#f59e0b)", ...mediaStyle }} />
      </div>
      <div style={{ position: "absolute", bottom: -16, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: COLORS.faint, whiteSpace: "nowrap" }}>{preset.label}</div>
    </button>
  );
}

export default function FramePicker({ onAdd }) {
  const [category, setCategory]       = useState("tous");
  const [selected, setSelected]       = useState(FRAME_PRESETS[0]);
  const [customColor, setCustomColor] = useState(null);
  const [thickness, setThickness]     = useState(null);

  const filtered = category === "tous" ? FRAME_PRESETS : FRAME_PRESETS.filter(f => f.category === category);
  const { wrapperStyle, mediaStyle } = buildFrameStyle(selected, customColor, thickness);

  const handleApply = () => {
    onAdd({
      preset:         selected,
      wrapperStyle,
      mediaStyle,
      frameColor:     customColor,     // ← transmis pour l'export back-end
      frameThickness: thickness,       // ← transmis pour l'export back-end
    });
  };

  return (
    <div style={{ background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`, padding: "16px 24px", fontFamily: FONT, display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>

      <div style={{ minWidth: 110 }}>
        <div style={lbl}>Catégorie</div>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            style={{ display: "block", width: "100%", padding: "7px 10px", borderRadius: 6, border: "none", background: category === c ? "rgba(99,102,241,.2)" : "transparent", color: category === c ? "#818cf8" : COLORS.muted, cursor: "pointer", fontSize: 12, fontFamily: FONT, textAlign: "left", textTransform: "capitalize", marginBottom: 3 }}>
            {c}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minWidth: 300 }}>
        <div style={lbl}>Forme / Style</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, paddingBottom: 20 }}>
          {filtered.map(f => (
            <PresetThumb key={f.id} preset={f} active={selected.id === f.id}
              onClick={() => { setSelected(f); setCustomColor(null); }} />
          ))}
        </div>
      </div>

      {selected.border && (
        <div style={{ minWidth: 180 }}>
          <div style={lbl}>Couleur bordure</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
            {COLOR_PICKER.map(c => (
              <button key={c} onClick={() => setCustomColor(customColor === c ? null : c)}
                style={{ width: 22, height: 22, borderRadius: "50%", background: c, border: `3px solid ${customColor === c ? "#fff" : "transparent"}`, cursor: "pointer", padding: 0 }} />
            ))}
            <label style={{ width: 22, height: 22, borderRadius: "50%", background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)", cursor: "pointer", display: "block", border: `3px solid ${customColor && !COLOR_PICKER.includes(customColor) ? "#fff" : "transparent"}` }}>
              <input type="color" value={customColor || "#ffffff"} onChange={e => setCustomColor(e.target.value)} style={{ opacity: 0, position: "absolute", width: 0, height: 0 }} />
            </label>
          </div>
          <div style={lbl}>Épaisseur : {thickness || "auto"}</div>
          <input type="range" min="1" max="20" value={thickness || 3} onChange={e => setThickness(+e.target.value)}
            style={{ width: "100%", accentColor: COLORS.accent }} />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, minWidth: 110 }}>
        <div style={lbl}>Aperçu</div>
        <div style={{ width: 80, height: 80, background: "#111", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <div style={{ width: 64, height: 64, overflow: "hidden", ...wrapperStyle, padding: 0, margin: 0 }}>
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #6366f1 0%, #f59e0b 50%, #22c55e 100%)", ...mediaStyle }} />
          </div>
        </div>
        <button onClick={handleApply}
          style={{ background: COLORS.accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT, width: "100%" }}>
          + Appliquer
        </button>
      </div>
    </div>
  );
}

const lbl = { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#334155", marginBottom: 8, display: "block" };