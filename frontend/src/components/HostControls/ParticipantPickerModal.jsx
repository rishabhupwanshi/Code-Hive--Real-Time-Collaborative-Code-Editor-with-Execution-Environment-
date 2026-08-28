// Small reusable modal: "pick a participant" — used by both Kick User
// and Transfer Host, since they're the same interaction (host picks
// someone from the current room) with a different resulting action.
import React from "react";

export default function ParticipantPickerModal({
  t,
  open,
  title,
  actionLabel,
  danger,
  participants, // [{ userName, socketId, role }]
  myUserName,
  onPick,
  onClose,
}) {
  if (!open) return null;

  const pickable = participants.filter((p) => p.userName !== myUserName);

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
          width: 320, maxHeight: "70vh", overflowY: "auto",
          background: t.bg2 || t.bg, border: `1px solid ${t.border}`,
          borderRadius: 10, padding: 14, boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: t.textNormal, marginBottom: 10 }}>{title}</div>

        {pickable.length === 0 && (
          <div style={{ fontSize: 12, color: t.muted, padding: "10px 0" }}>
            No other participants in this session yet.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {pickable.map((p) => (
            <button
              key={p.socketId}
              onClick={() => {
                onPick(p.socketId);
                onClose();
              }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 10px", borderRadius: 6, border: `1px solid ${t.border}`,
                background: "transparent", color: t.textNormal, fontSize: 12.5, cursor: "pointer",
              }}
            >
              <span>{p.userName}{p.role === "HOST" ? " 👑" : ""}</span>
              <span style={{ fontSize: 11, color: danger ? "#f87171" : t.accent || t.textDim, fontWeight: 600 }}>
                {actionLabel}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 12, width: "100%", padding: "7px 0", borderRadius: 6,
            border: `1px solid ${t.border}`, background: "transparent", color: t.muted,
            fontSize: 12, cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
