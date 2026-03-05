// components/FrameOverlay.jsx
// Le cadre = un div transparent positionné PAR-DESSUS le média.
// Il applique UNIQUEMENT la bordure + le contour de sélection + les poignées.
// Le clip de la forme est appliqué directement sur le média via style inline
// (géré dans EditorCanvas via frameClipStyle).
import { useCallback } from "react";

const HANDLES = [
  { id: "nw", cursor: "nw-resize", top: 0,     left: 0     },
  { id: "n",  cursor: "n-resize",  top: 0,     left: "50%" },
  { id: "ne", cursor: "ne-resize", top: 0,     right: 0    },
  { id: "e",  cursor: "e-resize",  top: "50%", right: 0    },
  { id: "se", cursor: "se-resize", bottom: 0,  right: 0    },
  { id: "s",  cursor: "s-resize",  bottom: 0,  left: "50%" },
  { id: "sw", cursor: "sw-resize", bottom: 0,  left: 0     },
  { id: "w",  cursor: "w-resize",  top: "50%", left: 0     },
];

export default function FrameOverlay({
  frame, onUpdate, isSelected, onSelect, mediaW, mediaH, pointerEventsOnlyWhenSelected,
}) {
  const scale     = frame.frameScale     ?? 1;
  const offsetX   = frame.frameOffsetX   ?? 0;
  const offsetY   = frame.frameOffsetY   ?? 0;
  const thickness = frame.frameThickness ?? 3;
  const color     = frame.frameColor     ?? "#ffffff";
  const preset    = frame.framePreset;
  if (!preset) return null;

  const fw = mediaW * scale;
  const fh = mediaH * scale;
  const fx = offsetX + (mediaW - fw) / 2;
  const fy = offsetY + (mediaH - fh) / 2;

  // Style de forme pour la bordure et le contour
  const shapeStyle = {};
  if (preset.clipType === "radius") shapeStyle.borderRadius = preset.clipValue;
  if (preset.clipType === "clip")   shapeStyle.clipPath     = preset.clipValue;

  // Bordure colorée
  const borderCss = preset.border
    ? {
        border:    `${thickness}px solid ${color}`,
        boxShadow: preset.border.glow || preset.border.shadow || undefined,
        ...shapeStyle,
      }
    : shapeStyle;

  // ── Drag move ──────────────────────────────────────────────────────────
  const handleMoveMouseDown = useCallback((e) => {
    if (e.target.dataset.handle) return;
    e.stopPropagation(); onSelect();
    const sx = e.clientX, sy = e.clientY, ox = offsetX, oy = offsetY;
    const onMove = (me) => onUpdate({ frameOffsetX: ox + me.clientX - sx, frameOffsetY: oy + me.clientY - sy });
    const onUp   = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [offsetX, offsetY, onUpdate, onSelect]);

  const handleMoveTouchStart = useCallback((e) => {
    if (e.target.dataset.handle) return;
    e.stopPropagation(); onSelect();
    const t = e.touches[0], sx = t.clientX, sy = t.clientY, ox = offsetX, oy = offsetY;
    const onMove = (te) => {
      if (te.cancelable) te.preventDefault();
      const tt = te.touches[0];
      onUpdate({ frameOffsetX: ox + tt.clientX - sx, frameOffsetY: oy + tt.clientY - sy });
    };
    const onUp = () => { window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onUp); };
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  }, [offsetX, offsetY, onUpdate, onSelect]);

  // ── Drag resize ────────────────────────────────────────────────────────
  const handleResizeMouseDown = useCallback((e, handleId) => {
    e.stopPropagation(); e.preventDefault();
    const sx = e.clientX, sy = e.clientY, s0 = scale;
    const onMove = (me) => {
      const dx = me.clientX - sx, dy = me.clientY - sy;
      let d = 0;
      if (handleId === "e")  d =  dx / mediaW;
      if (handleId === "w")  d = -dx / mediaW;
      if (handleId === "s")  d =  dy / mediaH;
      if (handleId === "n")  d = -dy / mediaH;
      if (handleId === "se") d = (dx / mediaW + dy / mediaH) / 2;
      if (handleId === "nw") d = (-dx / mediaW - dy / mediaH) / 2;
      if (handleId === "ne") d = (dx / mediaW - dy / mediaH) / 2;
      if (handleId === "sw") d = (-dx / mediaW + dy / mediaH) / 2;
      onUpdate({ frameScale: Math.max(0.05, Math.min(3, s0 + d)) });
    };
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [scale, mediaW, mediaH, onUpdate]);

  const handleResizeTouchStart = useCallback((e, handleId) => {
    e.stopPropagation();
    const t = e.touches[0], sx = t.clientX, sy = t.clientY, s0 = scale;
    const onMove = (te) => {
      if (te.cancelable) te.preventDefault();
      const tt = te.touches[0];
      const dx = tt.clientX - sx, dy = tt.clientY - sy;
      let d = 0;
      if (handleId.includes("e")) d =  dx / mediaW;
      if (handleId.includes("w")) d = -dx / mediaW;
      if (handleId === "s") d =  dy / mediaH;
      if (handleId === "n") d = -dy / mediaH;
      onUpdate({ frameScale: Math.max(0.05, Math.min(3, s0 + d)) });
    };
    const onUp = () => { window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onUp); };
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  }, [scale, mediaW, mediaH, onUpdate]);

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseDown={handleMoveMouseDown}
      onTouchStart={handleMoveTouchStart}
      style={{
        position: "absolute",
        left: fx, top: fy, width: fw, height: fh,
        cursor: isSelected ? "move" : "pointer",
        zIndex: 15,
        background: "transparent",   // ← JAMAIS de fond
        boxSizing: "border-box",
        // Quand non sélectionné : laisse passer les events aux layers texte/emoji en dessous
        // Un simple clic sélectionne le cadre sans bloquer les autres interactions
        pointerEvents: pointerEventsOnlyWhenSelected && !isSelected ? "none" : "auto",
        ...borderCss,
      }}
    >
      {/* Contour sélection */}
      {isSelected && (
        <div style={{
          position: "absolute", inset: -3,
          border: "2px dashed #6366f1",
          borderRadius: preset.clipType === "radius" ? preset.clipValue : undefined,
          clipPath:     preset.clipType === "clip"   ? preset.clipValue : undefined,
          pointerEvents: "none", zIndex: 20,
          background: "transparent",
        }} />
      )}

      {/* 8 poignées */}
      {isSelected && HANDLES.map(h => {
        const hs = {
          position: "absolute",
          width: 12, height: 12,
          background: "#fff",
          border: "2px solid #6366f1",
          borderRadius: 3,
          cursor: h.cursor, zIndex: 25,
          transform: "translate(-50%, -50%)",
          touchAction: "none",
        };
        if (h.top    !== undefined) hs.top    = h.top;
        if (h.bottom !== undefined) hs.bottom = h.bottom;
        if (h.left   !== undefined) hs.left   = h.left;
        if (h.right  !== undefined) hs.right  = h.right;
        return (
          <div key={h.id} data-handle={h.id} style={hs}
            onMouseDown={(e) => handleResizeMouseDown(e, h.id)}
            onTouchStart={(e) => handleResizeTouchStart(e, h.id)}
          />
        );
      })}
    </div>
  );
}