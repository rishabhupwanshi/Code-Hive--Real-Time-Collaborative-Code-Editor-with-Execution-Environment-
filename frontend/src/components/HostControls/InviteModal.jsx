import React from "react";

export default function InviteModal({ t, open, sessionToken, onCopyLink, onCopyToken, onClose }) {
  if (!open) return null;
  const link = `${window.location.origin}/session/${sessionToken}`;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 380, background: t.bg2 || t.bg, border: `1px solid ${t.border}`,
          borderRadius: 10, padding: 16, boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: t.textNormal, marginBottom: 12 }}>
          📤 Invite Participants
        </div>

        <div style={{ fontSize: 10.5, color: t.muted, marginBottom: 4 }}>SESSION LINK</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <input
            readOnly
            value={link}
            style={{
              flex: 1, fontSize: 11.5, padding: "7px 8px", borderRadius: 6,
              border: `1px solid ${t.border}`, background: t.border2, color: t.textNormal,
            }}
          />
          <button onClick={onCopyLink} style={btnStyle(t)}>Copy</button>
        </div>

        <div style={{ fontSize: 10.5, color: t.muted, marginBottom: 4 }}>SESSION TOKEN</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          <input
            readOnly
            value={sessionToken}
            style={{
              flex: 1, fontSize: 11.5, padding: "7px 8px", borderRadius: 6,
              border: `1px solid ${t.border}`, background: t.border2, color: t.textNormal,
            }}
          />
          <button onClick={onCopyToken} style={btnStyle(t)}>Copy</button>
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "7px 0", borderRadius: 6,
            border: `1px solid ${t.border}`, background: "transparent", color: t.muted,
            fontSize: 12, cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

const btnStyle = (t) => ({
  padding: "7px 12px", borderRadius: 6, border: "none",
  background: t.accent || "#3b82f6", color: "#fff", fontSize: 11.5,
  fontWeight: 600, cursor: "pointer",
});
