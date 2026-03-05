// hooks/useEditorState.js
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "./useApi";

const API = (import.meta.env.VITE_API_URL || "http://localhost:3000") + "/api/v1";

function useHistory(initial) {
  const [index, setIndex]     = useState(0);
  const [history, setHistory] = useState([initial]);
  const histRef = useRef([initial]);
  const idxRef  = useRef(0);
  const push = useCallback((s) => {
    const next = [...histRef.current.slice(0, idxRef.current + 1), s];
    histRef.current = next; idxRef.current = next.length - 1;
    setHistory([...next]); setIndex(next.length - 1);
  }, []);
  const undo = useCallback(() => { const i = Math.max(0, idxRef.current - 1); idxRef.current = i; setIndex(i); }, []);
  const redo = useCallback(() => { const i = Math.min(histRef.current.length - 1, idxRef.current + 1); idxRef.current = i; setIndex(i); }, []);
  return { current: history[index], push, undo, redo, canUndo: index > 0, canRedo: index < history.length - 1 };
}

export function useEditorState(initialMediaFile) {
  const { projectId } = useParams();
  const navigate      = useNavigate();
  const { request }   = useApi();

  const [mediaVersions, setMediaVersions]     = useState([initialMediaFile]);
  const [mediaVersionIdx, setMediaVersionIdx] = useState(0);
  const mediaVersionsRef  = useRef([initialMediaFile]);
  const mediaVersionIdxRef = useRef(0);

  const currentMediaFile = mediaVersions[mediaVersionIdx];
  const isVideo = currentMediaFile?.media_type === "video";

  const canUndoMedia = mediaVersionIdx > 0;
  const canRedoMedia = mediaVersionIdx < mediaVersions.length - 1;
  const undoMediaVersion = useCallback(() => setMediaVersionIdx(i => Math.max(0, i - 1)), []);
  const redoMediaVersion = useCallback(() => setMediaVersionIdx(i => Math.min(mediaVersionsRef.current.length - 1, i + 1)), []);

  const { current: layers, push: pushLayers, undo, redo, canUndo, canRedo } = useHistory([]);

  const [activeTool, setActiveTool]             = useState(null);
  const [textInput, setTextInput]               = useState("");
  const [selectedEmoji, setSelectedEmoji]       = useState("😂");
  const [toast, setToast]                       = useState(null);
  const [showFramePicker, setShowFramePicker]   = useState(false);
  const [editingLayer, setEditingLayer]         = useState(null);
  const [selectedFrameId, setSelectedFrameId]   = useState(null); // id du cadre sélectionné
  const [dragging, setDragging]                 = useState(null);
  const [dragOffset, setDragOffset]             = useState({ x: 0, y: 0 });
  const [livePos, setLivePos]                   = useState({});
  const [imgSrc, setImgSrc]                     = useState(currentMediaFile?.url || null);
  const [cropHistory, setCropHistory]           = useState([]);
  const [cropRect, setCropRect]                 = useState(null);
  const [cropStart, setCropStart]               = useState(null);
  const [showVideoCrop, setShowVideoCrop]       = useState(false);
  const [pendingCrop, setPendingCrop]           = useState(null);
  const [pendingCropPreviewUrl, setPendingCropPreviewUrl] = useState(null);
  const [videoCropLoading, setVideoCropLoading] = useState(false);
  const [videoExportToken, setVideoExportToken] = useState(null);
  const [videoExportStatus, setVideoExportStatus] = useState(null);
  const [videoDownloadUrl, setVideoDownloadUrl] = useState(null);
  const [exporting, setExporting]               = useState(false);
  const [exportFmt, setExportFmt]               = useState("png");

  const containerRef  = useRef(null);
  const canvasWrapRef = useRef(null);
  const imgRef        = useRef(null);
  const pollRef       = useRef(null);

  const stateRef = useRef({});
  stateRef.current = {
    activeTool, textInput, selectedEmoji,
    dragging, dragOffset, cropStart, cropRect,
    livePos, layers, imgSrc, pendingCrop,
    currentMediaFile, mediaVersionIdx,
  };

  const showToast = useCallback((msg) => {
    setToast(msg); setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); redo(); }
      if (e.key === "Escape") setSelectedFrameId(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [undo, redo]);

  // ── Poll export vidéo → remplace la vidéo quand done ─────────────────
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

  // ── Calques ───────────────────────────────────────────────────────────
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
      nl = { id: Date.now(), layer_type: type, position_x: posX, position_y: posY, annotations: content ? [{ content, annotation_type: annoType }] : [], ...extra };
    }
    pushLayers([...stateRef.current.layers, nl]);
    showToast(`Calque "${type}" ajouté`);
  }, [projectId, request, pushLayers, showToast]);

  const handleSaveLayerEdit = useCallback((id, text, color, size) => {
    pushLayers(stateRef.current.layers.map(l => l.id !== id ? l : {
      ...l, textColor: color, fontSize: size, annotations: [{ ...(l.annotations[0] || {}), content: text }]
    }));
    showToast("Texte modifié ✓");
  }, [pushLayers, showToast]);

  const deleteLayer = useCallback((id) => {
    pushLayers(stateRef.current.layers.filter(l => l.id !== id));
    setEditingLayer(null);
    if (id === selectedFrameId) setSelectedFrameId(null);
    showToast("Calque supprimé");
  }, [pushLayers, showToast, selectedFrameId]);

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

  // ── Mise à jour d'un cadre (poignées ou panneau) ───────────────────────
  // Utilise setHistory directement (sans pousser dans l'historique undo)
  // pour que les sliders soient fluides. Un seul push à la fin si besoin.
  const handleUpdateFrame = useCallback((id, patch) => {
    // Met à jour le layer directement dans l'état courant (pas d'historique intermédiaire)
    const updated = stateRef.current.layers.map(l => l.id !== id ? l : { ...l, ...patch });
    // pushLayers pour que le changement soit visible ET annulable
    pushLayers(updated);
  }, [pushLayers]);

  // ── Insert texte/emoji ─────────────────────────────────────────────────
  const handleInsertText = useCallback(() => {
    const txt = stateRef.current.textInput.trim();
    if (!txt) { showToast("Écris d'abord un texte"); return; }
    const cont = containerRef.current;
    addLayer("text", cont ? Math.round(cont.offsetWidth / 2) : 300, cont ? Math.round(cont.offsetHeight / 2) : 200, txt, "text");
    setTextInput(""); setActiveTool(null);
  }, [addLayer, showToast]);

  const handleInsertEmoji = useCallback(() => {
    const emoji = stateRef.current.selectedEmoji;
    const cont  = containerRef.current;
    addLayer("emoji", cont ? Math.round(cont.offsetWidth / 2) : 300, cont ? Math.round(cont.offsetHeight / 2) : 200, emoji, "emoji");
    setActiveTool(null);
  }, [addLayer]);

  // ── Crop photo ────────────────────────────────────────────────────────
  const performPhotoCrop = useCallback((rect) => {
    const img = imgRef.current;
    if (!img || !rect || rect.w < 5 || rect.h < 5) return;
    const cont = containerRef.current.getBoundingClientRect();
    const ir   = img.getBoundingClientRect();
    const sx = Math.max(0, (rect.x - (ir.left - cont.left)) * (img.naturalWidth  / ir.width));
    const sy = Math.max(0, (rect.y - (ir.top  - cont.top))  * (img.naturalHeight / ir.height));
    const sw = Math.min(rect.w * (img.naturalWidth  / ir.width),  img.naturalWidth  - sx);
    const sh = Math.min(rect.h * (img.naturalHeight / ir.height), img.naturalHeight - sy);
    if (sw <= 0 || sh <= 0) return;
    const c = document.createElement("canvas");
    c.width = sw; c.height = sh;
    c.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const dataUrl = c.toDataURL("image/png");
    setCropHistory(prev => [...prev, stateRef.current.imgSrc]);
    setImgSrc(dataUrl);
    showToast(`✂️ ${Math.round(sw)}×${Math.round(sh)}px recadré`);
  }, [showToast]);

  const undoPhotoCrop = useCallback(() => {
    if (!cropHistory.length) return;
    setImgSrc(cropHistory[cropHistory.length - 1]);
    setCropHistory(h => h.slice(0, -1));
    showToast("Recadrage annulé");
  }, [cropHistory, showToast]);

  // ── Crop vidéo → nouveau MediaFile ────────────────────────────────────
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

  const cancelVideoCrop = useCallback(() => { setPendingCrop(null); setPendingCropPreviewUrl(null); showToast("Zone annulée"); }, [showToast]);

  // ── Téléchargement / Partage ──────────────────────────────────────────
  // Desktop → <a download>, Mobile → navigator.share si dispo
  const handleDownload = useCallback(async (url, filename) => {
    try {
      // Fetch en blob pour forcer le téléchargement (évite l'ouverture dans un nouvel onglet)
      const res     = await fetch(url);
      const blob    = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a       = document.createElement("a");
      a.href     = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      showToast("✓ Téléchargement lancé !");
    } catch {
      // Fallback si fetch bloqué
      window.open(url, "_blank");
      showToast("✓ Fichier ouvert dans un nouvel onglet");
    }

    // Partage natif mobile en parallèle (optionnel, non bloquant)
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (isMobile && navigator.share && navigator.canShare?.({ url })) {
      navigator.share({ url, title: filename }).catch(() => {});
    }
  }, [showToast]);

  // ── Export photo ImageMagick ──────────────────────────────────────────
  const handleExportImage = useCallback(async () => {
    setExporting(true);
    const { layers: ls } = stateRef.current;
    const mf = stateRef.current.currentMediaFile;
    const layerIds   = ls.filter(l => typeof l.id === "number" && l.id < 1e12).map(l => l.id);
    const layersMeta = ls.filter(l => typeof l.id === "number" && l.id < 1e12 && l.layer_type === "text")
      .map(l => ({ id: l.id, text_color: l.textColor || "#ffffff", font_size: l.fontSize || 28 }));
    const frameLayer = ls.find(l => l.layer_type === "frame");
    const body = { layer_ids: layerIds, layers_meta: layersMeta };
    if (frameLayer?.framePreset) {
      body.frame_preset    = frameLayer.framePreset;
      body.frame_color     = frameLayer.frameColor || null;
      body.frame_thickness = frameLayer.frameThickness || null;
      body.frame_scale     = frameLayer.frameScale || 1;
      body.frame_offset_x  = frameLayer.frameOffsetX || 0;
      body.frame_offset_y  = frameLayer.frameOffsetY || 0;
    }
    try {
      const res  = await fetch(`${API}/projects/${projectId}/media_files/${mf.id}/exports`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.image_url) {
        await handleDownload(data.image_url, `export-${Date.now()}.png`);
      } else { showToast("Erreur export image"); }
    } catch (err) { showToast(`Erreur : ${err.message}`); }
    finally { setExporting(false); }
  }, [projectId, showToast, handleDownload]);

  // ── Export vidéo ffmpeg ───────────────────────────────────────────────
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
    const mediaId = mf._isExport ? initialMediaFile.id : mf.id;
    try {
      const res  = await fetch(`${API}/projects/${projectId}/media_files/${mediaId}/exports`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      setVideoExportToken(data.token);
      showToast("⏳ ffmpeg en cours...");
    } catch { showToast("Erreur export"); setVideoExportStatus(null); }
    setExporting(false);
  }, [projectId, initialMediaFile, showToast]);

  // ── Télécharger la vidéo exportée ─────────────────────────────────────
  const handleDownloadVideo = useCallback(async () => {
    if (!videoDownloadUrl) return;
    await handleDownload(videoDownloadUrl, "export-final.mp4");
  }, [videoDownloadUrl, handleDownload]);

  // ── Événements canvas ─────────────────────────────────────────────────
  const handleCanvasClick = useCallback((e) => {
    const { activeTool: tool, dragging: drag, textInput: txt, selectedEmoji: emoji } = stateRef.current;
    if (drag) return;
    // Clic sur zone vide = désélectionne le cadre
    setSelectedFrameId(null);
    if (!tool || tool === "crop" || tool === "frame") return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (tool === "text") {
      if (txt.trim()) { addLayer("text", x, y, txt, "text"); setTextInput(""); setActiveTool(null); }
      else showToast("Écris d'abord ton texte dans le champ");
    } else if (tool === "emoji") { addLayer("emoji", x, y, emoji, "emoji"); setActiveTool(null); }
  }, [addLayer, showToast]);

  const handleToolSelect = useCallback((tool) => {
    if (tool === "crop" && isVideo) { setShowVideoCrop(true); return; }
    setActiveTool(prev => prev === tool ? null : tool);
    setShowFramePicker(prev => tool === "frame" ? !prev : false);
  }, [isVideo]);

  const handleLayerMouseDown = useCallback((e, layer) => {
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    setDragging(layer.id);
    setLivePos({ [layer.id]: { x: layer.position_x, y: layer.position_y } });
    setDragOffset({ x: e.clientX - rect.left - layer.position_x, y: e.clientY - rect.top - layer.position_y });
  }, []);

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

  const handleCropMouseDown = useCallback((e) => {
    if (stateRef.current.activeTool !== "crop" || isVideo) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCropStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setCropRect(null);
  }, [isVideo]);

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