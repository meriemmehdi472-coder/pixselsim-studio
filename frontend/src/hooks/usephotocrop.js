import { useState, useCallback } from "react";

export function usephotocrop({ imgRef, containerRef, showToast, imgSrc, setImgSrc }) {
  const [cropHistory, setCropHistory] = useState([]);  // Historique pour undo
  const [cropRect, setCropRect]       = useState(null); // Rectangle de sélection en cours
  const [cropStart, setCropStart]     = useState(null); // Point de départ du drag

  // Applique le recadrage sur l'image affichée
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
    setCropHistory(prev => [...prev, imgSrc]);  // Sauvegarde pour undo
    setImgSrc(dataUrl);
    showToast(`✂️ ${Math.round(sw)}×${Math.round(sh)}px recadré`);
  }, [imgRef, containerRef, imgSrc, setImgSrc, showToast]);

  // Annule le dernier recadrage en restaurant l'image précédente
  const undoPhotoCrop = useCallback(() => {
    if (!cropHistory.length) return;
    setImgSrc(cropHistory[cropHistory.length - 1]);
    setCropHistory(h => h.slice(0, -1));
    showToast("Recadrage annulé");
  }, [cropHistory, setImgSrc, showToast]);

  // Début du dessin du rectangle de sélection crop
  const handleCropMouseDown = useCallback((e, isVideo) => {
    if (isVideo) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCropStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setCropRect(null);
  }, [containerRef]);

  // Mise à jour du rectangle pendant le drag
  const handleCropMouseMove = useCallback((e, isVideo) => {
    if (isVideo) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    setCropRect(cs => cs
      ? { x: Math.min(cs.x, x), y: Math.min(cs.y, y), w: Math.abs(x - cs.x), h: Math.abs(y - cs.y) }
      : null
    );
  }, [containerRef]);

  // Valide ou annule le crop au relâchement
  const handleCropMouseUp = useCallback((activeTool, isVideo) => {
    if (activeTool === "crop" && cropRect && cropRect.w > 10 && !isVideo) {
      performPhotoCrop(cropRect);
      setCropRect(null);
      setCropStart(null);
      return true; // Signale qu'un crop a été effectué (pour reset l'outil)
    }
    return false;
  }, [cropRect, performPhotoCrop]);

  return {
    cropHistory, cropRect, cropStart,
    setCropRect, setCropStart,
    performPhotoCrop, undoPhotoCrop,
    handleCropMouseDown, handleCropMouseMove, handleCropMouseUp,
  };
}



// Recadrage photo côté client via un <canvas> HTML.
// Le résultat est une dataURL stockée dans imgSrc (pas de requête serveur).
// Gère aussi l'historique des recadrages pour permettre l'undo.
//
