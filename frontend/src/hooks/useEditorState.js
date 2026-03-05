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
  const undo = useCallback(() => { const i = Math.max(0, idxRef.current-1); idxRef.current=i; setIndex(i); }, []);
  const redo = useCallback(() => { const i = Math.min(histRef.current.length-1, idxRef.current+1); idxRef.current=i; setIndex(i); }, []);
  return { current: history[index], push, undo, redo, canUndo: index>0, canRedo: index<history.length-1 };
}

export function useEditorState(mediaFile) {
  const { projectId } = useParams();
  const navigate      = useNavigate();
  const { request }   = useApi();
  const isVideo = mediaFile?.media_type === "video";

  const { current: layers, push: pushLayers, undo, redo, canUndo, canRedo } = useHistory([]);

  const [activeTool, setActiveTool]           = useState(null);
  const [textInput, setTextInput]             = useState("");
  const [selectedEmoji, setSelectedEmoji]     = useState("😂");
  const [toast, setToast]                     = useState(null);
  const [showFramePicker, setShowFramePicker] = useState(false);
  const [editingLayer, setEditingLayer]       = useState(null);
  const [dragging, setDragging]               = useState(null);
  const [dragOffset, setDragOffset]           = useState({ x: 0, y: 0 });
  const [livePos, setLivePos]                 = useState({});
  const [imgSrc, setImgSrc]                   = useState(mediaFile?.url || null);
  const [cropHistory, setCropHistory]         = useState([]);
  const [cropRect, setCropRect]               = useState(null);
  const [cropStart, setCropStart]             = useState(null);
  const [showVideoCrop, setShowVideoCrop]     = useState(false);
  const [pendingCrop, setPendingCrop]         = useState(null);
  const [pendingCropPreviewUrl, setPendingCropPreviewUrl] = useState(null);
  const [videoExportToken, setVideoExportToken]   = useState(null);
  const [videoExportStatus, setVideoExportStatus] = useState(null);
  const [videoDownloadUrl, setVideoDownloadUrl]   = useState(null);
  const [exporting, setExporting]             = useState(false);
  const [exportFmt, setExportFmt]             = useState("png");

  const containerRef  = useRef(null);
  const canvasWrapRef = useRef(null);
  const imgRef        = useRef(null);
  const pollRef       = useRef(null);

  // ── stateRef : accès synchrone à toutes les valeurs courantes ────────────
  const stateRef = useRef({});
  useEffect(() => {
    stateRef.current = {
      activeTool, textInput, selectedEmoji,
      dragging, dragOffset, cropStart, cropRect,
      livePos, layers, imgSrc, pendingCrop,
    };
  });
  stateRef.current = {
    activeTool, textInput, selectedEmoji,
    dragging, dragOffset, cropStart, cropRect,
    livePos, layers, imgSrc, pendingCrop,
  };

  const showToast = useCallback((msg) => {
    setToast(msg); setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey||e.metaKey) && !e.shiftKey && e.key==="z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey||e.metaKey) && (e.key==="y"||(e.shiftKey&&e.key==="z"))) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [undo, redo]);

  // ── Poll export vidéo ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!videoExportToken || videoExportStatus==="done" || videoExportStatus==="failed") return;
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${API}/exports/${videoExportToken}`);
        const data = await res.json();
        setVideoExportStatus(data.status);
        if (data.status==="done") {
          const base = import.meta.env.VITE_API_URL || "http://localhost:3000";
          setVideoDownloadUrl(`${base}${data.download_url}`);
          showToast("✓ Vidéo prête !");
          clearInterval(pollRef.current);
        } else if (data.status==="failed") {
          showToast(`Erreur : ${data.error}`);
          clearInterval(pollRef.current);
        }
      } catch { clearInterval(pollRef.current); }
    }, 2000);
    return () => clearInterval(pollRef.current);
  }, [videoExportToken, videoExportStatus, showToast]);

  // ── addLayer ──────────────────────────────────────────────────────────────
  const addLayer = useCallback(async (type, posX=100, posY=100, content="", annoType="text", extra={}) => {
    let nl;
    try {
      const l = await request(`/projects/${projectId}/media_files/${mediaFile.id}/layers`, {
        method: "POST",
        body: JSON.stringify({ layer: { layer_type: type, position_x: posX, position_y: posY } }),
      });
      nl = { ...l, annotations: [], ...extra };
      if (content) {
        const a = await request(`/projects/${projectId}/media_files/${mediaFile.id}/layers/${l.id}/annotations`, {
          method: "POST",
          body: JSON.stringify({ annotation: { content, annotation_type: annoType, pos_x: posX, pos_y: posY } }),
        });
        nl.annotations = [a];
      }
    } catch {
      nl = {
        id: Date.now(), layer_type: type, position_x: posX, position_y: posY,
        annotations: content ? [{ content, annotation_type: annoType }] : [],
        ...extra
      };
    }
    pushLayers([...stateRef.current.layers, nl]);
    showToast(`Calque "${type}" ajouté`);
  }, [projectId, mediaFile, request, pushLayers, showToast]);

  const handleSaveLayerEdit = useCallback((id, text, color, size) => {
    pushLayers(stateRef.current.layers.map(l => l.id!==id ? l : {
      ...l, textColor: color, fontSize: size,
      annotations: [{ ...(l.annotations[0]||{}), content: text }]
    }));
    showToast("Texte modifié ✓");
  }, [pushLayers, showToast]);

  const deleteLayer = useCallback((id) => {
    pushLayers(stateRef.current.layers.filter(l => l.id!==id));
    setEditingLayer(null);
    showToast("Calque supprimé");
  }, [pushLayers, showToast]);

  const handleAddFrame = useCallback(({ preset, wrapperStyle, mediaStyle }) => {
    pushLayers([...stateRef.current.layers, {
      id: Date.now(), layer_type: "frame", position_x: 0, position_y: 0,
      annotations: [], wrapperStyle, mediaStyle, frameLabel: preset.label
    }]);
    setShowFramePicker(false);
    showToast(`Forme "${preset.label}" appliquée`);
  }, [pushLayers, showToast]);

  // ── INSERT au centre du canvas ────────────────────────────────────────────
  const handleInsertText = useCallback(() => {
    const txt = stateRef.current.textInput.trim();
    if (!txt) { showToast("Écris d'abord un texte"); return; }
    const cont = containerRef.current;
    const cx = cont ? Math.round(cont.offsetWidth  / 2) : 300;
    const cy = cont ? Math.round(cont.offsetHeight / 2) : 200;
    addLayer("text", cx, cy, txt, "text");
    setTextInput("");
    setActiveTool(null);
  }, [addLayer, showToast]);

  const handleInsertEmoji = useCallback(() => {
    const emoji = stateRef.current.selectedEmoji;
    const cont  = containerRef.current;
    const cx = cont ? Math.round(cont.offsetWidth  / 2) : 300;
    const cy = cont ? Math.round(cont.offsetHeight / 2) : 200;
    addLayer("emoji", cx, cy, emoji, "emoji");
    setActiveTool(null);
  }, [addLayer]);

  // ── Crop photo ────────────────────────────────────────────────────────────
  const performPhotoCrop = useCallback((rect) => {
    const img = imgRef.current;
    if (!img||!rect||rect.w<5||rect.h<5) return;
    const cont = containerRef.current.getBoundingClientRect();
    const ir   = img.getBoundingClientRect();
    const sx   = Math.max(0, (rect.x-(ir.left-cont.left)) * (img.naturalWidth/ir.width));
    const sy   = Math.max(0, (rect.y-(ir.top-cont.top))   * (img.naturalHeight/ir.height));
    const sw   = Math.min(rect.w*(img.naturalWidth/ir.width),  img.naturalWidth-sx);
    const sh   = Math.min(rect.h*(img.naturalHeight/ir.height), img.naturalHeight-sy);
    if (sw<=0||sh<=0) return;
    const c = document.createElement("canvas");
    c.width=sw; c.height=sh;
    c.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const dataUrl = c.toDataURL("image/png");
    setCropHistory(prev => [...prev, stateRef.current.imgSrc]);
    setImgSrc(dataUrl);
    const a = document.createElement("a");
    a.href=dataUrl; a.download=`recadrage-${Date.now()}.png`; a.click();
    showToast(`✂️ ${Math.round(sw)}×${Math.round(sh)}px recadré`);
  }, [showToast]);

  const undoPhotoCrop = useCallback(() => {
    const hist = cropHistory;
    if (!hist.length) return;
    setImgSrc(hist[hist.length-1]);
    setCropHistory(h => h.slice(0,-1));
    showToast("Recadrage annulé");
  }, [cropHistory, showToast]);

  // ── Crop vidéo ────────────────────────────────────────────────────────────
  const handleVideoCropConfirm = useCallback((cropData) => {
    setShowVideoCrop(false);
    setPendingCrop(cropData);
    // Pas d'aperçu canvas (bloqué par CORS sur vidéo cross-origin)
    // L'aperçu affiche juste le badge "Zone sélectionnée"
    setPendingCropPreviewUrl(null);
    showToast(`Zone ${cropData.w}×${cropData.h}px sélectionnée`);
  }, [showToast]);

  const cancelVideoCrop = useCallback(() => {
    setPendingCrop(null);
    setPendingCropPreviewUrl(null);
    showToast("Zone annulée — vidéo originale restaurée");
  }, [showToast]);

  // ── Export vidéo ──────────────────────────────────────────────────────────
  const handleExportVideo = useCallback(async () => {
    setExporting(true); setVideoExportStatus("pending"); setVideoDownloadUrl(null);
    try {
      const { layers: ls, pendingCrop: crop } = stateRef.current;

      const layerIds = ls.filter(l => typeof l.id === "number" && l.id < 1e12).map(l => l.id);

      const layersMeta = ls
        .filter(l => typeof l.id === "number" && l.id < 1e12 && l.layer_type === "text")
        .map(l => ({ id: l.id, text_color: l.textColor || "#ffffff", font_size: l.fontSize || 28 }));

      const videoEl = imgRef.current;
      const canvas_w = videoEl ? Math.round(videoEl.getBoundingClientRect().width)  : null;
      const canvas_h = videoEl ? Math.round(videoEl.getBoundingClientRect().height) : null;

      const body = { layer_ids: layerIds, layers_meta: layersMeta, canvas_w, canvas_h };
      if (crop) body.crop = { x: crop.x, y: crop.y, w: crop.w, h: crop.h, video_w: crop.video_w, video_h: crop.video_h };

      const res  = await fetch(`${API}/projects/${projectId}/media_files/${mediaFile.id}/exports`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      setVideoExportToken(data.token);
      showToast("⏳ ffmpeg grave les textes/emojis...");
    } catch { showToast("Erreur export"); setVideoExportStatus(null); }
    setExporting(false);
  }, [projectId, mediaFile, showToast]);

  // ── Événements canvas ─────────────────────────────────────────────────────
  const handleCanvasClick = useCallback((e) => {
    const { activeTool: tool, dragging: drag, textInput: txt, selectedEmoji: emoji } = stateRef.current;
    if (drag) return;
    if (!tool || tool==="crop" || tool==="frame") return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (tool==="text") {
      if (txt.trim()) {
        addLayer("text", x, y, txt, "text");
        setTextInput(""); setActiveTool(null);
      } else {
        showToast("Écris d'abord ton texte dans le champ");
      }
    } else if (tool==="emoji") {
      addLayer("emoji", x, y, emoji, "emoji");
      setActiveTool(null);
    }
  }, [addLayer, showToast]);

  const handleToolSelect = useCallback((tool) => {
    if (tool==="crop" && isVideo) { setShowVideoCrop(true); return; }
    setActiveTool(prev => prev===tool ? null : tool);
    setShowFramePicker(prev => tool==="frame" ? !prev : false);
  }, [isVideo]);

  const handleLayerMouseDown = useCallback((e, layer) => {
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    setDragging(layer.id);
    setLivePos({ [layer.id]: { x: layer.position_x, y: layer.position_y } });
    setDragOffset({ x: e.clientX-rect.left-layer.position_x, y: e.clientY-rect.top-layer.position_y });
  }, []);

  const handleMouseMove = useCallback((e) => {
    const { dragging: drag, dragOffset: off, cropStart: cs, activeTool: tool } = stateRef.current;
    if (drag) {
      const rect = containerRef.current.getBoundingClientRect();
      setLivePos({ [drag]: { x: e.clientX-rect.left-off.x, y: e.clientY-rect.top-off.y } });
    }
    if (tool==="crop" && cs && !isVideo) {
      const rect = containerRef.current.getBoundingClientRect();
      const x=e.clientX-rect.left, y=e.clientY-rect.top;
      setCropRect({ x:Math.min(cs.x,x), y:Math.min(cs.y,y), w:Math.abs(x-cs.x), h:Math.abs(y-cs.y) });
    }
  }, [isVideo]);

  const handleMouseUp = useCallback(() => {
    const { dragging: drag, livePos: lp, layers: ls, cropRect: cr, activeTool: tool } = stateRef.current;
    if (drag && lp[drag]) {
      const {x,y} = lp[drag];
      pushLayers(ls.map(l => l.id===drag ? {...l, position_x:x, position_y:y} : l));
      setDragging(null); setLivePos({});
    }
    if (tool==="crop" && cr && cr.w>10 && !isVideo) {
      performPhotoCrop(cr);
      setActiveTool(null); setCropRect(null); setCropStart(null);
    }
  }, [pushLayers, isVideo, performPhotoCrop]);

  const handleCropMouseDown = useCallback((e) => {
    const { activeTool: tool } = stateRef.current;
    if (tool!=="crop" || isVideo) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCropStart({ x:e.clientX-rect.left, y:e.clientY-rect.top });
    setCropRect(null);
  }, [isVideo]);

  return {
    navigate, projectId, isVideo,
    layers, undo, redo, canUndo, canRedo,
    addLayer, deleteLayer, handleSaveLayerEdit, handleAddFrame,
    activeTool, setActiveTool, handleToolSelect,
    textInput, setTextInput, selectedEmoji, setSelectedEmoji,
    toast, setToast, showToast,
    showFramePicker, setShowFramePicker,
    editingLayer, setEditingLayer,
    exportFmt, setExportFmt, exporting, setExporting,
    imgSrc, cropHistory, undoPhotoCrop,
    cropRect, cropStart,
    showVideoCrop, setShowVideoCrop,
    pendingCrop, setPendingCrop,
    pendingCropPreviewUrl, setPendingCropPreviewUrl,
    handleVideoCropConfirm, cancelVideoCrop,
    videoExportStatus, videoDownloadUrl, handleExportVideo,
    handleCanvasClick, handleCropMouseDown, handleMouseMove, handleMouseUp, handleLayerMouseDown,
    handleInsertText, handleInsertEmoji,
    dragging, livePos,
    containerRef, canvasWrapRef, imgRef,
  };
}