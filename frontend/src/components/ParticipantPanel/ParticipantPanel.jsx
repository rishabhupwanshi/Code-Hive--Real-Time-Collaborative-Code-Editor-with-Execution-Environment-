// FEATURE 2 — Participant Panel.
//
// Replaces the plain online-users list. Pure presentation; all
// live-collab data (onlineParticipants, participantRoles, typingUsers,
// remoteCursors) is already tracked in Editor.jsx — this component just
// renders it richly and exposes host actions via callbacks.
import React, { useState } from "react";

const STATUS_COLOR = { online: "#22c55e", idle: "#eab308", offline: "#ef4444" };
const STATUS_LABEL = { online: "Online", idle: "Idle", offline: "Disconnected" };

export default function ParticipantPanel({
  t,
  participants, // array of userName strings, from onlineParticipants
  participantRoles, // [{ userName, socketId, role }]
  sessionHostName,
  userName,
  isHost,
  statusFor, // (userName) => "online" | "idle"
  isMuted, // (socketId) => bool
  typingUsers, // array of userName strings
  cursorColorFor, // (userName) => hex color | null
  onSetRole, // (socketId, role) => void — preserves existing COLLABORATOR/OBSERVER assignment
  onViewProfile,
  onKick,
  onTransferHost,
  onMuteUser,
  onUnmuteUser,
}) {
  const [openMenuFor, setOpenMenuFor] = useState(null); // socketId of open dropdown

  return (
    <div
      style={{
        padding: "10px 12px",
        borderBottom: `1px solid ${t.border}`,
        fontSize: 11,
        color: t.textDim,
      }}
    >
      <div style={{ marginBottom: 8, color: t.muted, fontSize: 10, letterSpacing: "0.08em", fontWeight: 600 }}>
        ● ONLINE — {participants.length || 1}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {participants.length === 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: t.muted, padding: "6px 0" }}>
            Connecting…
          </div>
        )}

        {participants.map((name, i) => {
          const info = participantRoles.find((r) => r.userName === name);
          const role = info?.role || (name === sessionHostName ? "HOST" : "COLLABORATOR");
          const isMe = name === userName;
          const status = isMe ? "online" : statusFor(name);
          const typing = typingUsers.includes(name);
          const cursorColor = cursorColorFor?.(name);
          const muted = info?.socketId ? isMuted(info.socketId) : false;
          const menuOpen = openMenuFor === (info?.socketId || name);

          return (
            <div key={i} style={{ position: "relative" }}>
              <div
                onClick={() => isHost && !isMe && info?.socketId && setOpenMenuFor(menuOpen ? null : info.socketId)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 6px",
                  borderRadius: 6,
                  cursor: isHost && !isMe ? "pointer" : "default",
                }}
                onMouseEnter={(e) => isHost && !isMe && (e.currentTarget.style.background = t.border2)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {/* Avatar with status dot */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <span
                    style={{
                      width: 24, height: 24, borderRadius: "50%", display: "flex",
                      alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700,
                      color: isMe ? t.bg : t.textNormal,
                      background: isMe ? t.avatarGradient : t.border2,
                      border: cursorColor ? `2px solid ${cursorColor}` : `1px solid ${t.border}`,
                    }}
                    title={cursorColor ? "Cursor color" : undefined}
                  >
                    {name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                  </span>
                  <span
                    title={STATUS_LABEL[status]}
                    style={{
                      position: "absolute", bottom: -1, right: -1, width: 8, height: 8, borderRadius: "50%",
                      background: STATUS_COLOR[status], border: `1.5px solid ${t.bg2 || t.bg}`,
                    }}
                  />
                </div>

                {/* Name + role + status text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, color: t.textNormal, fontSize: 12 }}>
                    {role === "HOST" && "👑"}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {name}{isMe ? " (you)" : ""}
                    </span>
                    {muted && <span title="Muted by host" style={{ fontSize: 10 }}>🔇</span>}
                  </div>
                  <div style={{ fontSize: 10, color: t.muted }}>
                    {typing ? (
                      <span style={{ color: t.accent || "#60a5fa" }}>✍ typing…</span>
                    ) : (
                      <>
                        {STATUS_LABEL[status]}
                        {role !== "HOST" && ` · ${role.charAt(0) + role.slice(1).toLowerCase()}`}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {isHost && !isMe && role !== "HOST" && info?.socketId && (
                <select
                  value={role}
                  onChange={(e) => onSetRole(info.socketId, e.target.value)}
                  style={{
                    marginLeft: 32, marginTop: -2, marginBottom: 4, fontSize: 10,
                    background: "transparent", color: t.muted, border: `1px solid ${t.border}`,
                    borderRadius: 4, padding: "1px 4px",
                  }}
                >
                  <option value="COLLABORATOR">Collaborator</option>
                  <option value="OBSERVER">Observer</option>
                </select>
              )}

              {menuOpen && (
                <div
                  style={{
                    position: "absolute", right: 4, top: "100%", zIndex: 20,
                    background: t.bg2 || t.bg, border: `1px solid ${t.border}`, borderRadius: 8,
                    boxShadow: "0 8px 20px rgba(0,0,0,0.35)", minWidth: 160, padding: 4,
                  }}
                  onMouseLeave={() => setOpenMenuFor(null)}
                >
                  <MenuItem t={t} label="View Profile" onClick={() => { onViewProfile?.(name); setOpenMenuFor(null); }} />
                  {muted ? (
                    <MenuItem t={t} label="Unmute User" onClick={() => { onUnmuteUser(info.socketId); setOpenMenuFor(null); }} />
                  ) : (
                    <MenuItem t={t} label="Mute User" onClick={() => { onMuteUser(info.socketId); setOpenMenuFor(null); }} />
                  )}
                  <MenuItem t={t} label="Transfer Host" onClick={() => { onTransferHost(info.socketId); setOpenMenuFor(null); }} />
                  <MenuItem t={t} label="Kick User" danger onClick={() => { onKick(info.socketId); setOpenMenuFor(null); }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MenuItem({ t, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block", width: "100%", textAlign: "left", padding: "7px 10px",
        background: "transparent", border: "none", borderRadius: 5, fontSize: 12,
        color: danger ? "#f87171" : t.textNormal, cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = t.border2)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {label}
    </button>
  );
}
