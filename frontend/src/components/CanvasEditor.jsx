// components/CanvasEditor.jsx
import { useEditorState }  from "../hooks/useEditorState";
import EditorSidebar       from "./EditorSidebar";
import EditorCanvas        from "./EditorCanvas";
import FramePicker         from "./Framepicker";
import LayerEditModal      from "./LayerEditModal";
import VideoCropSelector   from "./Videocropselector";
import Toast               from "./Toast";
import { FONT }            from "../styles";

export default function CanvasEditor({ mediaFile: initialMediaFile }) {
  const s = useEditorState(initialMediaFile);

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", background: "#08080f", fontFamily: FONT, overflow: "hidden" }}>

      <EditorSidebar
        isVideo={s.isVideo}
        onBack={() => s.navigate(`/projects/${s.projectId}`)}
        undo={s.undo} redo={s.redo} canUndo={s.canUndo} canRedo={s.canRedo}
        // Historique versions média (undo/redo du crop vidéo)
        canUndoMedia={s.canUndoMedia} canRedoMedia={s.canRedoMedia}
        onUndoMedia={s.undoMediaVersion} onRedoMedia={s.redoMediaVersion}
        mediaVersionIdx={s.mediaVersionIdx} mediaVersionsCount={s.mediaVersionsCount}
        videoCropLoading={s.videoCropLoading}
        activeTool={s.activeTool} onToolSelect={s.handleToolSelect}
        textInput={s.textInput} onTextChange={s.setTextInput}
        selectedEmoji={s.selectedEmoji} onEmojiChange={s.setSelectedEmoji}
        onInsertText={s.handleInsertText} onInsertEmoji={s.handleInsertEmoji}
        layers={s.layers} onDeleteLayer={s.deleteLayer}
        onEditLayer={(l) => l.layer_type === "text" && s.setEditingLayer(l)}
        cropHistory={s.cropHistory} onUndoPhotoCrop={s.undoPhotoCrop}
        pendingCrop={s.pendingCrop}
        onModifyVideoCrop={() => { setPendingCrop(null); setPendingCropPreviewUrl(null); s.setShowVideoCrop(true); }}
        onCancelVideoCrop={s.cancelVideoCrop}
        exportFmt={s.exportFmt} onExportFmtChange={s.setExportFmt}
        onExportImage={s.handleExportImage} exporting={s.exporting}
        onSelectZone={() => s.setShowVideoCrop(true)}
        videoExportStatus={s.videoExportStatus}
        videoDownloadUrl={s.videoDownloadUrl}
        onExportVideo={s.handleExportVideo}
      />

      <EditorCanvas
        isVideo={s.isVideo}
        mediaFile={s.currentMediaFile}
        imgSrc={s.imgSrc}
        pendingCrop={s.pendingCrop}
        pendingCropPreviewUrl={s.pendingCropPreviewUrl}
        videoCropLoading={s.videoCropLoading}
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
        <VideoCropSelector
          src={s.currentMediaFile?.url}
          onCropConfirm={s.handleVideoCropConfirm}
          onCancel={() => s.setShowVideoCrop(false)}
          loading={s.videoCropLoading}
        />
      )}

      {s.toast && <Toast msg={s.toast} onClose={() => s.setToast(null)} />}
    </div>
  );
}