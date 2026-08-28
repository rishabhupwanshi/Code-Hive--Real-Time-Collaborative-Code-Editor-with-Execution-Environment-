import React from "react";

export default function ProfileModal({ t, open, participantName, role, onClose }) {
  if (!open) return null;
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
          width: 280, background: t.bg2 || t.bg, border: `1px solid ${t.border}`,
          borderRadius: 10, padding: 18, textAlign: "center", boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            width: 56, height: 56, borderRadius: "50%", margin: "0 auto 10px",
            background: t.avatarGradient, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 700, color: t.bg,
          }}
        >
          {(participantName || "").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.textNormal }}>
          {role === "HOST" && "👑 "}{participantName}
        </div>
        <div style={{ fontSize: 11.5, color: t.muted, marginTop: 2 }}>
          {role === "HOST" ? "Session Host" : role?.charAt(0) + role?.slice(1).toLowerCase()}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 16, width: "100%", padding: "7px 0", borderRadius: 6,
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
