import { COLORS, FONT } from "../styles";

export default function Toast({ msg, onClose }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: COLORS.surface, color: COLORS.text,
      padding: "12px 20px", borderRadius: 10, fontSize: 14,
      fontFamily: FONT, boxShadow: "0 8px 32px rgba(0,0,0,.5)",
      border: `1px solid ${COLORS.border}`,
      display: "flex", gap: 12, alignItems: "center",
      animation: "fadeIn .2s ease"
    }}>
      <span>{msg}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 16 }}>✕</button>
    </div>
  );
}