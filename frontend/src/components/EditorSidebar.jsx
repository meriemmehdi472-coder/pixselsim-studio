// components/EditorSidebar.jsx
// Toute la sidebar gauche de l'éditeur : navigation, outils, calques, export.

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
  // undo/redo
  undo, redo, canUndo, canRedo,
  // outils
  activeTool, onToolSelect,
  textInput, onTextChange,
  selectedEmoji, onEmojiChange,
  onInsertText, onInsertEmoji,
  // calques
  layers, onDeleteLayer, onEditLayer,
  // crop photo
  cropHistory, onUndoPhotoCrop,
  // crop vidéo
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

      {/* ── Undo / Redo ── */}
      <div style={{ display: "flex", gap: 6, padding: "10px 16px", borderBottom: "1px solid #1a1a2e" }}>
        {[{ label: "↩", title: "Ctrl+Z", fn: undo, can: canUndo }, { label: "↪", title: "Ctrl+Y", fn: redo, can: canRedo }].map(b => (
          <button key={b.label} onClick={b.fn} disabled={!b.can} title={b.title}
            style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: `1px solid ${b.can ? "#2a2a3e" : "#161622"}`, background: b.can ? "#131320" : "transparent", color: b.can ? "#94a3b8" : "#1e1e2e", cursor: b.can ? "pointer" : "not-allowed", fontSize: 16 }}>
            {b.label}
          </button>
        ))}
      </div>

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

      {/* ── Zone vidéo sélectionnée ── */}
      {isVideo && pendingCrop && (
        <div style={{ margin: "8px 16px", padding: "10px 12px", background: "#22c55e11", border: "1px solid #22c55e33", borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>✓ Zone sélectionnée</div>
          <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{pendingCrop.w} × {pendingCrop.h} px</div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button onClick={onModifyVideoCrop} style={{ background: "none", border: "none", color: "#f59e0b", cursor: "pointer", fontSize: 10, padding: 0, fontFamily: FONT }}>✏️ Modifier</button>
            <span style={{ color: "#1e1e2e" }}>·</span>
            <button onClick={onCancelVideoCrop} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 10, padding: 0, fontFamily: FONT }}>✕ Annuler</button>
          </div>
        </div>
      )}

      {/* ── Spacer ── */}
      <div style={{ flex: 1 }} />

      {/* ── Export ── */}
      <div style={{ borderTop: "1px solid #1a1a2e", padding: "12px 16px 16px" }}>
        <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: "#334155", marginBottom: 10 }}>Exporter</div>

        {!isVideo ? (
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
              {exporting ? "⏳ Export..." : "⬇ Télécharger"}
            </button>
          </>
        ) : (
          <>
            {!pendingCrop && (
              <button onClick={onSelectZone}
                style={{ width: "100%", padding: "9px 0", borderRadius: 7, border: "1px solid #f59e0b44", background: "#f59e0b11", color: "#f59e0b", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: FONT, marginBottom: 8 }}>
                ✂️ Sélectionner zone
              </button>
            )}
            <button onClick={onExportVideo} disabled={busy}
              style={{ width: "100%", padding: "11px 0", borderRadius: 8, border: "none", background: busy ? "#1e1e2e" : "linear-gradient(135deg,#7c3aed,#6366f1)", color: busy ? "#475569" : "#fff", cursor: busy ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 800, fontFamily: FONT, marginBottom: 8 }}>
              {busy ? "⏳ Traitement ffmpeg..." : pendingCrop ? "🎬 Exporter zone MP4" : "🎬 Exporter MP4 final"}
            </button>

            {videoExportStatus && videoExportStatus !== "done" && (
              <div style={{ fontSize: 11, color: statusColor, textAlign: "center", padding: "4px 0", marginBottom: 6 }}>
                {videoExportStatus === "pending"    && "• En file d'attente..."}
                {videoExportStatus === "processing" && "• ffmpeg en cours..."}
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