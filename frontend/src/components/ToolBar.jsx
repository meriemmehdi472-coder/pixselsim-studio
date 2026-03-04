import { COLORS, FONT, EMOJIS } from "../styles";
import { IconCrop, IconText, IconEmoji, IconFrame } from "./Icons";

const tools = [
  { id: "crop",  label: "Recadrage", icon: <IconCrop /> },
  { id: "text",  label: "Texte",     icon: <IconText /> },
  { id: "emoji", label: "Emoji",     icon: <IconEmoji /> },
  { id: "frame", label: "Cadre",     icon: <IconFrame /> },
];

export default function ToolBar({ activeTool, onSelectTool, textInput, onTextChange, selectedEmoji, onEmojiChange, onInsertText, onInsertEmoji }) {
  return (
    <div style={{ padding: "0 4px" }}>
      {tools.map(t => (
        <button key={t.id}
          onClick={() => onSelectTool(t.id)}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 500, marginBottom: 4, fontFamily: FONT,
            background: activeTool === t.id ? "rgba(99,102,241,.2)" : "transparent",
            color: activeTool === t.id ? "#818cf8" : COLORS.muted,
            transition: "all .15s"
          }}>
          {t.icon} {t.label}
        </button>
      ))}

      {/* Panel texte */}
      {activeTool === "text" && (
        <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 14, marginTop: 6 }}>
          <textarea
            value={textInput}
            onChange={e => onTextChange(e.target.value)}
            placeholder="Votre texte..."
            style={{
              width: "100%", background: "#0a0a14", border: `1px solid #2a2a3e`,
              borderRadius: 8, color: COLORS.text, padding: "8px 10px", fontSize: 13,
              resize: "vertical", minHeight: 72, boxSizing: "border-box", fontFamily: FONT,
              outline: "none",
            }}
          />
          {/* Bouton Insérer au centre */}
          <button
            onClick={onInsertText}
            disabled={!textInput.trim()}
            style={{
              width: "100%", marginTop: 8, padding: "9px 0", borderRadius: 7, border: "none",
              background: textInput.trim() ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#1a1a2e",
              color: textInput.trim() ? "#fff" : "#334155",
              cursor: textInput.trim() ? "pointer" : "not-allowed",
              fontSize: 12, fontWeight: 800, fontFamily: FONT, letterSpacing: 0.5,
            }}>
            ↳ Insérer au centre
          </button>
          <p style={{ fontSize: 10, color: COLORS.faint, marginTop: 6, lineHeight: 1.4 }}>
            ou clique sur le canvas pour placer précisément
          </p>
        </div>
      )}

      {/* Panel emoji */}
      {activeTool === "emoji" && (
        <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 14, marginTop: 6 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => onEmojiChange(e)}
                style={{
                  fontSize: 20, background: selectedEmoji === e ? "rgba(99,102,241,.3)" : "#0a0a14",
                  border: `2px solid ${selectedEmoji === e ? COLORS.accent : "transparent"}`,
                  borderRadius: 8, cursor: "pointer", padding: 4,
                }}>
                {e}
              </button>
            ))}
          </div>
          {/* Bouton Insérer au centre */}
          <button
            onClick={onInsertEmoji}
            style={{
              width: "100%", padding: "9px 0", borderRadius: 7, border: "none",
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "#fff", cursor: "pointer",
              fontSize: 12, fontWeight: 800, fontFamily: FONT,
            }}>
            ↳ Insérer au centre
          </button>
          <p style={{ fontSize: 10, color: COLORS.faint, marginTop: 6, lineHeight: 1.4 }}>
            ou clique sur le canvas pour placer précisément
          </p>
        </div>
      )}
    </div>
  );
}