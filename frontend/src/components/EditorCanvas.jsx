// components/EditorCanvas.jsx
import { FONT } from "../styles";
import FrameOverlay from "./Frameoverlay";

export default function EditorCanvas({
  isVideo, mediaFile, imgSrc,
  pendingCrop, pendingCropPreviewUrl, videoCropLoading,
  layers, dragging, livePos, editingLayer,
  onClick, onMouseDown, onMouseMove, onMouseUp,
  onLayerMouseDown, onLayerClick, onDeleteFrame,
  activeTool, cropRect,
  canvasWrapRef, containerRef, imgRef,
  isMobile,
  // Frame
  selectedFrameId, onSelectFrame, onUpdateFrame,
}) {
  const activeFrame = [...layers].reverse().find(l => l.layer_type === "frame");

  const maxW = isMobile ? "100vw" : "calc(100vw - 280px)";
  const maxH = isMobile ? "calc(55vh - 36px)" : "calc(100vh - 120px)";

  // Clip appliqué directement sur le média selon le preset du cadre
  const frameClip = {};
  if (activeFrame?.framePreset) {
    const p = activeFrame.framePreset;
    const scale   = activeFrame.frameScale   ?? 1;
    const offsetX = activeFrame.frameOffsetX ?? 0;
    const offsetY = activeFrame.frameOffsetY ?? 0;
    if (p.clipType === "radius") frameClip.borderRadius = p.clipValue;
    if (p.clipType === "clip")   frameClip.clipPath     = p.clipValue;
    if (scale !== 1 || offsetX !== 0 || offsetY !== 0) {
      frameClip.transform      = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
      frameClip.transformOrigin = "center center";
    }
  }

  const mediaStyle = { display: "block", maxWidth: maxW, maxHeight: maxH, width: "auto", height: "auto", ...frameClip };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>

      {/* Barre info */}
      <div style={{ height: 36, background: "#0a0a14", borderBottom: "1px solid #1a1a2e", display: "flex", alignItems: "center", paddingLeft: 12, gap: 10, flexShrink: 0, overflowX: "auto" }}>
        {!isMobile && <span style={{ fontSize: 11, color: "#334155", fontFamily: "monospace", whiteSpace: "nowrap" }}>{mediaFile?.file_path}</span>}
        {activeTool && <span style={{ fontSize: 11, color: "#6366f1", background: "#6366f122", padding: "2px 8px", borderRadius: 4, fontFamily: FONT, whiteSpace: "nowrap" }}>{activeTool}</span>}
        {videoCropLoading && <span style={{ fontSize: 11, color: "#f59e0b", background: "#f59e0b22", padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>⏳ Recadrage…</span>}
        {activeFrame && !activeTool && !videoCropLoading && (
          <span style={{ fontSize: 11, color: "#818cf8", background: "#6366f122", padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>
            {selectedFrameId ? "✏️ Cadre sélectionné — glisse les poignées" : "Clic sur le cadre pour modifier"}
          </span>
        )}
        <div style={{ marginLeft: "auto", paddingRight: 12, fontSize: 10, color: "#2a2a3e", whiteSpace: "nowrap" }}>
          {!isMobile && "Ctrl+Z · Ctrl+Y"}
        </div>
      </div>

      {/* Canvas centré */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: isMobile ? 8 : 24, minHeight: 0 }}>

        {videoCropLoading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, border: "4px solid #f59e0b22", borderTop: "4px solid #f59e0b", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <div style={{ color: "#f59e0b", fontSize: 14, fontFamily: FONT, fontWeight: 700 }}>Recadrage en cours…</div>
            <div style={{ color: "#475569", fontSize: 11 }}>ffmpeg traite la vidéo</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div ref={canvasWrapRef} style={{ position: "relative", display: "inline-block", borderRadius: 4, boxShadow: "0 0 0 1px #2a2a3e, 0 16px 60px rgba(0,0,0,.9)" }}>

            {/* Bouton × suppression cadre — hors containerRef */}
            {activeFrame && !selectedFrameId && (
              <button onClick={(e) => { e.stopPropagation(); onDeleteFrame(); }}
                style={{ position: "absolute", top: -12, right: -12, zIndex: 50, background: "rgba(239,68,68,.9)", border: "2px solid #fff", color: "#fff", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,.5)" }}>
                ×
              </button>
            )}

            <div ref={containerRef}
              onClick={onClick} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
              style={{ position: "relative", display: "inline-block", lineHeight: 0, userSelect: "none",
                cursor: activeTool === "crop" && !isVideo ? "crosshair" : (activeTool && activeTool !== "frame") ? "copy" : "default" }}>

              {/* Média */}
              <div style={{ display: "inline-block", overflow: "hidden", lineHeight: 0 }}>
                {isVideo ? (
                  <video ref={imgRef} src={mediaFile?.url} controls style={mediaStyle} />
                ) : imgSrc ? (
                  <img ref={imgRef} src={imgSrc} alt="" draggable={false} crossOrigin="anonymous" style={{ ...mediaStyle, objectFit: "contain" }} />
                ) : (
                  <div style={{ width: isMobile ? 300 : 800, height: isMobile ? 200 : 500, background: "#131320", display: "flex", alignItems: "center", justifyContent: "center", color: "#1e1e2e", fontSize: 64 }}>🖼️</div>
                )}
              </div>

              {/* ── Cadre avec poignées ── */}
              {activeFrame && imgRef.current && (
                <>
                  {/* Badge pour (re)sélectionner le cadre quand non sélectionné */}
                  {!selectedFrameId && (
                    <div
                      onClick={(e) => { e.stopPropagation(); onSelectFrame(activeFrame.id); }}
                      style={{ position: "absolute", top: 6, left: 6, zIndex: 18, background: "rgba(99,102,241,.85)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 5, cursor: "pointer", userSelect: "none", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,.2)" }}>
                      ▣ Cadre
                    </div>
                  )}
                  <FrameOverlay
                    frame={activeFrame}
                    mediaW={imgRef.current.offsetWidth  || imgRef.current.clientWidth  || 400}
                    mediaH={imgRef.current.offsetHeight || imgRef.current.clientHeight || 300}
                    isSelected={selectedFrameId === activeFrame.id}
                    onSelect={() => onSelectFrame(activeFrame.id)}
                    onUpdate={(patch) => onUpdateFrame(activeFrame.id, patch)}
                    pointerEventsOnlyWhenSelected={true}
                  />
                </>
              )}
              

              {/* Calques texte / emoji */}
              {layers.filter(l => l.layer_type !== "frame").map(layer => {
                const pos = livePos[layer.id] || { x: layer.position_x, y: layer.position_y };
                return (
                  <div key={layer.id}
                    onMouseDown={(e) => onLayerMouseDown(e, layer)}
                    onClick={(e) => { e.stopPropagation(); onLayerClick(layer); }}
                    style={{ position: "absolute", left: pos.x, top: pos.y, transform: "translate(-50%,-50%)", cursor: dragging === layer.id ? "grabbing" : layer.layer_type === "text" ? "pointer" : "grab", zIndex: 20, userSelect: "none" }}>
                    {layer.layer_type === "text" && (
                      <div style={{ background: "rgba(0,0,0,.72)", color: layer.textColor || "#fff", padding: "5px 14px", borderRadius: 6, fontSize: layer.fontSize || 18, fontWeight: 700, whiteSpace: "nowrap", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,.12)", fontFamily: FONT, outline: editingLayer?.id === layer.id ? "2px solid #6366f1" : "none" }}>
                        {layer.annotations[0]?.content}
                      </div>
                    )}
                    {layer.layer_type === "emoji" && (
                      <div style={{ fontSize: isMobile ? 32 : 44, lineHeight: 1, filter: "drop-shadow(0 3px 10px rgba(0,0,0,.7))" }}>
                        {layer.annotations[0]?.content || "😂"}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Overlay crop photo */}
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
        )}
      </div>
    </div>
  );
}