// FEATURE 1 — Host Controls panel.
//
// Renders only for the session host (caller decides that — see
// integration note in Editor.jsx). Every action here is a thin call
// into useHostControls(); this file is pure presentation.
import React, { useState } from "react";

const Row = ({ icon, label, onClick, danger, disabled, t }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      width: "100%",
      padding: "8px 10px",
      background: "transparent",
      border: "none",
      borderRadius: 6,
      color: disabled ? t.muted : danger ? "#f87171" : t.textNormal,
      fontSize: 12.5,
      cursor: disabled ? "not-allowed" : "pointer",
      textAlign: "left",
      transition: "background 120ms ease",
    }}
    onMouseEnter={(e) => !disabled && (e.currentTarget.style.background = t.border2)}
    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
  >
    <span style={{ width: 16, textAlign: "center" }}>{icon}</span>
    {label}
  </button>
);

export default function HostControlPanel({
  t,
  isHost,
  locked,
  chatMuted,
  stats,
  onStart,
  onEnd,
  onLock,
  onUnlock,
  onCopyInviteLink,
  onCopySessionToken,
  onOpenInviteModal,
  onOpenKickModal,
  onOpenTransferModal,
  onMuteChat,
  onUnmuteChat,
  onRefreshStats,
}) {
  const [showStats, setShowStats] = useState(false);

  if (!isHost) return null; // FEATURE 1: normal users never see this panel

  return (
    <div
      style={{
        borderBottom: `1px solid ${t.border}`,
        background: t.bg2 || t.bg,
      }}
    >
      <div
        style={{
          padding: "10px 12px 4px",
          fontSize: 10,
          letterSpacing: "0.08em",
          fontWeight: 700,
          color: t.muted,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        👑 HOST CONTROLS
      </div>

      <div style={{ padding: "2px 6px 8px", display: "flex", flexDirection: "column" }}>
        <Row t={t} icon="▶" label="Start Session" onClick={onStart} />
        <Row t={t} icon="⏹" label="End Session" onClick={onEnd} danger />
        {locked ? (
          <Row t={t} icon="🔓" label="Unlock Session" onClick={onUnlock} />
        ) : (
          <Row t={t} icon="🔒" label="Lock Session" onClick={onLock} />
        )}
        <Row t={t} icon="🔗" label="Copy Invite Link" onClick={onCopyInviteLink} />
        <Row t={t} icon="📋" label="Copy Session Token" onClick={onCopySessionToken} />
        <Row t={t} icon="📤" label="Invite Participants" onClick={onOpenInviteModal} />
        <Row t={t} icon="🚫" label="Kick User" onClick={onOpenKickModal} />
        <Row t={t} icon="🔄" label="Transfer Host" onClick={onOpenTransferModal} />
        {chatMuted ? (
          <Row t={t} icon="🔔" label="Unmute Chat" onClick={onUnmuteChat} />
        ) : (
          <Row t={t} icon="🔕" label="Mute Chat" onClick={onMuteChat} />
        )}
        <Row
          t={t}
          icon="📊"
          label="Session Statistics"
          onClick={() => {
            onRefreshStats();
            setShowStats((s) => !s);
          }}
        />
      </div>

      {showStats && (
        <div
          style={{
            margin: "0 10px 10px",
            padding: 10,
            borderRadius: 8,
            background: t.border2,
            fontSize: 11.5,
            color: t.textNormal,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
          }}
        >
          <div style={{ color: t.muted }}>Participants</div>
          <div>{stats?.participantCount ?? "—"}</div>
          <div style={{ color: t.muted }}>Chat messages</div>
          <div>{stats?.chatMessageCount ?? "—"}</div>
          <div style={{ color: t.muted }}>Duration</div>
          <div>{stats ? formatDuration(stats.durationSeconds) : "—"}</div>
          <div style={{ color: t.muted }}>Locked</div>
          <div>{stats?.locked ? "Yes" : "No"}</div>
        </div>
      )}

      {(locked || chatMuted) && (
        <div style={{ padding: "0 12px 10px", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {locked && <Badge t={t} label="🔒 Locked" />}
          {chatMuted && <Badge t={t} label="🔕 Chat muted" />}
        </div>
      )}
    </div>
  );
}

function Badge({ t, label }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 999,
        background: t.border,
        color: t.textDim,
      }}
    >
      {label}
    </span>
  );
}

function formatDuration(totalSeconds) {
  const s = totalSeconds || 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
