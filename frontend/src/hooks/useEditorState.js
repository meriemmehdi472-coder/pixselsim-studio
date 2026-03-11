// hooks/useEditorState.js
//
// Hook orchestrateur de l'éditeur.
// Délègue chaque responsabilité à un hook spécialisé :
//   - useHistrq      → undo/redo des calques
//   - uselayers      → gestion des calques et drag & drop
//   - usephotocrop   → recadrage photo (canvas natif)
//   - useVideocrop   → recadrage vidéo (ffmpeg serveur)
//   - useExport      → export photo (synchrone) et vidéo (asynchrone)
//
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "./useApi";
import { useHistrq } from "./useHistrq";
import { uselayers } from "./uselayers";
import { usephotocrop } from "./usephotocrop";
import { useVideocrop } from "./useVideocrop";
import { useExport } from "./useExport";

export function useEditorState(initialMediaFile) {
  const { projectId } = useParams();
  const navigate      = useNavigate();
  const { request }   = useApi();

  // ── Versions du média (recadrage vidéo crée une nouvelle version) ────────
  const [mediaVersions, setMediaVersions]     = useState([initialMediaFile]);
  const [mediaVersionIdx, setMediaVersionIdx] = useState(0);
  const mediaVersionsRef = useRef([initialMediaFile]);

  const currentMediaFile = mediaVersions[mediaVersionIdx];
  const isVideo          = currentMediaFile?.media_type === "video";

  const canUndoMedia     = mediaVersionIdx > 0;
  const canRedoMedia     = mediaVersionIdx < mediaVersions.length - 1;
  const undoMediaVersion = useCallback(() => setMediaVersionIdx(i => Math.max(0, i - 1)), []);
  const redoMediaVersion = useCallback(() => setMediaVersionIdx(i => Math.min(mediaVersionsRef.current.length - 1, i + 1)), []);

  // ── Historique des calques ────────────────────────────────────────────────
  const { current: layers, push: pushLayers, undo, redo, canUndo, canRedo } = useHistrq([]);

  // ── États UI ─────────────────────────────────────────────────────────────
  const [activeTool, setActiveTool]       = useState(null);   // "crop" | "text" | "emoji" | "frame" | null
  const [textInput, setTextInput]         = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("😂");
  const [toast, setToast]                 = useState(null);
  const [imgSrc, setImgSrc]               = useState(currentMediaFile?.url || null);

  // ── Refs DOM ─────────────────────────────────────────────────────────────
  const containerRef  = useRef(null);  // Div contenant le média
  const canvasWrapRef = useRef(null);  // Wrapper externe (pour le bouton ×)
  const imgRef        = useRef(null);  // Élément <img> ou <video>

  // Ref partagée entre tous les hooks pour accéder à l'état courant
  // sans recréer les fonctions à chaque rendu
  const stateRef = useRef({});
  stateRef.current = {
    activeTool, textInput, selectedEmoji,
    layers, imgSrc, currentMediaFile, mediaVersionIdx,
  };

  // Affiche un toast (notification) pendant 4 secondes
  const showToast = useCallback((msg) => {
    setToast(msg); setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Hooks spécialisés ────────────────────────────────────────────────────

  const layersHook = uselayers({
    projectId, request, pushLayers, showToast, containerRef, stateRef,
  });

  const photoCropHook = usephotocrop({
    imgRef, containerRef, showToast, imgSrc, setImgSrc,
  });

  const videoCropHook = useVideocrop({
    projectId, request, showToast,
    mediaVersionIdx, setMediaVersions, setMediaVersionIdx, mediaVersionsRef,
  });

  const exportHook = useExport({
    projectId, initialMediaFile, showToast,
    stateRef: { current: { ...stateRef.current, livePos: layersHook.livePos } },
    imgRef,
    mediaVersionIdx, setMediaVersions, setMediaVersionIdx, mediaVersionsRef,
  });

  // ── Raccourcis clavier ───────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); redo(); }
      if (e.key === "Escape") layersHook.setSelectedFrameId(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [undo, redo]);

  // ── Événements canvas ────────────────────────────────────────────────────

  // Clic sur le canvas : place un calque texte/emoji à la position cliquée
  const handleCanvasClick = useCallback((e) => {
    const { activeTool: tool, textInput: txt, selectedEmoji: emoji } = stateRef.current;
    if (layersHook.dragging) return;
    layersHook.setSelectedFrameId(null);
    if (!tool || tool === "crop" || tool === "frame") return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (tool === "text") {
      if (txt.trim()) {
        layersHook.addLayer("text", x, y, txt, "text");
        setTextInput(""); setActiveTool(null);
      } else showToast("Écris d'abord ton texte dans le champ");
    } else if (tool === "emoji") {
      layersHook.addLayer("emoji", x, y, emoji, "emoji");
      setActiveTool(null);
    }
  }, [layersHook, showToast]);

  // Sélection d'outil dans la sidebar
  const handleToolSelect = useCallback((tool) => {
    if (tool === "crop" && isVideo) { videoCropHook.setShowVideoCrop(true); return; }
    setActiveTool(prev => prev === tool ? null : tool);  // Toggle
    layersHook.setShowFramePicker(prev => tool === "frame" ? !prev : false);
  }, [isVideo, layersHook, videoCropHook]);

  // Mouvement de la souris : déplace le calque ou dessine le rectangle de crop
  const handleMouseMove = useCallback((e) => {
    layersHook.handleDragMouseMove(e);
    if (stateRef.current.activeTool === "crop" && !isVideo) {
      photoCropHook.handleCropMouseMove(e, isVideo);
    }
  }, [layersHook, photoCropHook, isVideo]);

  // Relâchement de la souris : valide le déplacement ou déclenche le crop
  const handleMouseUp = useCallback(() => {
    layersHook.handleDragMouseUp();
    const cropped = photoCropHook.handleCropMouseUp(stateRef.current.activeTool, isVideo);
    if (cropped) setActiveTool(null);
  }, [layersHook, photoCropHook, isVideo]);

  // Début du dessin du rectangle de crop photo
  const handleCropMouseDown = useCallback((e) => {
    if (stateRef.current.activeTool !== "crop" || isVideo) return;
    photoCropHook.handleCropMouseDown(e, isVideo);
  }, [photoCropHook, isVideo]);

  // ── Retour de tous les états et handlers ─────────────────────────────────
  return {
    navigate, projectId,
    currentMediaFile, isVideo,
    mediaVersionIdx, mediaVersionsCount: mediaVersions.length,
    canUndoMedia, canRedoMedia, undoMediaVersion, redoMediaVersion,

    layers, undo, redo, canUndo, canRedo,

    activeTool, setActiveTool, handleToolSelect,
    textInput, setTextInput, selectedEmoji, setSelectedEmoji,
    toast, setToast, showToast,
    imgSrc,

    // Layers
    ...layersHook,
    handleInsertText:  () => layersHook.handleInsertText(textInput, setTextInput, setActiveTool),
    handleInsertEmoji: () => layersHook.handleInsertEmoji(selectedEmoji, setActiveTool),

    // Photo crop
    cropHistory:   photoCropHook.cropHistory,
    cropRect:      photoCropHook.cropRect,
    undoPhotoCrop: photoCropHook.undoPhotoCrop,

    // Video crop
    videoCropLoading:         videoCropHook.videoCropLoading,
    showVideoCrop:            videoCropHook.showVideoCrop,
    setShowVideoCrop:         videoCropHook.setShowVideoCrop,
    pendingCrop:              videoCropHook.pendingCrop,
    setPendingCrop:           videoCropHook.setPendingCrop,
    pendingCropPreviewUrl:    videoCropHook.pendingCropPreviewUrl,
    setPendingCropPreviewUrl: videoCropHook.setPendingCropPreviewUrl,
    handleVideoCropConfirm:   (cropData) => videoCropHook.handleVideoCropConfirm(cropData, currentMediaFile),
    cancelVideoCrop:          videoCropHook.cancelVideoCrop,

    // Export
    ...exportHook,

    // Canvas events
    handleCanvasClick, handleCropMouseDown, handleMouseMove, handleMouseUp,

    // Refs
    containerRef, canvasWrapRef, imgRef,
  };
}