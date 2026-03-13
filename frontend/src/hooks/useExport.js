
// Export photo  : rendu canvas côté client → téléchargement direct
// Export vidéo  : requête backend → token → polling toutes les 2s → téléchargement auto
//
import { useState, useRef, useEffect, useCallback } from "react";

const API = (import.meta.env.VITE_API_URL || "http://localhost:3000") + "/api/v1";

export function useExport({ projectId, initialMediaFile, showToast, stateRef, imgRef,
  mediaVersionIdx, setMediaVersions, setMediaVersionIdx, mediaVersionsRef }) {

  const [exporting, setExporting]                     = useState(false);
  const [exportFmt, setExportFmt]                     = useState("png");        // "png" | "jpeg"
  const [videoExportToken, setVideoExportToken]       = useState(null);         // Token de polling
  const [videoExportStatus, setVideoExportStatus]     = useState(null);         // "pending" | "processing" | "done" | "failed"
  const [videoDownloadUrl, setVideoDownloadUrl]       = useState(null);         // URL finale de la vidéo exportée
  const pollRef                                       = useRef(null);           // Référence au setInterval de polling

  // ── Polling export vidéo ─────────────────────────────────────────────────
  // Interroge le backend toutes les 2 secondes pour savoir si l'export est terminé.
  // Quand "done", télécharge automatiquement la vidéo et ajoute une nouvelle version.
  useEffect(() => {
    if (!videoExportToken || videoExportStatus === "done" || videoExportStatus === "failed") return;
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${API}/exports/${videoExportToken}`, {
          credentials: "include",  // ✅ Envoie le cookie de session
        });
        const data = await res.json();
        setVideoExportStatus(data.status);
        if (data.status === "done") {
          const url = data.video_url;
          setVideoDownloadUrl(url);
          if (url) {
            // Ajoute la vidéo exportée comme nouvelle version navigable
            const exportedMf = {
              ...stateRef.current.currentMediaFile,
              id: `exported_${Date.now()}`,
              url, file_path: "export_final.mp4", _isExport: true,
            };
            const idx = stateRef.current.mediaVersionIdx;
            setMediaVersions(prev => {
              const next = [...prev.slice(0, idx + 1), exportedMf];
              mediaVersionsRef.current = next;
              return next;
            });
            setMediaVersionIdx(idx + 1);
            mediaVersionsRef.current = null;
          }
          if (url) handleDownload(url, "export-final.mp4");
          showToast("✓ Téléchargement lancé !");
          clearInterval(pollRef.current);
        } else if (data.status === "failed") {
          showToast(`Erreur : ${data.error}`);
          clearInterval(pollRef.current);
        }
      } catch { clearInterval(pollRef.current); }
    }, 2000);
    return () => clearInterval(pollRef.current);
  }, [videoExportToken, videoExportStatus, showToast]);

  // ── Téléchargement ───────────────────────────────────────────────────────
  // Fetche le fichier en blob pour forcer le téléchargement local
  // au lieu d'ouvrir dans un nouvel onglet (problème cross-origin)
  const handleDownload = useCallback(async (url, filename) => {
    try {
      const res     = await fetch(url, {
        credentials: "include",  // ✅ Envoie le cookie de session
      });
      const blob    = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a       = document.createElement("a");
      a.href = blobUrl; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);  // Libère la mémoire
      showToast("✓ Téléchargement lancé !");
    } catch {
      // Fallback si le fetch est bloqué (CORS, réseau, etc.)
      window.open(url, "_blank");
      showToast("✓ Fichier ouvert dans un nouvel onglet");
    }
    // Partage natif sur mobile (optionnel, non bloquant)
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (isMobile && navigator.share && navigator.canShare?.({ url })) {
      navigator.share({ url, title: filename }).catch(() => {});
    }
  }, [showToast]);

  // ── Export photo ─────────────────────────────────────────────────────────
  // Rendu canvas côté client : applique les calques sur l'image et télécharge
  const handleExportImage = useCallback(async () => {
    setExporting(true);
    try {
      const { layers: ls, imgSrc: src } = stateRef.current;
      const fmt = exportFmt || "png";
      const img = imgRef.current;
      if (!img) { showToast("Image non chargée"); setExporting(false); return; }

      const W     = img.naturalWidth  || img.offsetWidth  || 800;
      const H     = img.naturalHeight || img.offsetHeight || 600;
      const dispW = img.offsetWidth   || img.clientWidth  || W;
      const dispH = img.offsetHeight  || img.clientHeight || H;
      const scaleX = W / dispW;
      const scaleY = H / dispH;

      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");

      // Infos cadre
      const frameLayer = ls.find(l => l.layer_type === "frame");
      const preset  = frameLayer?.framePreset;
      const fScale  = frameLayer?.frameScale   ?? 1;
      const fOffX   = (frameLayer?.frameOffsetX ?? 0) * scaleX;
      const fOffY   = (frameLayer?.frameOffsetY ?? 0) * scaleY;
      const fw = W * fScale, fh = H * fScale;
      const fx = fOffX + (W - fw) / 2, fy = fOffY + (H - fh) / 2;

      // ── Construit le path de clip selon preset ────────────────────────
      const buildClipPath = () => {
        if (!preset) { ctx.beginPath(); ctx.rect(0, 0, W, H); return; }
        if (preset.clipType === "radius") {
          const raw = parseFloat(preset.clipValue) || 0;
          const rx  = preset.clipValue?.includes("%") ? fw * raw / 100 : raw * scaleX;
          const r   = Math.min(rx, fw / 2, fh / 2);
          ctx.beginPath();
          ctx.moveTo(fx + r, fy);
          ctx.lineTo(fx + fw - r, fy);
          ctx.quadraticCurveTo(fx + fw, fy, fx + fw, fy + r);
          ctx.lineTo(fx + fw, fy + fh - r);
          ctx.quadraticCurveTo(fx + fw, fy + fh, fx + fw - r, fy + fh);
          ctx.lineTo(fx + r, fy + fh);
          ctx.quadraticCurveTo(fx, fy + fh, fx, fy + fh - r);
          ctx.lineTo(fx, fy + r);
          ctx.quadraticCurveTo(fx, fy, fx + r, fy);
          ctx.closePath();
        } else if (preset.clipType === "clip" && preset.clipValue?.startsWith("polygon(")) {
          // Parser polygon(x1% y1%, x2% y2%, ...)
          const inner = preset.clipValue.slice(8, -1);
          const pts   = inner.split(",").map(pair => {
            const [px, py] = pair.trim().split(/\s+/);
            return { x: fx + fw * parseFloat(px) / 100, y: fy + fh * parseFloat(py) / 100 };
          });
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.closePath();
        } else {
          ctx.beginPath(); ctx.rect(fx, fy, fw, fh);  // Fallback rectangle
        }
      };

      // ── 1. Image clippée ──────────────────────────────────────────────
      await new Promise((resolve, reject) => {
        const tryDraw = (imgEl) => {
          ctx.save(); buildClipPath(); ctx.clip();
          ctx.drawImage(imgEl, fx, fy, fw, fh);
          ctx.restore(); resolve();
        };
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload  = () => tryDraw(i);
        i.onerror = () => {
          const i2 = new Image();
          i2.onload  = () => tryDraw(i2);
          i2.onerror = reject;
          i2.src = src || img.src;
        };
        i.src = src || img.src;
      });

      // ── 2. Bordure du cadre ───────────────────────────────────────────
      if (preset?.border) {
        const thickness = (frameLayer.frameThickness ?? 3) * Math.min(scaleX, scaleY);
        const color     = frameLayer.frameColor ?? "#ffffff";
        ctx.save();
        ctx.strokeStyle = color; ctx.lineWidth = thickness;
        buildClipPath(); ctx.stroke();
        ctx.restore();
      }

      // ── 3. Textes et emojis ───────────────────────────────────────────
      for (const layer of ls.filter(l => l.layer_type !== "frame")) {
        const lp      = stateRef.current.livePos?.[layer.id];
        const nativeX = (lp?.x ?? layer.position_x) * scaleX;
        const nativeY = (lp?.y ?? layer.position_y) * scaleY;
        if (layer.layer_type === "text") {
          const content  = layer.annotations?.[0]?.content || "";
          const color    = layer.textColor || "#ffffff";
          const fontSize = (layer.fontSize || 18) * scaleX;
          ctx.save();
          ctx.font = `700 ${fontSize}px sans-serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          const metrics = ctx.measureText(content);
          const padX = 14 * scaleX, padY = 5 * scaleY;
          const bw = metrics.width + padX * 2, bh = fontSize + padY * 2;
          ctx.fillStyle = "rgba(0,0,0,0.72)";
          ctx.beginPath(); ctx.rect(nativeX - bw / 2, nativeY - bh / 2, bw, bh); ctx.fill();
          ctx.fillStyle = color;
          ctx.fillText(content, nativeX, nativeY);
          ctx.restore();
        }
        if (layer.layer_type === "emoji") {
          const content  = layer.annotations?.[0]?.content || "😂";
          const fontSize = 44 * scaleX;
          ctx.save();
          ctx.font = `${fontSize}px serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(content, nativeX, nativeY);
          ctx.restore();
        }
      }

      // ── 4. Télécharger ────────────────────────────────────────────────
      const mimeType = fmt === "jpeg" ? "image/jpeg" : "image/png";
      const quality  = fmt === "jpeg" ? 0.92 : undefined;
      canvas.toBlob((blob) => {
        if (!blob) { showToast("Erreur génération image"); setExporting(false); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `export-${Date.now()}.${fmt}`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast("✓ Image téléchargée !");
        setExporting(false);
      }, mimeType, quality);

    } catch (err) {
      console.error("[Export photo]", err);
      showToast(`Erreur export : ${err.message}`);
      setExporting(false);
    }
  }, [exportFmt, showToast, stateRef, imgRef]);

  // ── Export vidéo ─────────────────────────────────────────────────────────
  // Lance un export asynchrone : le backend répond avec un token,
  // le polling prend le relais (voir useEffect plus haut)
  const handleExportVideo = useCallback(async () => {
    setExporting(true); setVideoExportStatus("pending"); setVideoDownloadUrl(null);
    const { layers: ls, currentMediaFile: mf } = stateRef.current;
    const layerIds   = ls.filter(l => typeof l.id === "number" && l.id < 1e12).map(l => l.id);
    const layersMeta = ls.filter(l => typeof l.id === "number" && l.id < 1e12 && l.layer_type === "text")
      .map(l => ({ id: l.id, text_color: l.textColor || "#ffffff", font_size: l.fontSize || 28 }));
    const videoEl  = imgRef.current;
    const canvas_w = videoEl ? Math.round(videoEl.getBoundingClientRect().width)  : null;
    const canvas_h = videoEl ? Math.round(videoEl.getBoundingClientRect().height) : null;
    const frameLayer = ls.find(l => l.layer_type === "frame");
    const body = { layer_ids: layerIds, layers_meta: layersMeta, canvas_w, canvas_h };
    if (frameLayer?.framePreset) {
      body.frame_preset    = frameLayer.framePreset;
      body.frame_color     = frameLayer.frameColor     || null;
      body.frame_thickness = frameLayer.frameThickness || null;
    }
    // Si c'est une vidéo déjà exportée, on repart de l'original pour éviter la dégradation
    const mediaId = mf._isExport ? initialMediaFile.id : mf.id;
    try {
      const res  = await fetch(`${API}/projects/${projectId}/media_files/${mediaId}/exports`, {
        method: "POST",
        credentials: "include",  // Envoie le cookie de session
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setVideoExportToken(data.token);  // Démarre le polling
      showToast("⏳ ffmpeg en cours...");
    } catch {
      showToast("Erreur export");
      setVideoExportStatus(null);
    }
    setExporting(false);
  }, [projectId, initialMediaFile, showToast, stateRef, imgRef]);

  // Télécharge manuellement la vidéo déjà exportée (si le téléchargement auto a échoué)
  const handleDownloadVideo = useCallback(async () => {
    if (!videoDownloadUrl) return;
    await handleDownload(videoDownloadUrl, "export-final.mp4");
  }, [videoDownloadUrl, handleDownload]);

  return {
    exporting, exportFmt, setExportFmt,
    videoExportStatus, videoDownloadUrl,
    handleExportImage, handleExportVideo, handleDownloadVideo,
  };
}