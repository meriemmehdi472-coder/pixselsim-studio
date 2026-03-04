// components/CanvasEditor.jsx
// Orchestrateur : branche le hook d'état sur les composants visuels.
// 3 responsabilités séparées :
//   useEditorState  → toute la logique / state
//   EditorSidebar   → sidebar gauche
//   EditorCanvas    → zone de rendu centrale

import { useEditorState }  from "../hooks/useEditorState";
import EditorSidebar       from "./EditorSidebar";
import EditorCanvas        from "./EditorCanvas";
import FramePicker         from "./Framepicker";
import LayerEditModal      from "./LayerEditModal";
import VideoCropSelector   from "./Videocropselector";
import Toast               from "./Toast";
import { FONT }            from "../styles";

async function exportImage(el, format = "png") {
  const { default: h2c } = await import("html2canvas");
  const canvas  = await h2c(el, { useCORS: true, backgroundColor: null, scale: 2 });
  const dataUrl = canvas.toDataURL(format === "jpeg" ? "image/jpeg" : "image/png", 0.95);
  const a = document.createElement("a");
  a.href = dataUrl; a.download = `export-${Date.now()}.${format}`; a.click();
}

export default function CanvasEditor({ mediaFile }) {
  const s = useEditorState(mediaFile);

  const handleExportImage = async () => {
    try { await exportImage(s.canvasWrapRef.current, s.exportFmt); s.showToast(`✓ Exporté ${s.exportFmt.toUpperCase()}`); }
    catch { s.showToast("npm i html2canvas"); }
  };

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", background: "#08080f", fontFamily: FONT, overflow: "hidden" }}>

      <EditorSidebar
        isVideo={s.isVideo}
        onBack={() => s.navigate(`/projects/${s.projectId}`)}
        undo={s.undo} redo={s.redo} canUndo={s.canUndo} canRedo={s.canRedo}
        activeTool={s.activeTool} onToolSelect={s.handleToolSelect}
        textInput={s.textInput} onTextChange={s.setTextInput}
        selectedEmoji={s.selectedEmoji} onEmojiChange={s.setSelectedEmoji}
        onInsertText={s.handleInsertText} onInsertEmoji={s.handleInsertEmoji}
        layers={s.layers} onDeleteLayer={s.deleteLayer}
        onEditLayer={(l) => l.layer_type === "text" && s.setEditingLayer(l)}
        cropHistory={s.cropHistory} onUndoPhotoCrop={s.undoPhotoCrop}
        pendingCrop={s.pendingCrop}
        onModifyVideoCrop={() => { s.setPendingCrop(null); s.setPendingCropPreviewUrl(null); s.setShowVideoCrop(true); }}
        onCancelVideoCrop={s.cancelVideoCrop}
        exportFmt={s.exportFmt} onExportFmtChange={s.setExportFmt}
        onExportImage={handleExportImage} exporting={s.exporting}
        onSelectZone={() => s.setShowVideoCrop(true)}
        videoExportStatus={s.videoExportStatus}
        videoDownloadUrl={s.videoDownloadUrl}
        onExportVideo={s.handleExportVideo}
      />

      <EditorCanvas
        isVideo={s.isVideo} mediaFile={mediaFile}
        imgSrc={s.imgSrc}
        pendingCrop={s.pendingCrop} pendingCropPreviewUrl={s.pendingCropPreviewUrl}
        layers={s.layers} dragging={s.dragging} livePos={s.livePos} editingLayer={s.editingLayer}
        activeTool={s.activeTool} cropRect={s.cropRect}
        onClick={s.handleCanvasClick}
        onMouseDown={s.handleCropMouseDown}
        onMouseMove={s.handleMouseMove}
        onMouseUp={s.handleMouseUp}
        onLayerMouseDown={s.handleLayerMouseDown}
        onLayerClick={(layer) => layer.layer_type === "text" && s.setEditingLayer(layer)}
        onDeleteFrame={() => { const f = s.layers.find(l => l.layer_type === "frame"); if (f) s.deleteLayer(f.id); }}
        canvasWrapRef={s.canvasWrapRef} containerRef={s.containerRef} imgRef={s.imgRef}
      />

      {s.showFramePicker && (
        <div style={{ position: "fixed", bottom: 0, left: 220, right: 0, zIndex: 100 }}>
          <FramePicker onAdd={s.handleAddFrame} />
        </div>
      )}

      {s.editingLayer && (
        <LayerEditModal layer={s.editingLayer} onSave={s.handleSaveLayerEdit}
          onDelete={s.deleteLayer} onClose={() => s.setEditingLayer(null)} />
      )}

      {s.showVideoCrop && (
        <VideoCropSelector src={mediaFile?.url}
          onCropConfirm={s.handleVideoCropConfirm}
          onCancel={() => s.setShowVideoCrop(false)} />
      )}

      {s.toast && <Toast msg={s.toast} onClose={() => s.setToast(null)} />}
    </div>
  );
}