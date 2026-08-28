// Reusable hook for FEATURE 1 — Host Controls.
//
// Wraps every host-control socket event (lock/unlock, mute/unmute chat,
// kick, transfer host, start/end session, live analytics) behind one
// small API, so <HostControlPanel /> and <ParticipantPanel /> stay pure
// UI and Editor.jsx only needs a couple of lines to wire this in.
//
// Non-host callers get no-op emit functions back (checked again
// server-side regardless — this is just to keep the UI honest).
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

export function useHostControls({ socket, sessionToken, isHost, onSessionEnded }) {
  const [locked, setLocked] = useState(false);
  const [chatMuted, setChatMuted] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleLocked = (isLocked) => {
      setLocked(!!isLocked);
      toast(isLocked ? "🔒 Session locked — no new participants can join" : "🔓 Session unlocked");
    };
    const handleMuted = (isMuted) => {
      setChatMuted(!!isMuted);
      toast(isMuted ? "🔕 Chat muted by host" : "🔔 Chat unmuted");
    };
    const handleChatMutedNotice = (msg) => toast.error(msg || "Chat is muted.");
    const handleKicked = (msg) => {
      toast.error(msg || "You were removed from this session.");
      onSessionEnded?.("kicked");
    };
    const handleForceClosed = () => {
      toast.error("The host ended this session.");
      onSessionEnded?.("ended");
    };
    const handleStats = (data) => setStats(data);

    socket.on("session_locked", handleLocked);
    socket.on("chat_muted", handleMuted);
    socket.on("chat_muted_notice", handleChatMutedNotice);
    socket.on("kicked_from_session", handleKicked);
    socket.on("session_force_closed", handleForceClosed);
    socket.on("session_stats", handleStats);

    return () => {
      socket.off("session_locked", handleLocked);
      socket.off("chat_muted", handleMuted);
      socket.off("chat_muted_notice", handleChatMutedNotice);
      socket.off("kicked_from_session", handleKicked);
      socket.off("session_force_closed", handleForceClosed);
      socket.off("session_stats", handleStats);
    };
  }, [socket, onSessionEnded]);

  const guard = useCallback(
    (fn) => (...args) => {
      if (!isHost) return; // defense-in-depth; server re-checks regardless
      fn(...args);
    },
    [isHost]
  );

  const startSession = guard(() => socket.emit("start_session", { sessionToken }));
  const endSession = guard(() => socket.emit("end_session", { sessionToken }));
  const lockSession = guard(() => socket.emit("lock_session", { sessionToken }));
  const unlockSession = guard(() => socket.emit("unlock_session", { sessionToken }));
  const muteChat = guard(() => socket.emit("mute_chat", { sessionToken }));
  const unmuteChat = guard(() => socket.emit("unmute_chat", { sessionToken }));
  const kickParticipant = guard((targetSocketId) =>
    socket.emit("kick_participant", { sessionToken, targetSocketId })
  );
  const transferHost = guard((targetSocketId) =>
    socket.emit("transfer_host", { sessionToken, targetSocketId })
  );
  const refreshStats = guard(() => socket.emit("request_session_stats", { sessionToken }));

  const copyInviteLink = useCallback(() => {
    const url = `${window.location.origin}/session/${sessionToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
  }, [sessionToken]);

  const copySessionToken = useCallback(() => {
    navigator.clipboard.writeText(sessionToken);
    toast.success("Session token copied");
  }, [sessionToken]);

  return {
    locked,
    chatMuted,
    stats,
    startSession,
    endSession,
    lockSession,
    unlockSession,
    muteChat,
    unmuteChat,
    kickParticipant,
    transferHost,
    refreshStats,
    copyInviteLink,
    copySessionToken,
  };
}
