import { useState, useRef, useEffect } from "react";
import { COLORS, FONT } from "../styles";

export default function VideoCropSelector({ src, onCropConfirm, onCancel }) {
  const videoRef   = useRef(null);
  const [cropStart, setCropStart] = useState(null);
  const [cropRect,  setCropRect]  = useState(null);
  const [drawing,   setDrawing]   = useState(false);
  const [videoRect, setVideoRect] = useState(null); // bounding rect réel de la vidéo

  // ── Pause auto à l'ouverture ──────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const pause = () => {
      video.pause();
      // Mesurer le rect réel de la vidéo après chargement
      setVideoRect(video.getBoundingClientRect());
    };
    if (video.readyState >= 1) pause();
    else video.addEventListener("loadedmetadata", pause, { once: true });
    return () => video.removeEventListener("loadedmetadata", pause);
  }, []);

  // Recalculer le rect si la fenêtre change de taille
  useEffect(() => {
    const update = () => {
      if (videoRef.current) setVideoRect(videoRef.current.getBoundingClientRect());
    };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ── Coordonnées relatives à la VIDÉO (pas à la page) ─────────────────
  const getVideoRelPos = (clientX, clientY) => {
    const vr = videoRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(clientX - vr.left, vr.width)),
      y: Math.max(0, Math.min(clientY - vr.top,  vr.height)),
    };
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    if (videoRef.current) {
      videoRef.current.pause();
      setVideoRect(videoRef.current.getBoundingClientRect());
    }
    const pos = getVideoRelPos(e.clientX, e.clientY);
    setCropStart(pos);
    setCropRect(null);
    setDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!drawing || !cropStart) return;
    const pos = getVideoRelPos(e.clientX, e.clientY);
    setCropRect({
      x: Math.min(cropStart.x, pos.x),
      y: Math.min(cropStart.y, pos.y),
      w: Math.abs(pos.x - cropStart.x),
      h: Math.abs(pos.y - cropStart.y),
    });
  };

  const handleMouseUp = () => setDrawing(false);

  const handleTouchStart = (e) => handleMouseDown(e.touches[0]);
  const handleTouchMove  = (e) => { e.preventDefault(); handleMouseMove(e.touches[0]); };
  const handleTouchEnd   = ()  => setDrawing(false);

  const handleConfirm = () => {
    if (!cropRect || cropRect.w < 10 || cropRect.h < 10) return;
    const video = videoRef.current;

    // Scale : pixels affichés → pixels natifs de la vidéo
    const vr     = video.getBoundingClientRect();
    const scaleX = video.videoWidth  / vr.width;
    const scaleY = video.videoHeight / vr.height;

    const nativeX = Math.round(cropRect.x * scaleX);
    const nativeY = Math.round(cropRect.y * scaleY);
    const nativeW = Math.max(2, Math.round(cropRect.w * scaleX / 2) * 2);
    const nativeH = Math.max(2, Math.round(cropRect.h * scaleY / 2) * 2);

    onCropConfirm({
      // Pour ffmpeg
      x: nativeX, y: nativeY, w: nativeW, h: nativeH,
      video_w: video.videoWidth, video_h: video.videoHeight,
      // Pour le preview dans l'éditeur (coords relatives à la vidéo affichée)
      display: { x: cropRect.x, y: cropRect.y, w: cropRect.w, h: cropRect.h }
    });
  };

  const hasSelection = cropRect && cropRect.w > 10 && cropRect.h > 10;
  const vr = videoRect;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.92)", zIndex: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 20 }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div style={{ color: "#f59e0b", fontSize: 15, fontFamily: FONT, fontWeight: 700 }}>
        ✏️ Clique et glisse sur la partie à garder
      </div>
      <div style={{ color: COLORS.muted, fontSize: 12, fontFamily: FONT, marginTop: -12 }}>
        Vidéo en pause — la zone claire = ce qui sera conservé
      </div>

      {/* Wrapper positionné pour que l'overlay soit calé sur la vidéo */}
      <div style={{ position: "relative", display: "inline-block" }}>

        {/* Vidéo */}
        <video
          ref={videoRef}
          src={src}
          style={{ display: "block", maxWidth: "82vw", maxHeight: "58vh", borderRadius: 8, boxShadow: "0 0 0 2px #f59e0b" }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />

        {/* Overlay — positionné exactement sur la vidéo grâce à getBoundingClientRect */}
        {vr && cropRect && cropRect.w > 2 && (
          <div style={{ position: "fixed", left: vr.left, top: vr.top, width: vr.width, height: vr.height, pointerEvents: "none", zIndex: 301 }}>
            {/* 4 zones sombres + floutées autour de la sélection */}
            {/* Haut */}
            <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: cropRect.y, background: "rgba(0,0,0,.78)", backdropFilter: "blur(4px)" }} />
            {/* Bas */}
            <div style={{ position: "absolute", left: 0, top: cropRect.y + cropRect.h, width: "100%", height: `calc(100% - ${cropRect.y + cropRect.h}px)`, background: "rgba(0,0,0,.78)", backdropFilter: "blur(4px)" }} />
            {/* Gauche */}
            <div style={{ position: "absolute", left: 0, top: cropRect.y, width: cropRect.x, height: cropRect.h, background: "rgba(0,0,0,.78)", backdropFilter: "blur(4px)" }} />
            {/* Droite */}
            <div style={{ position: "absolute", left: cropRect.x + cropRect.w, top: cropRect.y, width: `calc(100% - ${cropRect.x + cropRect.w}px)`, height: cropRect.h, background: "rgba(0,0,0,.78)", backdropFilter: "blur(4px)" }} />

            {/* Bordure jaune */}
            <div style={{ position: "absolute", left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h, border: "2px solid #f59e0b", boxSizing: "border-box" }}>
              {/* Poignées coins */}
              {[[0,0],[0,1],[1,0],[1,1]].map(([r,b], i) => (
                <div key={i} style={{ position: "absolute", [r?"bottom":"top"]: -4, [b?"right":"left"]: -4, width: 10, height: 10, background: "#f59e0b", borderRadius: 2 }} />
              ))}
              {/* Dimensions */}
              {cropRect.w > 60 && (
                <div style={{ position: "absolute", bottom: -26, left: 0, background: "#f59e0b", color: "#000", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap", fontFamily: FONT }}>
                  {Math.round(cropRect.w)} × {Math.round(cropRect.h)} px affichés
                  {videoRef.current && ` → natifs ~${Math.round(cropRect.w * videoRef.current.videoWidth / vr.width)} × ${Math.round(cropRect.h * videoRef.current.videoHeight / vr.height)}`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hint si pas encore de sélection */}
        {vr && !cropRect && (
          <div style={{ position: "fixed", left: vr.left, top: vr.top, width: vr.width, height: vr.height, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 301 }}>
            <div style={{ background: "rgba(245,158,11,.15)", border: "2px dashed #f59e0b", color: "#f59e0b", padding: "14px 28px", borderRadius: 10, fontSize: 15, fontWeight: 700, fontFamily: FONT, backdropFilter: "blur(4px)" }}>
              ← Clique et glisse →
            </div>
          </div>
        )}
      </div>

      {/* Boutons */}
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={onCancel} style={{ padding: "11px 28px", borderRadius: 8, border: `1px solid ${COLORS.border2}`, background: "transparent", color: COLORS.muted, cursor: "pointer", fontSize: 14, fontFamily: FONT }}>
          Annuler
        </button>
        {hasSelection && (
          <button onClick={() => { setCropRect(null); setCropStart(null); }} style={{ padding: "11px 28px", borderRadius: 8, border: "1px solid #f59e0b", background: "rgba(245,158,11,.1)", color: "#f59e0b", cursor: "pointer", fontSize: 14, fontFamily: FONT }}>
            ↺ Redessiner
          </button>
        )}
        <button onClick={handleConfirm} disabled={!hasSelection}
          style={{ padding: "11px 32px", borderRadius: 8, border: "none", background: hasSelection ? "linear-gradient(135deg,#f59e0b,#d97706)" : COLORS.faint, color: hasSelection ? "#000" : COLORS.muted, cursor: hasSelection ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 800, fontFamily: FONT }}>
          ✓ Confirmer la zone
        </button>
      </div>
    </div>
  );
}