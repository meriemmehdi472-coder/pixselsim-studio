import { useState, useCallback } from "react";

export function uselayers({ projectId, request, pushLayers, showToast, containerRef, stateRef }) {

  const [dragging, setDragging]         = useState(null);           // ID du calque en cours de drag
  const [dragOffset, setDragOffset]     = useState({ x: 0, y: 0 });
  const [livePos, setLivePos]           = useState({});             // Position live pendant le drag
  const [editingLayer, setEditingLayer] = useState(null);           // Calque texte en cours d'édition
  const [selectedFrameId, setSelectedFrameId] = useState(null);    // Cadre sélectionné pour les poignées
  const [showFramePicker, setShowFramePicker] = useState(false);

  // Crée un calque côté API puis l'ajoute à l'historique local
  // En cas d'erreur API, crée un calque local temporaire (mode offline)
  const addLayer = useCallback(async (type, posX = 100, posY = 100, content = "", annoType = "text", extra = {}) => {
    const mf = stateRef.current.currentMediaFile;
    let nl;
    try {
      const l = await request(`/projects/${projectId}/media_files/${mf.id}/layers`, {
        method: "POST",
        body: JSON.stringify({ layer: { layer_type: type, position_x: posX, position_y: posY } }),
      });
      nl = { ...l, annotations: [], ...extra };
      if (content) {
        const a = await request(`/projects/${projectId}/media_files/${mf.id}/layers/${l.id}/annotations`, {
          method: "POST",
          body: JSON.stringify({ annotation: { content, annotation_type: annoType, pos_x: posX, pos_y: posY } }),
        });
        nl.annotations = [a];
      }
    } catch {
      // Fallback local si l'API est indisponible
      nl = {
        id: Date.now(), layer_type: type, position_x: posX, position_y: posY,
        annotations: content ? [{ content, annotation_type: annoType }] : [],
        ...extra,
      };
    }
    pushLayers([...stateRef.current.layers, nl]);
    showToast(`Calque "${type}" ajouté`);
  }, [projectId, request, pushLayers, showToast, stateRef]);

  // Sauvegarde les modifications d'un calque texte (contenu, couleur, taille)
  const handleSaveLayerEdit = useCallback((id, text, color, size) => {
    pushLayers(stateRef.current.layers.map(l => l.id !== id ? l : {
      ...l, textColor: color, fontSize: size,
      annotations: [{ ...(l.annotations[0] || {}), content: text }],
    }));
    showToast("Texte modifié ✓");
  }, [pushLayers, showToast, stateRef]);

  // Supprime un calque de l'historique
  const deleteLayer = useCallback((id) => {
    pushLayers(stateRef.current.layers.filter(l => l.id !== id));
    setEditingLayer(null);
    if (id === stateRef.current.selectedFrameId) setSelectedFrameId(null);
    showToast("Calque supprimé");
  }, [pushLayers, showToast, stateRef]);

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
  }, [pushLayers, showToast, stateRef]);

  // Met à jour les propriétés d'un cadre existant (scale, offset, couleur, épaisseur)
  // Chaque changement est enregistré dans l'historique pour permettre l'undo
  const handleUpdateFrame = useCallback((id, patch) => {
    const updated = stateRef.current.layers.map(l => l.id !== id ? l : { ...l, ...patch });
    pushLayers(updated);
  }, [pushLayers, stateRef]);

  // Insère un texte au centre du canvas
  const handleInsertText = useCallback((textInput, setTextInput, setActiveTool) => {
    const txt = textInput.trim();
    if (!txt) { showToast("Écris d'abord un texte"); return; }
    const cont = containerRef.current;
    addLayer("text", cont ? Math.round(cont.offsetWidth / 2) : 300, cont ? Math.round(cont.offsetHeight / 2) : 200, txt, "text");
    setTextInput(""); setActiveTool(null);
  }, [addLayer, showToast, containerRef]);

  // Insère un emoji au centre du canvas
  const handleInsertEmoji = useCallback((selectedEmoji, setActiveTool) => {
    const cont = containerRef.current;
    addLayer("emoji", cont ? Math.round(cont.offsetWidth / 2) : 300, cont ? Math.round(cont.offsetHeight / 2) : 200, selectedEmoji, "emoji");
    setActiveTool(null);
  }, [addLayer, containerRef]);

  // ── Drag & drop ──────────────────────────────────────────────────────────

  // Début du drag d'un calque
  const handleLayerMouseDown = useCallback((e, layer) => {
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    setDragging(layer.id);
    setLivePos({ [layer.id]: { x: layer.position_x, y: layer.position_y } });
    setDragOffset({ x: e.clientX - rect.left - layer.position_x, y: e.clientY - rect.top - layer.position_y });
  }, [containerRef]);

  // Déplace le calque pendant le mouvement de souris
  const handleDragMouseMove = useCallback((e) => {
    if (!dragging) return;
    const rect = containerRef.current.getBoundingClientRect();
    setLivePos({
      [dragging]: {
        x: e.clientX - rect.left - dragOffset.x,
        y: e.clientY - rect.top  - dragOffset.y,
      }
    });
  }, [dragging, dragOffset, containerRef]);

  // Valide la nouvelle position du calque au relâchement
  const handleDragMouseUp = useCallback(() => {
    if (!dragging || !livePos[dragging]) return false;
    const { x, y } = livePos[dragging];
    pushLayers(stateRef.current.layers.map(l => l.id === dragging ? { ...l, position_x: x, position_y: y } : l));
    setDragging(null);
    setLivePos({});
    return true;
  }, [dragging, livePos, pushLayers, stateRef]);

  return {
    dragging, livePos, editingLayer, setEditingLayer,
    selectedFrameId, setSelectedFrameId,
    showFramePicker, setShowFramePicker,
    addLayer, deleteLayer, handleSaveLayerEdit,
    handleAddFrame, handleUpdateFrame,
    handleInsertText, handleInsertEmoji,
    handleLayerMouseDown, handleDragMouseMove, handleDragMouseUp,
  };
}



// Gestion des calques (texte, emoji, cadre) et du drag & drop sur le canvas.
// Chaque modification passe par pushLayers() pour alimenter l'historique undo/redo.
//
