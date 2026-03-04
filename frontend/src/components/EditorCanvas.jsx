// components/EditorCanvas.jsx
// Zone de rendu centrale : image/vidéo + calques + overlays crop.

import { FONT } from "../styles";

export default function EditorCanvas({
  // media
  isVideo, mediaFile, imgSrc,
  pendingCrop, pendingCropPreviewUrl,
  // calques
  layers, dragging, livePos, editingLayer,
  // events
  onClick, onMouseDown, onMouseMove, onMouseUp,
  onLayerMouseDown, onLayerClick, onDeleteFrame,
  // crop overlay
  activeTool, cropRect,
  // refs
  canvasWrapRef, containerRef, imgRef,
}) {
  // Chercher le dernier cadre actif → applique masque sur le média
  const activeFrame = [...layers].reverse().find(l => l.layer_type === "frame");
  const ws = activeFrame?.wrapperStyle || {};
  const ms = activeFrame?.mediaStyle   || {};

  const maxW = "calc(100vw - 280px)";
  const maxH = "calc(100vh - 120px)";
  const mediaStyle = { display: "block", maxWidth: maxW, maxHeight: maxH, width: "auto", height: "auto", ...ms };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Barre info ── */}
      <div style={{ height: 36, background: "#0a0a14", borderBottom: "1px solid #1a1a2e", display: "flex", alignItems: "center", paddingLeft: 20, gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: "#334155", fontFamily: "monospace" }}>{mediaFile?.file_path}</span>
        {activeTool && (
          <span style={{ fontSize: 11, color: "#6366f1", background: "#6366f122", padding: "2px 8px", borderRadius: 4, fontFamily: FONT }}>
            {activeTool}
          </span>
        )}
        {isVideo && !activeTool && (
          <span style={{ fontSize: 11, color: "#f59e0b66" }}>Met en pause pour ajouter texte/emoji</span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, paddingRight: 16, fontSize: 10, color: "#2a2a3e" }}>
          <span>Ctrl+Z annuler</span><span>·</span><span>Ctrl+Y refaire</span>
          {!isVideo && <><span>·</span><span>Clic texte = modifier</span></>}
        </div>
      </div>

      {/* ── Canvas centré ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: 24 }}>
        <div ref={canvasWrapRef}
          style={{ position: "relative", display: "inline-block", borderRadius: 4, boxShadow: "0 0 0 1px #2a2a3e, 0 32px 100px rgba(0,0,0,.9)" }}>
          <div ref={containerRef}
            onClick={onClick}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            style={{ position: "relative", display: "inline-block", lineHeight: 0, userSelect: "none", cursor: activeTool === "crop" && !isVideo ? "crosshair" : (activeTool && activeTool !== "frame") ? "copy" : "default" }}>

            {/* ── Média (avec masque de forme) ── */}
            {isVideo && pendingCrop && pendingCropPreviewUrl ? (
              // Vidéo avec zone sélectionnée → affiche SEULEMENT la zone
              <div style={{ position: "relative", display: "inline-block" }}>
                <div style={{ display: "inline-block", overflow: "hidden", lineHeight: 0, ...ws }}>
                  <img src={pendingCropPreviewUrl} alt="aperçu recadrage" style={{ ...mediaStyle, objectFit: "contain" }} />
                </div>
                <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(245,158,11,.9)", color: "#000", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 4, fontFamily: FONT }}>
                  APERÇU — vidéo finale via Exporter MP4
                </div>
              </div>
            ) : (
              <div style={{ display: "inline-block", overflow: "hidden", lineHeight: 0, ...ws }}>
                {isVideo
                  ? <video ref={imgRef} src={mediaFile?.url} controls style={mediaStyle} />
                  : imgSrc
                    ? <img ref={imgRef} src={imgSrc} alt="" draggable={false} crossOrigin="anonymous" style={{ ...mediaStyle, objectFit: "contain" }} />
                    : <div style={{ width: 800, height: 500, background: "#131320", display: "flex", alignItems: "center", justifyContent: "center", color: "#1e1e2e", fontSize: 64 }}>🖼️</div>
                }
              </div>
            )}

            {/* ── Calques texte / emoji ── */}
            {layers.filter(l => l.layer_type !== "frame").map(layer => {
              const pos = livePos[layer.id] || { x: layer.position_x, y: layer.position_y };
              return (
                <div key={layer.id}
                  onMouseDown={(e) => onLayerMouseDown(e, layer)}
                  onClick={(e) => { e.stopPropagation(); onLayerClick(layer); }}
                  style={{ position: "absolute", left: pos.x, top: pos.y, transform: "translate(-50%,-50%)", cursor: dragging === layer.id ? "grabbing" : layer.layer_type === "text" ? "pointer" : "grab", zIndex: 10, userSelect: "none" }}>

                  {layer.layer_type === "text" && (
                    <div style={{ background: "rgba(0,0,0,.72)", color: layer.textColor || "#fff", padding: "5px 14px", borderRadius: 6, fontSize: layer.fontSize || 18, fontWeight: 700, whiteSpace: "nowrap", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,.12)", fontFamily: FONT, outline: editingLayer?.id === layer.id ? "2px solid #6366f1" : "none" }}>
                      {layer.annotations[0]?.content}
                    </div>
                  )}

                  {layer.layer_type === "emoji" && (
                    <div style={{ fontSize: 44, lineHeight: 1, filter: "drop-shadow(0 3px 10px rgba(0,0,0,.7))" }}>
                      {layer.annotations[0]?.content || "😂"}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Bouton × cadre ── */}
            {layers.some(l => l.layer_type === "frame") && (
              <button onClick={(e) => { e.stopPropagation(); onDeleteFrame(); }}
                style={{ position: "absolute", top: 10, right: 10, zIndex: 30, background: "rgba(239,68,68,.9)", border: "none", color: "#fff", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                ×
              </button>
            )}

            {/* ── Overlay recadrage photo ── */}
            {activeTool === "crop" && cropRect && !isVideo && (
              <div style={{ position: "absolute", left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h, border: "2px solid #f59e0b", background: "rgba(245,158,11,.08)", pointerEvents: "none", zIndex: 20, boxShadow: "0 0 0 9999px rgba(0,0,0,.6)" }}>
                {cropRect.w > 50 && (
                  <div style={{ position: "absolute", bottom: -24, left: 0, background: "#f59e0b", color: "#000", fontSize: 11, padding: "2px 7px", borderRadius: 4, fontWeight: 800, whiteSpace: "nowrap" }}>
                    {Math.round(cropRect.w)} × {Math.round(cropRect.h)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}