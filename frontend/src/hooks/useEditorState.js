// hooks/useEditorState.js
//
// Hook central de l'éditeur — gère TOUT l'état de l'application :
//   - Historique undo/redo des calques
//   - Versions du média (recadrage vidéo)
//   - Outils actifs (crop, texte, emoji, cadre)
//   - Export photo (synchrone) et vidéo (asynchrone avec polling)
//   - Drag & drop des calques sur le canvas
//   - Recadrage photo (canvas) et vidéo (ffmpeg)
//
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "./useApi";

const API = (import.meta.env.VITE_API_URL || "http://localhost:3000") + "/api/v1";

// ── Gestion de l'historique undo/redo ─────────────────────────────────────
// Stocke un tableau d'états et un index courant.
// push() ajoute un état, undo/redo déplacent l'index.
function useHistory(initial) {
  const [index, setIndex]     = useState(0);
  const [history, setHistory] = useState([initial]);
  const histRef = useRef([initial]);
  const idxRef  = useRef(0);

  const push = useCallback((s) => {
    // Écrase les états "futurs" quand on fait une nouvelle action après un undo
    const next = [...histRef.current.slice(0, idxRef.current + 1), s];
    histRef.current = next; idxRef.current = next.length - 1;
    setHistory([...next]); setIndex(next.length - 1);
  }, []);

  const undo = useCallback(() => {
    const i = Math.max(0, idxRef.current - 1);
    idxRef.current = i; setIndex(i);
  }, []);

  const redo = useCallback(() => {
    const i = Math.min(histRef.current.length - 1, idxRef.current + 1);
    idxRef.current = i; setIndex(i);
  }, []);

  return { current: history[index], push, undo, redo, canUndo: index > 0, canRedo: index < history.length - 1 };
}

export function useEditorState(initialMediaFile) {
  const { projectId } = useParams();
  const navigate      = useNavigate();
  const { request }   = useApi();

  // ── Versions du média (recadrage vidéo crée une nouvelle version) ────────
  const [mediaVersions, setMediaVersions]     = useState([initialMediaFile]);
  const [mediaVersionIdx, setMediaVersionIdx] = useState(0);
  const mediaVersionsRef   = useRef([initialMediaFile]);
  const mediaVersionIdxRef = useRef(0);

  const currentMediaFile = mediaVersions[mediaVersionIdx];
  const isVideo = currentMediaFile?.media_type === "video";

  const canUndoMedia = mediaVersionIdx > 0;
  const canRedoMedia = mediaVersionIdx < mediaVersions.length - 1;
  const undoMediaVersion = useCallback(() => setMediaVersionIdx(i => Math.max(0, i - 1)), []);
  const redoMediaVersion = useCallback(() => setMediaVersionIdx(i => Math.min(mediaVersionsRef.current.length - 1, i + 1)), []);

  // ── Historique des calques (texte, emoji, cadre) ─────────────────────────
  const { current: layers, push: pushLayers, undo, redo, canUndo, canRedo } = useHistory([]);

  // ── États UI ─────────────────────────────────────────────────────────────
  const [activeTool, setActiveTool]             = useState(null);          // "crop" | "text" | "emoji" | "frame" | null
  const [textInput, setTextInput]               = useState("");
  const [selectedEmoji, setSelectedEmoji]       = useState("😂");
  const [toast, setToast]                       = useState(null);          // Message de notification temporaire
  const [showFramePicker, setShowFramePicker]   = useState(false);
  const [editingLayer, setEditingLayer]         = useState(null);          // Calque texte en cours d'édition
  const [selectedFrameId, setSelectedFrameId]   = useState(null);         // Cadre sélectionné pour les poignées
  const [dragging, setDragging]                 = useState(null);          // ID du calque en cours de drag
  const [dragOffset, setDragOffset]             = useState({ x: 0, y: 0 });
  const [livePos, setLivePos]                   = useState({});            // Position live pendant le drag
  const [imgSrc, setImgSrc]                     = useState(currentMediaFile?.url || null);

  // ── États recadrage ──────────────────────────────────────────────────────
  const [cropHistory, setCropHistory]           = useState([]);            // Historique des recadrages photo
  const [cropRect, setCropRect]                 = useState(null);          // Rectangle de sélection en cours
  const [cropStart, setCropStart]               = useState(null);          // Point de départ du drag crop
  const [showVideoCrop, setShowVideoCrop]       = useState(false);
  const [pendingCrop, setPendingCrop]           = useState(null);
  const [pendingCropPreviewUrl, setPendingCropPreviewUrl] = useState(null);
  const [videoCropLoading, setVideoCropLoading] = useState(false);

  // ── États export ─────────────────────────────────────────────────────────
  const [videoExportToken, setVideoExportToken]   = useState(null);        // Token de polling
  const [videoExportStatus, setVideoExportStatus] = useState(null);        // "pending" | "processing" | "done" | "failed"
  const [videoDownloadUrl, setVideoDownloadUrl]   = useState(null);        // URL finale de la vidéo exportée
  const [exporting, setExporting]                 = useState(false);
  const [exportFmt, setExportFmt]                 = useState("png");       // Format photo : "png" | "jpeg"

  // ── Refs DOM ─────────────────────────────────────────────────────────────
  const containerRef  = useRef(null);  // Div contenant le média
  const canvasWrapRef = useRef(null);  // Wrapper externe (pour le bouton ×)
  const imgRef        = useRef(null);  // Élément <img> ou <video>
  const pollRef       = useRef(null);  // Référence au setInterval de polling

  // Ref pour accéder à l'état courant dans les callbacks sans recréer les fonctions
  const stateRef = useRef({});
  stateRef.current = {
    activeTool, textInput, selectedEmoji,
    dragging, dragOffset, cropStart, cropRect,
    livePos, layers, imgSrc, pendingCrop,
    currentMediaFile, mediaVersionIdx,
  };

  // Affiche un toast (notification) pendant 4 secondes
  const showToast = useCallback((msg) => {
    setToast(msg); setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Raccourcis clavier ───────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); redo(); }
      if (e.key === "Escape") setSelectedFrameId(null);  // Désélectionne le cadre
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [undo, redo]);

  // ── Polling export vidéo ─────────────────────────────────────────────────
  // Interroge le backend toutes les 2 secondes pour savoir si l'export est terminé.
  // Quand "done", télécharge automatiquement la vidéo et ajoute une nouvelle version.
  useEffect(() => {
    if (!videoExportToken || videoExportStatus === "done" || videoExportStatus === "failed") return;
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${API}/exports/${videoExportToken}`);
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
            mediaVersionIdxRef.current = idx + 1;
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

  // ── Gestion des calques ──────────────────────────────────────────────────

  // Crée un calque côté API puis l'ajoute à l'historique local
  // En cas d'erreur API, crée un calque local temporaire (mode offline)
  const addLayer = useCallback(async (type, posX = 100, posY = 100, content = "", annoType = "text", extra = {}) => {
    const mf = stateRef.current.currentMediaFile;
    let nl;
    try {
      const l = await request(`/projects/${projectId}/media_files/${mf.id}/layers`, {
        method: "POST", body: JSON.stringify({ layer: { layer_type: type, position_x: posX, position_y: posY } }),
      });
      nl = { ...l, annotations: [], ...extra };
      if (content) {
        const a = await request(`/projects/${projectId}/media_files/${mf.id}/layers/${l.id}/annotations`, {
          method: "POST", body: JSON.stringify({ annotation: { content, annotation_type: annoType, pos_x: posX, pos_y: posY } }),
        });
        nl.annotations = [a];
      }
    } catch {
      // Fallback local si l'API est indisponible
      nl = { id: Date.now(), layer_type: type, position_x: posX, position_y: posY, annotations: content ? [{ content, annotation_type: annoType }] : [], ...extra };
    }
    pushLayers([...stateRef.current.layers, nl]);
    showToast(`Calque "${type}" ajouté`);
  }, [projectId, request, pushLayers, showToast]);

  // Sauvegarde les modifications d'un calque texte (contenu, couleur, taille)
  const handleSaveLayerEdit = useCallback((id, text, color, size) => {
    pushLayers(stateRef.current.layers.map(l => l.id !== id ? l : {
      ...l, textColor: color, fontSize: size, annotations: [{ ...(l.annotations[0] || {}), content: text }]
    }));
    showToast("Texte modifié ✓");
  }, [pushLayers, showToast]);

  // Supprime un calque de l'historique
  const deleteLayer = useCallback((id) => {
    pushLayers(stateRef.current.layers.filter(l => l.id !== id));
    setEditingLayer(null);
    if (id === selectedFrameId) setSelectedFrameId(null);
    showToast("Calque supprimé");
  }, [pushLayers, showToast, selectedFrameId]);

  // Ajoute un cadre depuis le FramePicker avec ses propriétés visuelles
  const handleAddFrame = useCallback(({ preset, wrapperStyle, mediaStyle, frameColor, frameThickness }) => {
    const newFrame = {
      id: Date.now(), layer_type: "frame", position_x: 0, position_y: 0,
      annotations: [], wrapperStyle, mediaStyle, frameLabel: preset.label,
      framePreset: preset, frameColor, frameThickness,
      frameScale: 1, frameOffsetX: 0, frameOffsetY: 0,
    };
    pushLayers([...stateRef.current.layers, newFrame]);
    setShowFramePicker(false);
    setSelectedFrameId(newFrame.id);
    showToast(`Cadre "${preset.label}" — glisse les poignées pour ajuster`);
  }, [pushLayers, showToast]);

  // Met à jour les propriétés d'un cadre existant (scale, offset, couleur, épaisseur)
  // Chaque changement est enregistré dans l'historique pour permettre l'undo
  const handleUpdateFrame = useCallback((id, patch) => {
    const updated = stateRef.current.layers.map(l => l.id !== id ? l : { ...l, ...patch });
    pushLayers(updated);
  }, [pushLayers]);

  // ── Insertion de calques depuis la sidebar ────────────────────────────────

  // Insère un texte au centre du canvas
  const handleInsertText = useCallback(() => {
    const txt = stateRef.current.textInput.trim();
    if (!txt) { showToast("Écris d'abord un texte"); return; }
    const cont = containerRef.current;
    addLayer("text", cont ? Math.round(cont.offsetWidth / 2) : 300, cont ? Math.round(cont.offsetHeight / 2) : 200, txt, "text");
    setTextInput(""); setActiveTool(null);
  }, [addLayer, showToast]);

  // Insère un emoji au centre du canvas
  const handleInsertEmoji = useCallback(() => {
    const emoji = stateRef.current.selectedEmoji;
    const cont  = containerRef.current;
    addLayer("emoji", cont ? Math.round(cont.offsetWidth / 2) : 300, cont ? Math.round(cont.offsetHeight / 2) : 200, emoji, "emoji");
    setActiveTool(null);
  }, [addLayer]);

  // ── Recadrage photo (canvas natif) ───────────────────────────────────────
  // Recadre l'image côté client en utilisant un <canvas> HTML
  // Le résultat est une dataURL stockée dans imgSrc (pas de requête serveur)
  const performPhotoCrop = useCallback((rect) => {
    const img = imgRef.current;
    if (!img || !rect || rect.w < 5 || rect.h < 5) return;
    const cont = containerRef.current.getBoundingClientRect();
    const ir   = img.getBoundingClientRect();
    // Convertir les coordonnées d'affichage en coordonnées natives de l'image
    const sx = Math.max(0, (rect.x - (ir.left - cont.left)) * (img.naturalWidth  / ir.width));
    const sy = Math.max(0, (rect.y - (ir.top  - cont.top))  * (img.naturalHeight / ir.height));
    const sw = Math.min(rect.w * (img.naturalWidth  / ir.width),  img.naturalWidth  - sx);
    const sh = Math.min(rect.h * (img.naturalHeight / ir.height), img.naturalHeight - sy);
    if (sw <= 0 || sh <= 0) return;
    const c = document.createElement("canvas");
    c.width = sw; c.height = sh;
    c.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const dataUrl = c.toDataURL("image/png");
    setCropHistory(prev => [...prev, stateRef.current.imgSrc]);  // Sauvegarde pour undo
    setImgSrc(dataUrl);
    showToast(`✂️ ${Math.round(sw)}×${Math.round(sh)}px recadré`);
  }, [showToast]);

  // Annule le dernier recadrage photo en restaurant l'image précédente
  const undoPhotoCrop = useCallback(() => {
    if (!cropHistory.length) return;
    setImgSrc(cropHistory[cropHistory.length - 1]);
    setCropHistory(h => h.slice(0, -1));
    showToast("Recadrage annulé");
  }, [cropHistory, showToast]);

  // ── Recadrage vidéo (ffmpeg côté serveur) ────────────────────────────────
  // Envoie les coordonnées de crop au backend qui crée une nouvelle version de la vidéo
  const handleVideoCropConfirm = useCallback(async (cropData) => {
    setShowVideoCrop(false); setVideoCropLoading(true);
    showToast("⏳ Recadrage en cours (ffmpeg)...");
    const mf  = stateRef.current.currentMediaFile;
    const idx = stateRef.current.mediaVersionIdx;
    try {
      const newMf = await request(`/projects/${projectId}/media_files/${mf.id}/crop`, {
        method: "POST",
        body: JSON.stringify({ crop: { x: cropData.x, y: cropData.y, w: cropData.w, h: cropData.h, video_w: cropData.video_w, video_h: cropData.video_h } }),
      });
      // Ajoute la nouvelle version recadrée à l'historique des médias
      setMediaVersions(prev => {
        const next = [...prev.slice(0, idx + 1), newMf];
        mediaVersionsRef.current = next;
        return next;
      });
      setMediaVersionIdx(idx + 1);
      setPendingCrop(null); setPendingCropPreviewUrl(null);
      showToast(`✓ Vidéo recadrée (${cropData.w}×${cropData.h}px)`);
    } catch (err) { showToast(`Erreur recadrage : ${err.message}`); }
    finally { setVideoCropLoading(false); }
  }, [projectId, request, showToast]);

  const cancelVideoCrop = useCallback(() => {
    setPendingCrop(null); setPendingCropPreviewUrl(null); showToast("Zone annulée");
  }, [showToast]);

  // ── Téléchargement ───────────────────────────────────────────────────────
  // Fetche le fichier en blob pour forcer le téléchargement local
  // au lieu d'ouvrir dans un nouvel onglet (problème cross-origin)
  const handleDownload = useCallback(async (url, filename) => {
    try {
      const res     = await fetch(url);
      const blob    = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a       = document.createElement("a");
      a.href     = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
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
  // Lance un export synchrone : le backend répond directement avec l'URL de l'image
  const handleExportImage = useCallback(async () => {
    setExporting(true);
    try {
      const { layers: ls, imgSrc: src, exportFmt: fmt = "png" } = stateRef.current;
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

      // ── Construit le path de clip selon preset ──────────────────────
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
            return {
              x: fx + fw * parseFloat(px) / 100,
              y: fy + fh * parseFloat(py) / 100,
            };
          });
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.closePath();

        } else {
          // Fallback : rectangle plein
          ctx.beginPath();
          ctx.rect(fx, fy, fw, fh);
        }
      };

      // ── 1. Image clippée ─────────────────────────────────────────────
      await new Promise((resolve, reject) => {
        const tryDraw = (imgEl) => {
          ctx.save();
          buildClipPath();
          ctx.clip();
          ctx.drawImage(imgEl, fx, fy, fw, fh);
          ctx.restore();
          resolve();
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
        ctx.strokeStyle = color;
        ctx.lineWidth   = thickness;
        buildClipPath();
        ctx.stroke();
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
          ctx.beginPath();
          ctx.rect(nativeX - bw / 2, nativeY - bh / 2, bw, bh);
          ctx.fill();
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
  }, [showToast]);

  // ── Export vidéo ─────────────────────────────────────────────────────────
  // Lance un export asynchrone : le backend répond avec un token,
  // le polling prend le relais (voir useEffect plus haut)
  const handleExportVideo = useCallback(async () => {
    setExporting(true); setVideoExportStatus("pending"); setVideoDownloadUrl(null);
    const { layers: ls } = stateRef.current;
    const mf = stateRef.current.currentMediaFile;
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
      body.frame_color     = frameLayer.frameColor || null;
      body.frame_thickness = frameLayer.frameThickness || null;
    }
    // Si c'est une vidéo déjà exportée, on repart de l'original pour éviter la dégradation
    const mediaId = mf._isExport ? initialMediaFile.id : mf.id;
    try {
      const res  = await fetch(`${API}/projects/${projectId}/media_files/${mediaId}/exports`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      setVideoExportToken(data.token);  // Démarre le polling
      showToast("⏳ ffmpeg en cours...");
    } catch { showToast("Erreur export"); setVideoExportStatus(null); }
    setExporting(false);
  }, [projectId, initialMediaFile, showToast]);

  // Télécharge manuellement la vidéo déjà exportée (si le téléchargement auto a échoué)
  const handleDownloadVideo = useCallback(async () => {
    if (!videoDownloadUrl) return;
    await handleDownload(videoDownloadUrl, "export-final.mp4");
  }, [videoDownloadUrl, handleDownload]);

  // ── Événements canvas ────────────────────────────────────────────────────

  // Clic sur le canvas : place un calque texte/emoji à la position cliquée
  const handleCanvasClick = useCallback((e) => {
    const { activeTool: tool, dragging: drag, textInput: txt, selectedEmoji: emoji } = stateRef.current;
    if (drag) return;
    setSelectedFrameId(null);  // Désélectionne le cadre
    if (!tool || tool === "crop" || tool === "frame") return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (tool === "text") {
      if (txt.trim()) { addLayer("text", x, y, txt, "text"); setTextInput(""); setActiveTool(null); }
      else showToast("Écris d'abord ton texte dans le champ");
    } else if (tool === "emoji") { addLayer("emoji", x, y, emoji, "emoji"); setActiveTool(null); }
  }, [addLayer, showToast]);

  // Sélection d'outil dans la sidebar
  const handleToolSelect = useCallback((tool) => {
    if (tool === "crop" && isVideo) { setShowVideoCrop(true); return; }  // Crop vidéo → modal
    setActiveTool(prev => prev === tool ? null : tool);  // Toggle
    setShowFramePicker(prev => tool === "frame" ? !prev : false);
  }, [isVideo]);

  // Début du drag d'un calque
  const handleLayerMouseDown = useCallback((e, layer) => {
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    setDragging(layer.id);
    setLivePos({ [layer.id]: { x: layer.position_x, y: layer.position_y } });
    setDragOffset({ x: e.clientX - rect.left - layer.position_x, y: e.clientY - rect.top - layer.position_y });
  }, []);

  // Mouvement de la souris : déplace le calque ou dessine le rectangle de crop
  const handleMouseMove = useCallback((e) => {
    const { dragging: drag, dragOffset: off, cropStart: cs, activeTool: tool } = stateRef.current;
    if (drag) {
      const rect = containerRef.current.getBoundingClientRect();
      setLivePos({ [drag]: { x: e.clientX - rect.left - off.x, y: e.clientY - rect.top - off.y } });
    }
    if (tool === "crop" && cs && !isVideo) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      setCropRect({ x: Math.min(cs.x, x), y: Math.min(cs.y, y), w: Math.abs(x - cs.x), h: Math.abs(y - cs.y) });
    }
  }, [isVideo]);

  // Relâchement de la souris : valide le déplacement ou déclenche le crop
  const handleMouseUp = useCallback(() => {
    const { dragging: drag, livePos: lp, layers: ls, cropRect: cr, activeTool: tool } = stateRef.current;
    if (drag && lp[drag]) {
      const { x, y } = lp[drag];
      pushLayers(ls.map(l => l.id === drag ? { ...l, position_x: x, position_y: y } : l));
      setDragging(null); setLivePos({});
    }
    if (tool === "crop" && cr && cr.w > 10 && !isVideo) {
      performPhotoCrop(cr);
      setActiveTool(null); setCropRect(null); setCropStart(null);
    }
  }, [pushLayers, isVideo, performPhotoCrop]);

  // Début du dessin du rectangle de crop photo
  const handleCropMouseDown = useCallback((e) => {
    if (stateRef.current.activeTool !== "crop" || isVideo) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCropStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setCropRect(null);
  }, [isVideo]);

  // ── Retour de tous les états et handlers au composant parent ─────────────
  return {
    navigate, projectId,
    currentMediaFile, isVideo,
    mediaVersionIdx, mediaVersionsCount: mediaVersions.length,
    canUndoMedia, canRedoMedia, undoMediaVersion, redoMediaVersion,
    videoCropLoading,
    layers, undo, redo, canUndo, canRedo,
    addLayer, deleteLayer, handleSaveLayerEdit, handleAddFrame,
    handleUpdateFrame,
    selectedFrameId, setSelectedFrameId,
    activeTool, setActiveTool, handleToolSelect,
    textInput, setTextInput, selectedEmoji, setSelectedEmoji,
    toast, setToast, showToast,
    showFramePicker, setShowFramePicker,
    editingLayer, setEditingLayer,
    exportFmt, setExportFmt, exporting,
    handleExportImage, handleExportVideo, handleDownloadVideo,
    imgSrc, cropHistory, undoPhotoCrop,
    cropRect, cropStart,
    showVideoCrop, setShowVideoCrop,
    pendingCrop, setPendingCrop,
    pendingCropPreviewUrl, setPendingCropPreviewUrl,
    handleVideoCropConfirm, cancelVideoCrop,
    videoExportStatus, videoDownloadUrl,
    handleCanvasClick, handleCropMouseDown, handleMouseMove, handleMouseUp, handleLayerMouseDown,
    handleInsertText, handleInsertEmoji,
    dragging, livePos,
    containerRef, canvasWrapRef, imgRef,
  };
}