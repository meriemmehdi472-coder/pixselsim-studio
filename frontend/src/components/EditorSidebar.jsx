// components/EditorSidebar.jsx
import { useState } from "react";
import { COLORS, FONT } from "../styles";
import ToolBar from "./ToolBar";
import LayerPanel from "./LayerPanel";
import FrameEditPanel from "./Frameeditpanel";
import { IconArrowL } from "./Icons";

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid #1a1a2e" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", color: "#475569", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, fontFamily: FONT }}>
        {title}<span style={{ fontSize: 10, opacity: 0.5 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && <div style={{ padding: "0 16px 12px" }}>{children}</div>}
    </div>
  );
}

export default function EditorSidebar({
  isVideo, onBack, isMobile,
  undo, redo, canUndo, canRedo,
  canUndoMedia, canRedoMedia, onUndoMedia, onRedoMedia,
  mediaVersionIdx, mediaVersionsCount, videoCropLoading,
  activeTool, onToolSelect,
  textInput, onTextChange, selectedEmoji, onEmojiChange,
  onInsertText, onInsertEmoji,
  layers, onDeleteLayer, onEditLayer,
  cropHistory, onUndoPhotoCrop,
  pendingCrop, onModifyVideoCrop, onCancelVideoCrop,
  exportFmt, onExportFmtChange, onExportImage, exporting,
  onSelectZone, videoExportStatus, videoDownloadUrl, onExportVideo, onDownloadVideo,
  selectedFrame, onUpdateFrame,
}) {
  const [mobileTab, setMobileTab] = useState("tools");
  const busy = exporting || videoExportStatus === "pending" || videoExportStatus === "processing";
  const statusColor = videoExportStatus === "failed" ? "#ef4444" : "#f59e0b";

  // ── MOBILE ───────────────────────────────────────────────────────────────
  if (isMobile) {
    const tabs = [
      { id: "tools",  label: "Outils" },
      { id: "layers", label: `Calques (${layers.length})` },
      { id: "export", label: "Export" },
    ];
    if (selectedFrame) tabs.splice(1, 0, { id: "frame", label: "✏️ Cadre" });

    return (
      <div style={{ flexShrink: 0, background: "#0c0c16", borderTop: "1px solid #1a1a2e", display: "flex", flexDirection: "column", height: "auto", maxHeight: "45vh", zIndex: 10 }}>
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #1a1a2e", flexShrink: 0 }}>
          <button onClick={onBack} style={{ padding: "10px 12px", background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18, borderRight: "1px solid #1a1a2e" }}>←</button>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setMobileTab(t.id)}
              style={{ flex: 1, padding: "10px 4px", background: mobileTab === t.id ? "#6366f122" : "none", border: "none", borderBottom: mobileTab === t.id ? "2px solid #6366f1" : "2px solid transparent", color: mobileTab === t.id ? "#818cf8" : "#475569", cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: FONT }}>
              {t.label}
            </button>
          ))}
          <div style={{ padding: "10px 8px", fontSize: 10, color: "#334155", display: "flex", alignItems: "center" }}>{isVideo ? "VID" : "IMG"}</div>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "8px 12px" }}>
          {/* Undo rapides */}
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <button onClick={undo}  disabled={!canUndo}  style={mBtn(canUndo)}>↩</button>
            <button onClick={redo}  disabled={!canRedo}  style={mBtn(canRedo)}>↪</button>
            {isVideo && mediaVersionsCount > 1 && <>
              <button onClick={onUndoMedia} disabled={!canUndoMedia || videoCropLoading} style={mBtn(canUndoMedia && !videoCropLoading)} title="Version précédente">⏮</button>
              <button onClick={onRedoMedia} disabled={!canRedoMedia || videoCropLoading} style={mBtn(canRedoMedia && !videoCropLoading)} title="Version suivante">⏭</button>
              <span style={{ fontSize: 10, color: "#f59e0b", display: "flex", alignItems: "center", marginLeft: 4 }}>v{mediaVersionIdx + 1}/{mediaVersionsCount}</span>
            </>}
          </div>

          {mobileTab === "tools"  && <ToolBar activeTool={activeTool} onSelectTool={onToolSelect} textInput={textInput} onTextChange={onTextChange} selectedEmoji={selectedEmoji} onEmojiChange={onEmojiChange} onInsertText={onInsertText} onInsertEmoji={onInsertEmoji} />}
          {mobileTab === "frame"  && selectedFrame && <FrameEditPanel frame={selectedFrame} onUpdate={(p) => onUpdateFrame(selectedFrame.id, p)} onDelete={() => onDeleteLayer(selectedFrame.id)} />}
          {mobileTab === "layers" && <>
            <LayerPanel layers={layers} onDelete={onDeleteLayer} onEditLayer={onEditLayer} />
            {!isVideo && cropHistory.length > 0 && (
              <button onClick={onUndoPhotoCrop} style={{ width: "100%", marginTop: 8, padding: "8px 0", borderRadius: 6, border: "1px solid #f59e0b33", background: "#f59e0b11", color: "#f59e0b", cursor: "pointer", fontSize: 11, fontFamily: FONT }}>
                ↩ Annuler recadrage ({cropHistory.length})
              </button>
            )}
          </>}
          {mobileTab === "export" && (
            <ExportPanel isVideo={isVideo} exportFmt={exportFmt} onExportFmtChange={onExportFmtChange}
              onExportImage={onExportImage} exporting={exporting} onSelectZone={onSelectZone}
              videoExportStatus={videoExportStatus} videoDownloadUrl={videoDownloadUrl}
              onExportVideo={onExportVideo} onDownloadVideo={onDownloadVideo}
              busy={busy} statusColor={statusColor} videoCropLoading={videoCropLoading} />
          )}
        </div>
      </div>
    );
  }

  // ── DESKTOP ──────────────────────────────────────────────────────────────
  return (
    <div style={{ width: 220, flexShrink: 0, background: "#0c0c16", borderRight: "1px solid #1a1a2e", display: "flex", flexDirection: "column", overflowY: "auto", height: "100vh" }}>

      <div style={{ padding: "14px 16px", borderBottom: "1px solid #1a1a2e", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontFamily: FONT, padding: 0 }}>
          <IconArrowL /> Retour
        </button>
        <div style={{ marginLeft: "auto", fontSize: 10, color: "#334155", background: "#131320", padding: "3px 8px", borderRadius: 4 }}>{isVideo ? "VIDÉO" : "PHOTO"}</div>
      </div>

      {/* Undo/Redo */}
      <div style={{ display: "flex", gap: 6, padding: "10px 16px", borderBottom: "1px solid #1a1a2e" }}>
        {[{ label: "↩", fn: undo, can: canUndo }, { label: "↪", fn: redo, can: canRedo }].map(b => (
          <button key={b.label} onClick={b.fn} disabled={!b.can}
            style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: `1px solid ${b.can ? "#2a2a3e" : "#161622"}`, background: b.can ? "#131320" : "transparent", color: b.can ? "#94a3b8" : "#1e1e2e", cursor: b.can ? "pointer" : "not-allowed", fontSize: 16 }}>
            {b.label}
          </button>
        ))}
      </div>

      {/* Versions vidéo */}
      {isVideo && mediaVersionsCount > 1 && (
        <div style={{ padding: "8px 16px", borderBottom: "1px solid #1a1a2e" }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: "#334155", marginBottom: 6 }}>Versions vidéo</div>
          <div style={{ fontSize: 11, color: "#475569", marginBottom: 6, textAlign: "center" }}>v{mediaVersionIdx + 1} / {mediaVersionsCount}</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onUndoMedia} disabled={!canUndoMedia || videoCropLoading}
              style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: `1px solid ${canUndoMedia ? "#f59e0b44" : "#161622"}`, background: canUndoMedia ? "#f59e0b11" : "transparent", color: canUndoMedia ? "#f59e0b" : "#1e1e2e", cursor: canUndoMedia ? "pointer" : "not-allowed", fontSize: 13 }}>↩</button>
            <button onClick={onRedoMedia} disabled={!canRedoMedia || videoCropLoading}
              style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: `1px solid ${canRedoMedia ? "#f59e0b44" : "#161622"}`, background: canRedoMedia ? "#f59e0b11" : "transparent", color: canRedoMedia ? "#f59e0b" : "#1e1e2e", cursor: canRedoMedia ? "pointer" : "not-allowed", fontSize: 13 }}>↪</button>
          </div>
        </div>
      )}

      {videoCropLoading && (
        <div style={{ margin: "8px 16px", padding: "10px 12px", background: "#f59e0b11", border: "1px solid #f59e0b33", borderRadius: 8, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>⏳ Recadrage ffmpeg…</div>
        </div>
      )}

      {/* Panneau modification cadre (si sélectionné) */}
      {selectedFrame && (
        <FrameEditPanel
          frame={selectedFrame}
          onUpdate={(p) => onUpdateFrame(selectedFrame.id, p)}
          onDelete={() => onDeleteLayer(selectedFrame.id)}
        />
      )}

      <Section title="Outils">
        <ToolBar activeTool={activeTool} onSelectTool={onToolSelect} textInput={textInput} onTextChange={onTextChange} selectedEmoji={selectedEmoji} onEmojiChange={onEmojiChange} onInsertText={onInsertText} onInsertEmoji={onInsertEmoji} />
      </Section>

      <Section title={`Calques (${layers.length})`}>
        <LayerPanel layers={layers} onDelete={onDeleteLayer} onEditLayer={onEditLayer} />
      </Section>

      {!isVideo && cropHistory.length > 0 && (
        <div style={{ padding: "8px 16px", borderBottom: "1px solid #1a1a2e" }}>
          <button onClick={onUndoPhotoCrop} style={{ width: "100%", padding: "8px 0", borderRadius: 6, border: "1px solid #f59e0b33", background: "#f59e0b11", color: "#f59e0b", cursor: "pointer", fontSize: 11, fontFamily: FONT }}>
            ↩ Annuler recadrage ({cropHistory.length})
          </button>
        </div>
      )}

      <div style={{ flex: 1 }} />

      <div style={{ borderTop: "1px solid #1a1a2e", padding: "12px 16px 16px" }}>
        <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: "#334155", marginBottom: 10 }}>Exporter</div>
        <ExportPanel isVideo={isVideo} exportFmt={exportFmt} onExportFmtChange={onExportFmtChange}
          onExportImage={onExportImage} exporting={exporting} onSelectZone={onSelectZone}
          videoExportStatus={videoExportStatus} videoDownloadUrl={videoDownloadUrl}
          onExportVideo={onExportVideo} onDownloadVideo={onDownloadVideo}
          busy={busy} statusColor={statusColor} videoCropLoading={videoCropLoading} />
      </div>
    </div>
  );
}

// ── Panneau export commun ─────────────────────────────────────────────────
function ExportPanel({ isVideo, exportFmt, onExportFmtChange, onExportImage, exporting,
  onSelectZone, videoExportStatus, videoDownloadUrl, onExportVideo, onDownloadVideo,
  busy, statusColor, videoCropLoading }) {

  if (!isVideo) {
    return (
      <>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {["png", "jpeg"].map(f => (
            <button key={f} onClick={() => onExportFmtChange(f)}
              style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: `1px solid ${exportFmt === f ? "#6366f1" : "#1e1e2e"}`, background: exportFmt === f ? "#6366f122" : "transparent", color: exportFmt === f ? "#818cf8" : "#475569", cursor: "pointer", fontSize: 11, fontFamily: FONT, textTransform: "uppercase", fontWeight: exportFmt === f ? 700 : 400 }}>{f}</button>
          ))}
        </div>
        <button onClick={onExportImage} disabled={exporting}
          style={{ width: "100%", padding: "11px 0", borderRadius: 8, border: "none", background: exporting ? "#1e1e2e" : "linear-gradient(135deg,#6366f1,#8b5cf6)", color: exporting ? "#475569" : "#fff", cursor: exporting ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 800, fontFamily: FONT }}>
          {exporting ? "⏳ Export…" : "⬇ Télécharger / Partager"}
        </button>
      </>
    );
  }

  return (
    <>
      <button onClick={onSelectZone} disabled={videoCropLoading}
        style={{ width: "100%", padding: "9px 0", borderRadius: 7, border: "1px solid #f59e0b44", background: "#f59e0b11", color: "#f59e0b", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: FONT, marginBottom: 8 }}>
        ✂️ Recadrer la vidéo
      </button>

      {/* ── Un seul bouton : lance l'export ET télécharge automatiquement ── */}
      {/* Bouton principal : export ou re-export */}
      <button onClick={onExportVideo} disabled={busy || videoCropLoading}
        style={{ width: "100%", padding: "13px 0", borderRadius: 8, border: "none",
          background: busy ? "#1e1e2e" : "linear-gradient(135deg,#16a34a,#22c55e)",
          color: busy ? "#475569" : "#fff",
          cursor: busy ? "not-allowed" : "pointer",
          fontSize: 13, fontWeight: 800, fontFamily: FONT, marginBottom: 8,
          boxShadow: busy ? "none" : "0 4px 20px rgba(34,197,94,.25)" }}>
        {busy ? "⏳ Export en cours…" : videoExportStatus === "done" ? "↺ Re-exporter la vidéo" : "⬇ Télécharger la vidéo"}
      </button>

      {/* Bouton téléchargement manuel si export déjà fait */}
      {videoExportStatus === "done" && videoDownloadUrl && (
        <button onClick={onDownloadVideo}
          style={{ width: "100%", padding: "9px 0", borderRadius: 7, border: "1px solid #16a34a44",
            background: "#16a34a11", color: "#22c55e", cursor: "pointer",
            fontSize: 12, fontWeight: 700, fontFamily: FONT, marginBottom: 8 }}>
          ⬇ Retélécharger
        </button>
      )}

      {/* Statut */}
      {videoExportStatus && videoExportStatus !== "done" && (
        <div style={{ fontSize: 11, color: statusColor, textAlign: "center", padding: "4px 0", marginBottom: 6 }}>
          {videoExportStatus === "pending"    && "• En file d'attente…"}
          {videoExportStatus === "processing" && "• ffmpeg en cours…"}
          {videoExportStatus === "failed"     && "✗ Échec — réessaie"}
        </div>
      )}
      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:.8} }`}</style>
    </>
  );
}

const mBtn = (active) => ({
  padding: "6px 12px", borderRadius: 6,
  border: `1px solid ${active ? "#2a2a3e" : "#161622"}`,
  background: active ? "#131320" : "transparent",
  color: active ? "#94a3b8" : "#1e1e2e",
  cursor: active ? "pointer" : "not-allowed", fontSize: 15,
});