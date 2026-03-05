// components/EditorSidebar.jsx
import { useState } from "react";
import { COLORS, FONT } from "../styles";
import ToolBar from "./ToolBar";
import LayerPanel from "./LayerPanel";
import { IconArrowL } from "./Icons";

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid #1a1a2e" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", color: "#475569", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, fontFamily: FONT }}>
        {title}
        <span style={{ fontSize: 10, opacity: 0.5 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && <div style={{ padding: "0 16px 12px" }}>{children}</div>}
    </div>
  );
}

export default function EditorSidebar({
  // navigation
  isVideo, onBack,
  // undo/redo calques
  undo, redo, canUndo, canRedo,
  // historique versions média (crop vidéo)
  canUndoMedia, canRedoMedia, onUndoMedia, onRedoMedia,
  mediaVersionIdx, mediaVersionsCount, videoCropLoading,
  // outils
  activeTool, onToolSelect,
  textInput, onTextChange,
  selectedEmoji, onEmojiChange,
  onInsertText, onInsertEmoji,
  // calques
  layers, onDeleteLayer, onEditLayer,
  // crop photo
  cropHistory, onUndoPhotoCrop,
  // crop vidéo (preview CSS — plus utilisé pour l'export)
  pendingCrop, onModifyVideoCrop, onCancelVideoCrop,
  // export photo
  exportFmt, onExportFmtChange, onExportImage, exporting,
  // export vidéo
  onSelectZone, videoExportStatus, videoDownloadUrl, onExportVideo,
}) {
  const busy = exporting || videoExportStatus === "pending" || videoExportStatus === "processing";
  const statusColor = videoExportStatus === "failed" ? "#ef4444" : "#f59e0b";

  return (
    <div style={{ width: 220, flexShrink: 0, background: "#0c0c16", borderRight: "1px solid #1a1a2e", display: "flex", flexDirection: "column", overflowY: "auto", height: "100vh" }}>

      {/* ── Header ── */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #1a1a2e", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onBack}
          style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontFamily: FONT, padding: 0 }}>
          <IconArrowL /> Retour
        </button>
        <div style={{ marginLeft: "auto", fontSize: 10, color: "#334155", background: "#131320", padding: "3px 8px", borderRadius: 4 }}>
          {isVideo ? "VIDÉO" : "PHOTO"}
        </div>
      </div>

      {/* ── Undo / Redo calques ── */}
      <div style={{ display: "flex", gap: 6, padding: "10px 16px", borderBottom: "1px solid #1a1a2e" }}>
        {[{ label: "↩", title: "Ctrl+Z", fn: undo, can: canUndo }, { label: "↪", title: "Ctrl+Y", fn: redo, can: canRedo }].map(b => (
          <button key={b.label} onClick={b.fn} disabled={!b.can} title={b.title}
            style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: `1px solid ${b.can ? "#2a2a3e" : "#161622"}`, background: b.can ? "#131320" : "transparent", color: b.can ? "#94a3b8" : "#1e1e2e", cursor: b.can ? "pointer" : "not-allowed", fontSize: 16 }}>
            {b.label}
          </button>
        ))}
      </div>

      {/* ── Historique versions vidéo (crop) ── */}
      {isVideo && mediaVersionsCount > 1 && (
        <div style={{ padding: "8px 16px", borderBottom: "1px solid #1a1a2e" }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: "#334155", marginBottom: 6 }}>
            Versions vidéo
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginBottom: 6, textAlign: "center" }}>
            v{mediaVersionIdx + 1} / {mediaVersionsCount}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onUndoMedia} disabled={!canUndoMedia || videoCropLoading}
              title="Version précédente"
              style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: `1px solid ${canUndoMedia ? "#f59e0b44" : "#161622"}`, background: canUndoMedia ? "#f59e0b11" : "transparent", color: canUndoMedia ? "#f59e0b" : "#1e1e2e", cursor: canUndoMedia ? "pointer" : "not-allowed", fontSize: 13 }}>
              ↩
            </button>
            <button onClick={onRedoMedia} disabled={!canRedoMedia || videoCropLoading}
              title="Version suivante"
              style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: `1px solid ${canRedoMedia ? "#f59e0b44" : "#161622"}`, background: canRedoMedia ? "#f59e0b11" : "transparent", color: canRedoMedia ? "#f59e0b" : "#1e1e2e", cursor: canRedoMedia ? "pointer" : "not-allowed", fontSize: 13 }}>
              ↪
            </button>
          </div>
        </div>
      )}

      {/* ── Spinner crop en cours ── */}
      {videoCropLoading && (
        <div style={{ margin: "8px 16px", padding: "10px 12px", background: "#f59e0b11", border: "1px solid #f59e0b33", borderRadius: 8, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>⏳ Recadrage ffmpeg…</div>
          <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>Quelques secondes</div>
        </div>
      )}

      {/* ── Outils ── */}
      <Section title="Outils">
        <ToolBar activeTool={activeTool} onSelectTool={onToolSelect}
          textInput={textInput} onTextChange={onTextChange}
          selectedEmoji={selectedEmoji} onEmojiChange={onEmojiChange}
          onInsertText={onInsertText} onInsertEmoji={onInsertEmoji} />
      </Section>

      {/* ── Calques ── */}
      <Section title={`Calques (${layers.length})`}>
        <LayerPanel layers={layers} onDelete={onDeleteLayer} onEditLayer={onEditLayer} />
      </Section>

      {/* ── Annuler recadrage photo ── */}
      {!isVideo && cropHistory.length > 0 && (
        <div style={{ padding: "8px 16px", borderBottom: "1px solid #1a1a2e" }}>
          <button onClick={onUndoPhotoCrop}
            style={{ width: "100%", padding: "8px 0", borderRadius: 6, border: "1px solid #f59e0b33", background: "#f59e0b11", color: "#f59e0b", cursor: "pointer", fontSize: 11, fontFamily: FONT }}>
            ↩ Annuler recadrage ({cropHistory.length})
          </button>
        </div>
      )}

      {/* ── Spacer ── */}
      <div style={{ flex: 1 }} />

      {/* ── Export ── */}
      <div style={{ borderTop: "1px solid #1a1a2e", padding: "12px 16px 16px" }}>
        <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: "#334155", marginBottom: 10 }}>Exporter</div>

        {!isVideo ? (
          /* ── Photo : ImageMagick back-end ── */
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {["png", "jpeg"].map(f => (
                <button key={f} onClick={() => onExportFmtChange(f)}
                  style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: `1px solid ${exportFmt === f ? "#6366f1" : "#1e1e2e"}`, background: exportFmt === f ? "#6366f122" : "transparent", color: exportFmt === f ? "#818cf8" : "#475569", cursor: "pointer", fontSize: 11, fontFamily: FONT, textTransform: "uppercase", fontWeight: exportFmt === f ? 700 : 400 }}>
                  {f}
                </button>
              ))}
            </div>
            <button onClick={onExportImage} disabled={exporting}
              style={{ width: "100%", padding: "11px 0", borderRadius: 8, border: "none", background: exporting ? "#1e1e2e" : "linear-gradient(135deg,#6366f1,#8b5cf6)", color: exporting ? "#475569" : "#fff", cursor: exporting ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 800, fontFamily: FONT }}>
              {exporting ? "⏳ Export ImageMagick…" : "⬇ Télécharger"}
            </button>
          </>
        ) : (
          /* ── Vidéo : ffmpeg asynchrone ── */
          <>
            <button onClick={onSelectZone}
              style={{ width: "100%", padding: "9px 0", borderRadius: 7, border: "1px solid #f59e0b44", background: "#f59e0b11", color: "#f59e0b", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: FONT, marginBottom: 8 }}>
              ✂️ Recadrer la vidéo
            </button>

            <button onClick={onExportVideo} disabled={busy || videoCropLoading}
              style={{ width: "100%", padding: "11px 0", borderRadius: 8, border: "none", background: busy ? "#1e1e2e" : "linear-gradient(135deg,#7c3aed,#6366f1)", color: busy ? "#475569" : "#fff", cursor: busy ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 800, fontFamily: FONT, marginBottom: 8 }}>
              {busy ? "⏳ Traitement ffmpeg…" : "🎬 Exporter MP4 final"}
            </button>

            {videoExportStatus && videoExportStatus !== "done" && (
              <div style={{ fontSize: 11, color: statusColor, textAlign: "center", padding: "4px 0", marginBottom: 6 }}>
                {videoExportStatus === "pending"    && "• En file d'attente…"}
                {videoExportStatus === "processing" && "• ffmpeg en cours…"}
                {videoExportStatus === "failed"     && "✗ Échec — voir logs Rails"}
              </div>
            )}

            {videoDownloadUrl && (
              <a href={videoDownloadUrl} download="export-final.mp4"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "12px 0", borderRadius: 8, background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 800, boxSizing: "border-box" }}>
                ⬇ Télécharger MP4 final
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}