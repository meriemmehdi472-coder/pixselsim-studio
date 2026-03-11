// hooks/useVideoCrop.js
//
// Recadrage vidéo côté serveur via ffmpeg.
// Envoie les coordonnées de crop au backend qui génère une nouvelle version de la vidéo.
// La nouvelle version est ajoutée à l'historique des médias pour permettre la navigation.
//
import { useState, useCallback } from "react";

export function useVideocrop({ projectId, request, showToast, mediaVersionIdx, setMediaVersions, setMediaVersionIdx, mediaVersionsRef }) {
  const [showVideoCrop, setShowVideoCrop]               = useState(false);
  const [pendingCrop, setPendingCrop]                   = useState(null);
  const [pendingCropPreviewUrl, setPendingCropPreviewUrl] = useState(null);
  const [videoCropLoading, setVideoCropLoading]         = useState(false);

  // Envoie la zone de crop au backend et reçoit la vidéo recadrée
  const handleVideoCropConfirm = useCallback(async (cropData, currentMediaFile) => {
    setShowVideoCrop(false);
    setVideoCropLoading(true);
    showToast("⏳ Recadrage en cours (ffmpeg)...");
    try {
      const newMf = await request(`/projects/${projectId}/media_files/${currentMediaFile.id}/crop`, {
        method: "POST",
        body: JSON.stringify({
          crop: {
            x: cropData.x, y: cropData.y,
            w: cropData.w, h: cropData.h,
            video_w: cropData.video_w, video_h: cropData.video_h,
          },
        }),
      });
      // Ajoute la nouvelle version recadrée à l'historique des médias
      setMediaVersions(prev => {
        const next = [...prev.slice(0, mediaVersionIdx + 1), newMf];
        mediaVersionsRef.current = next;
        return next;
      });
      setMediaVersionIdx(mediaVersionIdx + 1);
      setPendingCrop(null);
      setPendingCropPreviewUrl(null);
      showToast(`✓ Vidéo recadrée (${cropData.w}×${cropData.h}px)`);
    } catch (err) {
      showToast(`Erreur recadrage : ${err.message}`);
    } finally {
      setVideoCropLoading(false);
    }
  }, [projectId, request, showToast, mediaVersionIdx, setMediaVersions, setMediaVersionIdx, mediaVersionsRef]);

  const cancelVideoCrop = useCallback(() => {
    setPendingCrop(null);
    setPendingCropPreviewUrl(null);
    showToast("Zone annulée");
  }, [showToast]);

  return {
    showVideoCrop, setShowVideoCrop,
    pendingCrop, setPendingCrop,
    pendingCropPreviewUrl, setPendingCropPreviewUrl,
    videoCropLoading,
    handleVideoCropConfirm, cancelVideoCrop,
  };
}
